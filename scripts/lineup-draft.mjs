// Drafts the line-up for the owner to rule on. Reads plans/etsy-listings.json and
// plans/catalog.json, writes plans/listing-map.json and plans/clusters.json. Never
// touches plans/decisions.json: that file is the owner's (gate G2).
//
//   node scripts/lineup-draft.mjs
//
// Pure local computation. No network.
import { readFile, writeFile } from 'node:fs/promises';

const read = async (f) => JSON.parse(await readFile(new URL(`../plans/${f}`, import.meta.url), 'utf8'));
const write = (f, data) => writeFile(new URL(`../plans/${f}`, import.meta.url), JSON.stringify(data, null, 2) + '\n');

const etsy = await read('etsy-listings.json');
const catalog = await read('catalog.json');
const listings = etsy.rows;
const products = catalog.rows;
const now = new Date().toISOString();

// Words that every listing shares carry no signal about which design it is.
const STOP = new Set(
  'a an and the for of to with in on my your our is be you me i it gift gifts frame frames picture photo personalized personalised custom keepsake idea ideas'.split(' '),
);
const words = (s) => new Set((s.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => !STOP.has(w)));
function jaccard(a, b) {
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return 0;
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / (x.size + y.size - both);
}
const round = (n) => Math.round(n * 100) / 100;
const heroImageId = (l) => l.images[0]?.url.match(/il_fullxfull\.(\d+)_/)?.[1] ?? null;

// ---- listing-map: Shopify handle -> Etsy listing -------------------------------------
// The Shopify store was made by an Etsy importer that ended every handle with the last
// five digits of the source listing ID (you-were-always-enough-frame-72754 came from
// listing 1874972754). That suffix is the primary key. Title overlap confirms it. A
// handle whose suffix matches no active listing came from a listing that is no longer
// active, so it falls back to the closest title and always needs a human.
const bySuffix = new Map();
for (const l of listings) {
  const k = String(l.listingId).slice(-5);
  bySuffix.set(k, [...(bySuffix.get(k) ?? []), l]);
}

const SUFFIX_TITLE_MIN = 0.2;
const FALLBACK_MIN = 0.45;

const mapRows = products.map((p) => {
  const base = { shopifyHandle: p.handle, shopifyStatus: p.status, shopifyTitle: p.title };
  const suffix = p.handle.match(/-(\d{5})$/)?.[1];
  const candidates = suffix ? (bySuffix.get(suffix) ?? []) : [];
  if (candidates.length) {
    const best = candidates
      .map((l) => ({ l, sim: jaccard(p.title, l.title) }))
      .sort((a, b) => b.sim - a.sim)[0];
    const confirmed = best.sim >= SUFFIX_TITLE_MIN;
    return {
      etsyListingId: best.l.listingId,
      ...base,
      method: 'handle-suffix',
      titleSimilarity: round(best.sim),
      confidence: confirmed && candidates.length === 1 ? 0.95 : 0.8,
      needsHuman: !confirmed || candidates.length > 1,
    };
  }
  const best = listings
    .map((l) => ({ l, sim: jaccard(p.title, l.title) }))
    .sort((a, b) => b.sim - a.sim || b.l.numFavorers - a.l.numFavorers)[0];
  if (best && best.sim >= FALLBACK_MIN) {
    return {
      etsyListingId: best.l.listingId,
      ...base,
      method: 'title-only',
      titleSimilarity: round(best.sim),
      confidence: round(best.sim * 0.7),
      needsHuman: true,
    };
  }
  return { etsyListingId: null, ...base, method: 'none', titleSimilarity: best ? round(best.sim) : 0, confidence: 0, needsHuman: true };
});

const handlesByListing = new Map();
for (const m of mapRows) {
  if (m.etsyListingId == null) continue;
  handlesByListing.set(m.etsyListingId, [...(handlesByListing.get(m.etsyListingId) ?? []), m.shopifyHandle]);
}

// ---- clusters: near-duplicate Etsy listings ------------------------------------------
// Two listings are the same design sold under different keywords when any of these hold:
//   same-hero-image   the first photo is the same Etsy image
//   identical-title   titles match after lowercasing
//   near-title        title word overlap >= 0.7 within the same shop section
//   same-copy         identical description AND title overlap >= 0.5
// A shared description alone is not enough: 255 listings reuse 56 template descriptions.
const NEAR_TITLE = 0.7;
const SAME_COPY_TITLE = 0.5;

const parent = new Map(listings.map((l) => [l.listingId, l.listingId]));
const find = (x) => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
const reasons = new Map();
function union(a, b, why) {
  const ra = find(a.listingId);
  const rb = find(b.listingId);
  if (ra !== rb) parent.set(ra, rb);
  for (const id of [a.listingId, b.listingId]) reasons.set(id, new Set([...(reasons.get(id) ?? []), why]));
}

for (let i = 0; i < listings.length; i++) {
  for (let j = i + 1; j < listings.length; j++) {
    const a = listings[i];
    const b = listings[j];
    const hero = heroImageId(a);
    if (hero && hero === heroImageId(b)) union(a, b, 'same-hero-image');
    else if (a.title.trim().toLowerCase() === b.title.trim().toLowerCase()) union(a, b, 'identical-title');
    else {
      const sim = jaccard(a.title, b.title);
      if (a.sectionId === b.sectionId && sim >= NEAR_TITLE) union(a, b, 'near-title');
      else if (a.descriptionSha256 === b.descriptionSha256 && sim >= SAME_COPY_TITLE) union(a, b, 'same-copy');
    }
  }
}

const groups = new Map();
for (const l of listings) groups.set(find(l.listingId), [...(groups.get(find(l.listingId)) ?? []), l]);

// Favourites first, views to break ties. Both are lifetime proxies: real per-listing
// sales need OAuth (transactions_r), which this export does not have.
const CUT_FAVORERS = 5;
const byDemand = (a, b) => b.numFavorers - a.numFavorers || b.views - a.views;

// Line-up tiers over the whole shop, by favourites percentile of each cluster's best
// listing. A suggestion only; the owner rules in decisions.json.
const survivors = [...groups.values()].map((m) => m.sort(byDemand)[0]).sort(byDemand);
const tierOf = new Map(
  survivors.map((s, i) => {
    const pct = i / survivors.length;
    return [s.listingId, pct < 0.2 ? 'core' : pct < 0.6 ? 'keep' : s.numFavorers < CUT_FAVORERS ? 'cut-candidate' : 'review'];
  }),
);

let n = 0;
const clusterRows = survivors.map((survivor) => {
  const members = groups.get(find(survivor.listingId));
  const multi = members.length > 1;
  const matchTypes = multi ? [...new Set(members.flatMap((m) => [...(reasons.get(m.listingId) ?? [])]))].sort() : ['single'];
  const tier = tierOf.get(survivor.listingId);
  return {
    clusterId: `C${String(++n).padStart(3, '0')}`,
    rank: n,
    tier,
    matchType: matchTypes.join('+'),
    section: survivor.sectionTitle,
    members: members.map((m) => ({
      etsyListingId: m.listingId,
      title: m.title,
      numFavorers: m.numFavorers,
      views: m.views,
      price: m.price,
      isPersonalizable: m.isPersonalizable,
      shopifyHandles: handlesByListing.get(m.listingId) ?? [],
    })),
    suggestedSurvivor: survivor.listingId,
    rationale: multi
      ? `${members.length} listings of one design (${matchTypes.join(', ')}); keep the most-favourited, 301 the rest's Shopify URLs to it.`
      : `Single listing; tier "${tier}" by favourites rank ${n} of ${survivors.length}.`,
  };
});

const tierCounts = Object.fromEntries(['core', 'keep', 'review', 'cut-candidate'].map((t) => [t, clusterRows.filter((r) => r.tier === t).length]));

const listingMap = await read('listing-map.json');
listingMap._schema = {
  description:
    'Shopify product handle -> source Etsy listing. Every Shopify product gets a row, so every old URL has a known destination or is flagged. Below confidence 0.9 or with needsHuman=true, a human checks it. Produced by scripts/lineup-draft.mjs.',
  method:
    'handle-suffix: the Shopify handle ends with the last 5 digits of the Etsy listing id (set by the Etsy importer), confirmed by title word overlap. title-only: no active listing has that suffix (source listing no longer active), so the closest active title is suggested. none: nothing close.',
  row: {
    etsyListingId: 'integer | null',
    shopifyHandle: 'string',
    shopifyStatus: 'ACTIVE | DRAFT | ARCHIVED',
    shopifyTitle: 'string',
    method: 'handle-suffix | title-only | none',
    titleSimilarity: 'number 0-1, word overlap after stop words',
    confidence: 'number 0-1',
    needsHuman: 'boolean',
  },
};
listingMap.generatedAt = now;
listingMap.rows = mapRows;
await write('listing-map.json', listingMap);

const clusters = await read('clusters.json');
clusters._schema = {
  description:
    'Suggested line-up for the new site, built from the Etsy shop. One row per design: near-duplicate Etsy listings are grouped, every listing appears exactly once. A RECOMMENDATION for the owner to rule on in decisions.json. Nothing here is acted upon automatically. Produced by scripts/lineup-draft.mjs.',
  ranking:
    'Rows are ranked by the best member\'s num_favorers, then views. These are lifetime PROXIES for demand. Real per-listing sales need Etsy OAuth (transactions_r), which this export does not use.',
  tiers:
    'core = top 20% of designs; keep = next 40%; review = bottom 40% with 5+ favourites; cut-candidate = bottom 40% under 5 favourites.',
  row: {
    clusterId: 'string',
    rank: 'integer, 1 = most favourited',
    tier: 'core | keep | review | cut-candidate',
    matchType: 'single | same-hero-image | identical-title | near-title | same-copy, joined with +',
    section: 'Etsy shop section of the suggested survivor',
    members: [{ etsyListingId: 'integer', title: 'string', numFavorers: 'integer', views: 'integer', price: 'number', isPersonalizable: 'boolean', shopifyHandles: ['handle that 301s here'] }],
    suggestedSurvivor: 'etsyListingId',
    rationale: 'one line',
  },
};
clusters.generatedAt = now;
clusters.summary = {
  etsyListings: listings.length,
  designs: clusterRows.length,
  duplicateGroups: clusterRows.filter((r) => r.members.length > 1).length,
  listingsInDuplicateGroups: clusterRows.filter((r) => r.members.length > 1).reduce((s, r) => s + r.members.length, 0),
  tiers: tierCounts,
};
clusters.rows = clusterRows;
await write('clusters.json', clusters);

const matched = mapRows.filter((r) => r.method === 'handle-suffix').length;
console.log(`listing-map: ${mapRows.length} Shopify handles, ${matched} matched by suffix, ${mapRows.filter((r) => r.needsHuman).length} need a human`);
console.log(`clusters: ${listings.length} listings -> ${clusterRows.length} designs, tiers ${JSON.stringify(tierCounts)}`);

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

// ---- clusters: search-intent pages ---------------------------------------------------
// A frame is one of two shapes plus one background, with fully custom text. The ~540
// frame listings on Etsy are the same product dressed for different searches
// ("godmother proposal frame", "grandma gift"). So the line-up is not which designs to
// keep. It is which search intents get a page, each one a preset (shape, background,
// starter text) on the one configurable frame. Listings are grouped by intent: the
// recipient and occasion named earliest in the title, since Etsy titles lead with the
// main keyword.
const PRODUCT_TYPES = [
  ['car-accessory', (l) => l.sectionTitle === 'Car coasters/ornaments'],
  ['brag-board', (l) => l.sectionTitle === 'Photo Blocks Clip Frames'],
  ['add-on', (l) => l.sectionTitle === 'Add ons' || /figurine/i.test(l.title)],
  ['large-frame', (l) => l.price >= 60],
  ['frame', () => true],
];
const productType = (l) => PRODUCT_TYPES.find(([, test]) => test(l))[0];

// Each entry: [intent key, regex]. Order breaks ties at the same title position, so
// the more specific term comes first.
const RECIPIENTS = [
  ['godparents', /god ?parents?/],
  ['godmother', /god ?mother|godmom|fairy godmother/],
  ['godfather', /god ?father/],
  ['great-grandparent', /great[- ]?grand(ma|mother|pa|father|parents?|kids?)|great[- ]?nana|great[- ]?gigi/],
  ['grandparents-to-be', /grandparents? to be|new grandparents?|grandparent (pregnancy|announcement|reveal)|first grandchild|promoted to grand/],
  ['grandparents', /grandparents/],
  ['grandpa', /grandpa|grandfather|grandad|granddad|papa|poppy|pop\b|pawpaw|abuelo|opa\b|gramps/],
  ['grandma', /grandma|grandmother|nana|mimi|gigi|granny|grammy|glamma|abuela|oma\b|lolli|nonna|meme\b|gram\b/],
  ['parents-of-couple', /parents? (of (the )?)?(bride|groom)|parents? thank you|thank you (gift )?(for )?parents|mother of the (bride|groom)|father of the (bride|groom)|wedding (gift )?for parents|parents wedding|thank you (mom and dad|parents)/],
  ['aunt-uncle', /aunt|auntie|tia\b|uncle|tio\b/],
  ['mom', /\bmom\b|mother|mama|mommy/],
  ['dad', /\bdad\b|father|daddy/],
  ['teacher-nanny-coach', /teacher|nanny|coach|daycare|babysitter/],
  ['sibling-friend', /sister|brother|sibling|best ?friend|bestie|soul sisters?|friendship/],
  ['pet', /\bpets?\b|\bdogs?\b|\bcats?\b|puppy|kitten|fur ?baby|rainbow bridge|paw/],
  ['couple', /wedding|engagement|engaged|anniversary|couple|bride|groom|valentine|boyfriend|girlfriend|husband|wife/],
  ['baby', /baby|newborn|nursery|birth announcement|ultrasound|sonogram|pregnancy|first birthday|1st birthday|cake smash|christening|baptism|miscarriage/],
  ['graduate', /graduat|sorority|senior/],
  ['self', /affirmation|self[- ]love|inner child|encouragement|faith|jesus|bible|scripture/],
];
const OCCASIONS = [
  ['proposal', /will you be my|proposal|be my god/],
  ['memorial', /memorial|loss|sympathy|rainbow bridge|in memory|remembrance|heaven|miscarriage|crossed/],
  ['announcement', /announcement|reveal|to be\b|promoted|expecting|ultrasound|sonogram|pregnan/],
  ['baptism', /baptism|christening|first communion|dedication/],
  ['wedding', /wedding|engagement|engaged|bride|groom|anniversary/],
  ['christmas', /christmas|holiday|xmas|ornament/],
  ['mothers-day', /mother'?s day/],
  ['fathers-day', /father'?s day/],
  ['birthday', /birthday|cake smash/],
  ['graduation', /graduat/],
  ['thank-you', /thank you|appreciation/],
  ['birth', /birth announcement|newborn|new baby|nursery/],
];
function earliest(vocab, title) {
  let best = null;
  for (const [key, re] of vocab) {
    const at = title.search(re);
    if (at >= 0 && (best === null || at < best.at)) best = { key, at };
  }
  return best?.key ?? null;
}
// "Wedding", "baby" and "self" words often describe the occasion or photo rather than
// who receives the frame ("Wedding Frame: Parents Thank You Gift", "Baby Gift for
// Grandma"), so they count only when no other recipient is named.
const CONTEXT_RECIPIENTS = new Set(['couple', 'baby', 'self']);
function intentOf(title) {
  const t = title.toLowerCase();
  const recipient =
    earliest(RECIPIENTS.filter(([k]) => !CONTEXT_RECIPIENTS.has(k)), t) ??
    earliest(RECIPIENTS.filter(([k]) => CONTEXT_RECIPIENTS.has(k)), t) ??
    'general';
  const occasion = earliest(OCCASIONS, t) ?? 'everyday';
  // "Pregnancy announcement for grandparents" and "grandparents to be" are one search.
  if (recipient === 'grandparents' && occasion === 'announcement') return { recipient: 'grandparents-to-be', occasion };
  return { recipient, occasion };
}

// Favourites first, views to break ties. Both are lifetime proxies: real per-listing
// sales need OAuth (transactions_r), which this export does not have.
const byDemand = (a, b) => b.numFavorers - a.numFavorers || b.views - a.views;
const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0);

const groups = new Map();
for (const l of listings) {
  const type = productType(l);
  const { recipient, occasion } = intentOf(l.title);
  const key = type === 'frame' ? `frame/${recipient}/${occasion}` : `${type}/${recipient}`;
  groups.set(key, [...(groups.get(key) ?? []), l]);
}

// A page earns a launch slot by the demand behind it, not by how many listings Etsy
// needed to cover its keywords. Tiers are by share of all favourites, so a small set of
// pages carries most of the demand.
const pages = [...groups.entries()]
  .map(([key, members]) => ({ key, members: members.sort(byDemand), favorers: sum(members, (m) => m.numFavorers) }))
  .sort((a, b) => b.favorers - a.favorers || b.members.length - a.members.length);
const totalFavorers = sum(pages, (p) => p.favorers);
let running = 0;
const LAUNCH_SHARE = 0.8;
const LATER_SHARE = 0.95;

const clusterRows = pages.map((p, i) => {
  const before = running / totalFavorers;
  running += p.favorers;
  const tier = before < LAUNCH_SHARE ? 'launch' : before < LATER_SHARE ? 'later' : 'fold-in';
  const [type, recipient, occasion = null] = p.key.split('/');
  const lead = p.members[0];
  return {
    clusterId: `P${String(i + 1).padStart(3, '0')}`,
    rank: i + 1,
    tier,
    pageKey: p.key,
    productType: type,
    recipient,
    occasion,
    favorers: p.favorers,
    views: sum(p.members, (m) => m.views),
    listingCount: p.members.length,
    suggestedPreset: lead.listingId,
    members: p.members.map((m) => ({
      etsyListingId: m.listingId,
      title: m.title,
      numFavorers: m.numFavorers,
      views: m.views,
      price: m.price,
      shopifyHandles: handlesByListing.get(m.listingId) ?? [],
    })),
    rationale:
      tier === 'fold-in'
        ? `Little demand (${p.favorers} favourites); fold into a broader ${recipient} page rather than build its own.`
        : `${p.members.length} Etsy listings, ${p.favorers} favourites. Preset from the most-favourited listing, ${lead.listingId}.`,
  };
});

const tierCounts = Object.fromEntries(['launch', 'later', 'fold-in'].map((t) => [t, clusterRows.filter((r) => r.tier === t).length]));
const pageOf = new Map(clusterRows.flatMap((r) => r.members.map((m) => [m.etsyListingId, r.pageKey])));
for (const m of mapRows) m.pageKey = m.etsyListingId == null ? null : pageOf.get(m.etsyListingId);

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
    pageKey: 'string | null — the clusters.json page this old URL should 301 to',
  },
};
listingMap.generatedAt = now;
listingMap.rows = mapRows;
await write('listing-map.json', listingMap);

const clusters = await read('clusters.json');
clusters._schema = {
  description:
    'Suggested line-up for the new site. A frame is one of two shapes plus a background with fully custom text (see product-options.json), so Etsy listings are grouped into search-intent PAGES, not designs. Each page is a preset on the one configurable product. Every Etsy listing appears exactly once. A RECOMMENDATION for the owner to rule on in decisions.json. Nothing here is acted upon automatically. Produced by scripts/lineup-draft.mjs.',
  ranking:
    'Pages are ranked by the summed num_favorers of their listings. Lifetime PROXIES for demand: real per-listing sales need Etsy OAuth (transactions_r), which this export does not use.',
  tiers:
    'launch = pages that together hold the first 80% of all favourites; later = the next 15%; fold-in = the last 5%, better merged into a broader page.',
  intent:
    'recipient and occasion are the earliest matching terms in the Etsy title (keyword rules in scripts/lineup-draft.mjs). productType is frame unless the section or price says brag-board, large-frame, car-accessory or add-on.',
  row: {
    clusterId: 'string, P001 = most favourited page',
    rank: 'integer',
    tier: 'launch | later | fold-in',
    pageKey: 'frame/{recipient}/{occasion} | {productType}/{recipient}',
    productType: 'frame | large-frame | brag-board | car-accessory | add-on',
    recipient: 'string',
    occasion: 'string | null',
    favorers: 'integer, summed over members',
    views: 'integer, summed over members',
    listingCount: 'integer',
    suggestedPreset: 'etsyListingId whose photo and wording become the page default',
    members: [{ etsyListingId: 'integer', title: 'string', numFavorers: 'integer', views: 'integer', price: 'number', shopifyHandles: ['handle that 301s to this page'] }],
    rationale: 'one line',
  },
};
clusters.generatedAt = now;
clusters.summary = {
  etsyListings: listings.length,
  pages: clusterRows.length,
  byProductType: Object.fromEntries(PRODUCT_TYPES.map(([t]) => [t, sum(clusterRows.filter((r) => r.productType === t), (r) => r.listingCount)])),
  tiers: tierCounts,
};
clusters.rows = clusterRows;
await write('clusters.json', clusters);

const matched = mapRows.filter((r) => r.method === 'handle-suffix').length;
console.log(`listing-map: ${mapRows.length} Shopify handles, ${matched} matched by suffix, ${mapRows.filter((r) => r.needsHuman).length} need a human`);
console.log(`clusters: ${listings.length} listings -> ${clusterRows.length} pages, tiers ${JSON.stringify(tierCounts)}`);

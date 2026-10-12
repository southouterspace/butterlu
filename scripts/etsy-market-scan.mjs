// Read-only scan of the Etsy market around ButterLu's search terms.
//
//   node scripts/etsy-market-scan.mjs [outDir] [--refresh]
//
// For each query in QUERIES it reads the first 100 active listings by API relevance
// (findAllListingsActive, sort_on=score), then reads each shop that appears (getShop).
// It writes:
//   <outDir>/queries/<slug>.json  raw listing fields per query (other members' content)
//   <outDir>/shops.json           raw shop stats
//   <outDir>/summary.json         aggregates only: counts, prices, shares, tag frequencies
//
// Raw files hold other Etsy members' content, which the API Terms (§1) say not to cache
// beyond what the purpose needs. So outDir defaults to the OS temp dir, never the repo,
// and nothing under it should be committed. Delete it when the research is done.
// Reruns reuse cached raw files unless --refresh is given.
//
// Needs ETSY_KEYSTRING and ETSY_SHARED_SECRET (x-api-key header only, never printed).
// Endpoints and fields were checked against the live spec at
// https://www.etsy.com/openapi/generated/oas/3.0.0.json on 2026-10-12. Known limits with
// x-api-key alone: offset + limit cannot pass 100 ("Offset exceeds the maximum allowed
// for anonymous requests"), and shipping profiles need OAuth (shops_r), so free shipping
// can only be inferred from listing text. No Etsy writes, no etsy.com page fetches (§9).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const API = 'https://openapi.etsy.com/v3/application';
const SELF = 'ButterLu';
const SELF_LISTINGS = new URL('../plans/etsy-listings.json', import.meta.url);

const QUERIES = [
  // From plans/clusters.json, highest-favourited pages first.
  'grandparent pregnancy announcement frame',
  'wedding gift for parents frame',
  'grandma picture frame personalized',
  'godmother proposal frame',
  'godfather baptism frame',
  'godmother baptism frame',
  'grandpa christmas frame',
  'grandpa birthday frame',
  'couple wedding frame',
  'aunt picture frame',
  'uncle picture frame',
  'aunt brag board',
  'brag board',
  'grandma christmas frame',
  'baby announcement frame',
  'new baby birth frame',
  'great grandparent announcement frame',
  'godparents gift frame',
  'mom picture frame personalized',
  'dad fathers day frame',
  'grandpa fathers day frame',
  'pet memorial frame',
  'baby memorial frame',
  'grandma large picture frame',
  'parents of the bride frame',
  // Generic.
  'personalized picture frame',
  'custom photo frame',
  '4x6 frame personalized',
  'personalized frame gift',
  'custom text picture frame',
];

const args = process.argv.slice(2);
const REFRESH = args.includes('--refresh');
const OUT = args.find((a) => !a.startsWith('--')) ?? join(tmpdir(), 'etsy-market-raw');

const { ETSY_KEYSTRING, ETSY_SHARED_SECRET } = process.env;
if (!ETSY_KEYSTRING || !ETSY_SHARED_SECRET) {
  console.error('ETSY_KEYSTRING and ETSY_SHARED_SECRET must be set.');
  process.exit(1);
}
const headers = { 'x-api-key': `${ETSY_KEYSTRING}:${ETSY_SHARED_SECRET}` };

async function get(path) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API + path, { headers });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw new Error(`GET ${path} -> ${res.status} ${await res.text()}`);
  }
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) =>
  s
    ?.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, name) => ENTITIES[name] ?? m) ?? null;
const money = (m) => (m ? m.amount / m.divisor : null);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Signals read from text. The description is scanned here and then dropped, never stored.
const FREE_SHIP = /free\s+(us\s+|usa\s+|standard\s+)?shipping|ships?\s+free/i;
const DIGITAL = /\b(digital|printable|instant download|download|editable|template|canva|pdf|jpg)\b/i;

function trimListing(l, position) {
  const title = decode(l.title);
  const tags = (l.tags ?? []).map((t) => decode(t).toLowerCase());
  return {
    position,
    listing_id: l.listing_id,
    shop_id: l.shop_id,
    title,
    tags,
    materials: (l.materials ?? []).map((m) => decode(m).toLowerCase()),
    // With currency=USD the API adds converted_price; price stays in the shop's currency.
    price: money(l.converted_price ?? l.price),
    currency: (l.converted_price ?? l.price)?.currency_code ?? null,
    nativeCurrency: l.price?.currency_code ?? null,
    listing_type: l.listing_type,
    is_personalizable: l.is_personalizable,
    is_customizable: l.is_customizable,
    has_variations: l.has_variations,
    num_favorers: l.num_favorers,
    views: l.views ?? null,
    taxonomy_id: l.taxonomy_id,
    who_made: l.who_made,
    processing_min: l.processing_min,
    processing_max: l.processing_max,
    original_creation_timestamp: l.original_creation_timestamp,
    free_shipping_text: FREE_SHIP.test(`${title} ${tags.join(' ')} ${l.description ?? ''}`),
    digital_text: DIGITAL.test(`${title} ${tags.join(' ')}`),
  };
}

async function scanQuery(q) {
  const file = join(OUT, 'queries', `${slug(q)}.json`);
  if (!REFRESH && existsSync(file)) return JSON.parse(await readFile(file, 'utf8'));
  const params = new URLSearchParams({ keywords: q, sort_on: 'score', limit: '100', currency: 'USD', buyer_country: 'US' });
  const page = await get(`/listings/active?${params}`);
  const data = {
    query: q,
    fetchedAt: new Date().toISOString(),
    count: page.count,
    results: page.results.map((l, i) => trimListing(l, i + 1)),
  };
  await writeFile(file, JSON.stringify(data, null, 1));
  return data;
}

async function scanShops(ids) {
  const file = join(OUT, 'shops.json');
  const cached = !REFRESH && existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : {};
  const missing = ids.filter((id) => !cached[id] || cached[id].error);
  await pool(missing, 4, async (id) => {
    try {
      const s = await get(`/shops/${id}`);
      cached[id] = {
        shop_id: s.shop_id,
        shop_name: s.shop_name,
        create_date: s.create_date,
        listing_active_count: s.listing_active_count,
        digital_listing_count: s.digital_listing_count,
        transaction_sold_count: s.transaction_sold_count,
        review_count: s.review_count,
        review_average: s.review_average,
        num_favorers: s.num_favorers,
        country: s.shop_location_country_iso,
        is_shop_us_based: s.is_shop_us_based,
        is_vacation: s.is_vacation,
      };
    } catch (e) {
      cached[id] = { shop_id: id, error: String(e.message).slice(0, 200) };
    }
  });
  await writeFile(file, JSON.stringify(cached, null, 1));
  return cached;
}

// ---- aggregates ----
const quantile = (xs, q) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  return +(s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (pos - lo)).toFixed(2);
};
const median = (xs) => quantile(xs, 0.5);
const pct = (n, d) => (d ? +((100 * n) / d).toFixed(1) : null);

// Product format, from title + tags + materials only. First match wins, order matters.
const FORMATS = [
  ['digital/printable', (l) => l.listing_type === 'download' || /\b(digital|printable|instant download|editable|template)\b/i.test(l.title)],
  ['brag board', (l) => /brag\s*board/i.test(l.title)],
  ['acrylic', (l) => /acrylic|plexi/i.test(l.text)],
  ['ceramic/porcelain', (l) => /ceramic|porcelain|tile/i.test(l.text)],
  ['metal', (l) => /\bmetal\b|aluminum|aluminium|pewter|silver plated/i.test(l.text)],
  ['glass', (l) => /\bglass\b(?! frame)/i.test(l.materials.join(' ')) && !/wood/i.test(l.materials.join(' '))],
  ['engraved wood', (l) => /engrav|laser|burned|etched/i.test(l.text) && /wood|oak|walnut|maple|birch|pine|bamboo|rustic/i.test(l.text)],
  ['engraved (other)', (l) => /engrav|laser|etched/i.test(l.text)],
  ['printed/painted wood frame', (l) => /wood|oak|walnut|maple|birch|pine/i.test(l.text)],
  ['other/unspecified', () => true],
];
// Hardware like "metal photo clip" or "sawtooth hanger" says nothing about the format.
const HARDWARE = /metal (photo )?clips?|metal hanger|sawtooth|hang(ing)? hardware|easel back/gi;
const formatOf = (l) => {
  const clean = { ...l, text: l.text.replace(HARDWARE, ''), materials: l.materials.map((m) => m.replace(HARDWARE, '')) };
  return FORMATS.find(([, test]) => test(clean))[0];
};

const STOP = new Set('a an and for of the to with in on gift gifts frame frames picture photo personalized personalised custom'.split(' '));
function phrases(title, n) {
  const words = title.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i + n <= words.length; i++) {
    const w = words.slice(i, i + n);
    if (w.every((x) => STOP.has(x))) continue;
    out.add(w.join(' '));
  }
  return out;
}

function summarise(scans, shops, self) {
  const selfShopId = self.shop.shopId;
  const selfTags = new Set(self.rows.flatMap((r) => r.tags.map((t) => t.toLowerCase())));
  const selfTitleText = self.rows.map((r) => r.title.toLowerCase()).join(' | ');
  const selfFramePrice = median(self.rows.filter((r) => r.price >= 30 && r.price < 50).map((r) => r.price));

  const perQuery = scans.map((s) => {
    const rs = s.results.filter((r) => r.currency === 'USD');
    const prices = rs.map((r) => r.price);
    const byShop = new Map();
    for (const r of s.results) byShop.set(r.shop_id, (byShop.get(r.shop_id) ?? 0) + 1);
    const ranked = [...byShop.entries()].sort((a, b) => b[1] - a[1]);
    const selfHits = s.results.filter((r) => r.shop_id === selfShopId);
    const comp = rs.filter((r) => r.shop_id !== selfShopId);
    const shopOrder = [...new Set(s.results.map((r) => r.shop_id))];
    const salesOf = (r) => shops[r.shop_id]?.transaction_sold_count ?? 0;
    return {
      query: s.query,
      totalResults: s.count,
      returned: s.results.length,
      butterluPositions: selfHits.map((r) => r.position),
      butterluFirst: selfHits[0]?.position ?? null,
      butterluCount: selfHits.length,
      butterluShopRank: shopOrder.includes(selfShopId) ? shopOrder.indexOf(selfShopId) + 1 : null,
      maxPerShop: ranked[0]?.[1] ?? 0,
      bigShopShare: { over10k: pct(s.results.filter((r) => salesOf(r) >= 10000).length, s.results.length), over50k: pct(s.results.filter((r) => salesOf(r) >= 50000).length, s.results.length) },
      top10FirstShops: shopOrder.slice(0, 10).map((id) => shops[id]?.shop_name ?? String(id)),
      butterluPrice: selfHits.length ? median(selfHits.map((r) => r.price)) : null,
      price: { p25: quantile(prices, 0.25), median: median(prices), p75: quantile(prices, 0.75), n: prices.length },
      competitorMedian: median(comp.map((r) => r.price)),
      distinctShops: byShop.size,
      // The API returns at most 3 listings per shop per query, so this share is capped
      // near 15% and says little. bigShopShare is the more useful concentration figure.
      top5ShopShare: pct(ranked.slice(0, 5).reduce((a, [, n]) => a + n, 0), s.results.length),
      top5Shops: ranked.slice(0, 5).map(([id, n]) => ({ shop: shops[id]?.shop_name ?? String(id), listings: n })),
      formats: Object.fromEntries(
        Object.entries(
          s.results.reduce((acc, r) => {
            const f = formatOf({ ...r, text: `${r.title} ${r.tags.join(' ')} ${r.materials.join(' ')}` });
            acc[f] = (acc[f] ?? 0) + 1;
            return acc;
          }, {}),
        ).sort((a, b) => b[1] - a[1]),
      ),
    };
  });

  // Shop roll-up across queries (a listing seen in several queries counts once per query).
  const shopAgg = new Map();
  for (const s of scans) {
    for (const r of s.results) {
      const a = shopAgg.get(r.shop_id) ?? { appearances: 0, queries: new Set(), prices: [], bestPos: 999, listingIds: new Set(), formats: {} };
      a.appearances++;
      a.queries.add(s.query);
      a.listingIds.add(r.listing_id);
      if (r.currency === 'USD') a.prices.push(r.price);
      a.bestPos = Math.min(a.bestPos, r.position);
      const f = formatOf({ ...r, text: `${r.title} ${r.tags.join(' ')} ${r.materials.join(' ')}` });
      a.formats[f] = (a.formats[f] ?? 0) + 1;
      shopAgg.set(r.shop_id, a);
    }
  }
  const now = Date.now() / 1000;
  const shopRows = [...shopAgg.entries()]
    .map(([id, a]) => {
      const sh = shops[id] ?? {};
      return {
        shop_id: Number(id),
        shop_name: sh.shop_name ?? null,
        isSelf: Number(id) === selfShopId,
        appearances: a.appearances,
        queryCount: a.queries.size,
        queries: [...a.queries],
        distinctListings: a.listingIds.size,
        bestPosition: a.bestPos,
        medianPrice: median(a.prices),
        mainFormat: Object.entries(a.formats).sort((x, y) => y[1] - x[1])[0][0],
        sales: sh.transaction_sold_count ?? null,
        reviews: sh.review_count ?? null,
        rating: sh.review_average ?? null,
        ageYears: sh.create_date ? +((now - sh.create_date) / 31557600).toFixed(1) : null,
        activeListings: sh.listing_active_count ?? null,
        digitalListings: sh.digital_listing_count ?? null,
        country: sh.country ?? null,
      };
    })
    .sort((a, b) => b.appearances - a.appearances || (b.sales ?? 0) - (a.sales ?? 0));

  // Tags and title phrases: competitor top-20 per query vs everything ButterLu uses.
  const tagCount = new Map();
  const bigram = new Map();
  const trigram = new Map();
  const titleLens = [];
  const tagCounts = [];
  const flags = { n: 0, personalizable: 0, freeShipText: 0, digital: 0, download: 0, variations: 0, materials: {} };
  const seen = new Set();
  for (const s of scans) {
    for (const r of s.results) {
      if (r.shop_id === selfShopId) continue;
      if (r.position <= 20) {
        for (const t of new Set(r.tags)) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
        for (const p of phrases(r.title, 2)) bigram.set(p, (bigram.get(p) ?? 0) + 1);
        for (const p of phrases(r.title, 3)) trigram.set(p, (trigram.get(p) ?? 0) + 1);
      }
      if (seen.has(r.listing_id)) continue;
      seen.add(r.listing_id);
      flags.n++;
      titleLens.push(r.title.length);
      tagCounts.push(r.tags.length);
      if (r.is_personalizable) flags.personalizable++;
      if (r.free_shipping_text) flags.freeShipText++;
      if (r.digital_text) flags.digital++;
      if (r.listing_type === 'download') flags.download++;
      if (r.has_variations) flags.variations++;
      for (const m of new Set(r.materials)) flags.materials[m] = (flags.materials[m] ?? 0) + 1;
    }
  }
  const top = (m, k, filter = () => true) =>
    [...m.entries()].filter(([t]) => filter(t)).sort((a, b) => b[1] - a[1]).slice(0, k).map(([t, n]) => ({ t, n }));
  const selfHasPhrase = (p) => selfTitleText.includes(p);

  const selfFlags = {
    n: self.rows.length,
    titleLen: { p25: quantile(self.rows.map((r) => r.title.length), 0.25), median: median(self.rows.map((r) => r.title.length)), p75: quantile(self.rows.map((r) => r.title.length), 0.75) },
    tagsMedian: median(self.rows.map((r) => r.tags.length)),
    personalizable: pct(self.rows.filter((r) => r.isPersonalizable).length, self.rows.length),
    materials: top(
      self.rows.reduce((m, r) => {
        for (const x of new Set(r.materials.map((y) => y.toLowerCase()))) m.set(x, (m.get(x) ?? 0) + 1);
        return m;
      }, new Map()),
      15,
    ),
  };

  return {
    generatedAt: new Date().toISOString(),
    note: 'Aggregates only. API relevance order (sort_on=score) is not etsy.com search ranking, which is personalised and ad-influenced.',
    self: { shopId: selfShopId, framePriceMedian: selfFramePrice, ...selfFlags },
    perQuery,
    shops: shopRows.slice(0, 60),
    shopCount: shopRows.length,
    competitorListings: {
      distinct: flags.n,
      titleLen: { p25: quantile(titleLens, 0.25), median: median(titleLens), p75: quantile(titleLens, 0.75), max: Math.max(...titleLens) },
      tagsMedian: median(tagCounts),
      pctPersonalizable: pct(flags.personalizable, flags.n),
      pctFreeShippingText: pct(flags.freeShipText, flags.n),
      pctDigitalText: pct(flags.digital, flags.n),
      pctDownloadType: pct(flags.download, flags.n),
      pctHasVariations: pct(flags.variations, flags.n),
      topMaterials: top(new Map(Object.entries(flags.materials)), 25),
    },
    tagsTop20: top(tagCount, 60).map((x) => ({ ...x, butterluUses: selfTags.has(x.t) })),
    tagsMissingFromButterlu: top(tagCount, 400, (t) => !selfTags.has(t)).slice(0, 50),
    bigramsMissing: top(bigram, 400, (p) => !selfHasPhrase(p)).slice(0, 40),
    trigramsMissing: top(trigram, 400, (p) => !selfHasPhrase(p)).slice(0, 40),
  };
}

await mkdir(join(OUT, 'queries'), { recursive: true });
const self = JSON.parse(await readFile(SELF_LISTINGS, 'utf8'));
const scans = [];
for (const q of QUERIES) {
  const s = await scanQuery(q);
  scans.push(s);
  console.log(`${String(s.count).padStart(7)}  ${q}`);
}
const shopIds = [...new Set(scans.flatMap((s) => s.results.map((r) => r.shop_id)))];
const shops = await scanShops(shopIds);
const errors = shopIds.filter((id) => shops[id]?.error).length;
const summary = summarise(scans, shops, self);
await writeFile(join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
console.log(`${shopIds.length} shops (${errors} errors). Wrote ${OUT}/summary.json`);

// Read-only export of every active ButterLu Etsy listing to plans/etsy-listings.json.
// Rerun at any time: it overwrites the file with a fresh snapshot.
//
//   node scripts/etsy-export-listings.mjs
//
// Needs ETSY_KEYSTRING and ETSY_SHARED_SECRET in the environment. They go in the
// x-api-key header and nowhere else. Endpoints and fields were checked against the
// live spec at https://www.etsy.com/openapi/generated/oas/3.0.0.json on 2026-10-12.
// No Etsy writes, no etsy.com page fetches (API Terms §9), no reviews.
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const SHOP_NAME = 'ButterLu';
const API = 'https://openapi.etsy.com/v3/application';
const OUT = new URL('../plans/etsy-listings.json', import.meta.url);

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
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw new Error(`GET ${path} -> ${res.status} ${await res.text()}`);
  }
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const iso = (unix) => (unix ? new Date(unix * 1000).toISOString() : null);
// Etsy returns titles and personalization text HTML-entity encoded (Mother&#39;s Day).
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) =>
  s
    ?.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, name) => ENTITIES[name] ?? m) ?? null;
const money = (m) => (m ? m.amount / m.divisor : null);

async function findShop() {
  const { results } = await get(`/shops?shop_name=${encodeURIComponent(SHOP_NAME)}&limit=100`);
  const shop = results.find((s) => s.shop_name === SHOP_NAME);
  if (!shop) throw new Error(`No shop named exactly ${SHOP_NAME}`);
  return shop;
}

// With x-api-key alone Etsy rejects any offset past the first 100 results ("Offset
// exceeds the maximum allowed for anonymous requests"). So read each shop section's
// first 100 oldest and first 100 newest listings. That covers any section of up to
// 200, and the per-section and shop-wide counts check that nothing was missed.
async function activeListingIds(shopId, sections) {
  const ids = new Set();
  for (const section of sections) {
    const seen = new Set();
    for (const order of ['asc', 'desc']) {
      const page = await get(
        `/shops/${shopId}/shop-sections/listings?shop_section_ids=${section.shop_section_id}&limit=100&sort_on=created&sort_order=${order}`,
      );
      for (const l of page.results) if (l.state === 'active') seen.add(l.listing_id);
    }
    if (seen.size !== section.active_listing_count) {
      throw new Error(
        `Section "${section.title}" has ${section.active_listing_count} active listings, read ${seen.size}. Over 200 needs OAuth paging.`,
      );
    }
    for (const id of seen) ids.add(id);
  }
  const { count } = await get(`/shops/${shopId}/listings/active?limit=1`);
  return { count, ids: [...ids] };
}

async function listingsWithImages(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100).join(',');
    const { results } = await get(`/listings/batch?listing_ids=${batch}&includes=Images,Personalization`);
    out.push(...results);
  }
  return out;
}

function taxonomyIndex(nodes, parents = [], index = new Map()) {
  for (const n of nodes) {
    const path = [...parents, n.name];
    index.set(n.id, path.join(' > '));
    taxonomyIndex(n.children ?? [], path, index);
  }
  return index;
}

// The pre-2024 fields personalization_is_required, personalization_char_count_max and
// personalization_instructions no longer exist. Their values now live on the listing's
// personalization questions, so they are derived from those.
function personalization(l) {
  const questions = (l.personalization?.personalization_questions ?? []).map((q) => ({
    questionText: decode(q.question_text),
    type: q.question_type,
    required: q.required,
    maxChars: q.max_allowed_characters,
    maxFiles: q.max_allowed_files,
    instructions: decode(q.instructions),
  }));
  const text = questions.filter((q) => q.maxChars != null);
  return {
    isPersonalizable: l.is_personalizable,
    personalizationIsRequired: questions.some((q) => q.required),
    personalizationCharCountMax: text.length ? Math.max(...text.map((q) => q.maxChars)) : null,
    personalizationInstructions: questions.map((q) => q.instructions).filter(Boolean).join('\n---\n') || null,
    personalizationQuestions: questions,
  };
}

const shop = await findShop();
const [sections, taxonomy] = await Promise.all([get(`/shops/${shop.shop_id}/sections`), get('/seller-taxonomy/nodes')]);
const { count, ids } = await activeListingIds(shop.shop_id, sections.results);
const sectionTitle = new Map(sections.results.map((s) => [s.shop_section_id, decode(s.title)]));
const taxonomyPath = taxonomyIndex(taxonomy.results);
const listings = await listingsWithImages(ids);

const rows = listings
  .map((l) => ({
    listingId: l.listing_id,
    title: decode(l.title),
    url: l.url.split('?')[0],
    state: l.state,
    descriptionLength: l.description.length,
    descriptionSha256: sha256(l.description),
    price: money(l.price),
    currency: l.price?.currency_code ?? null,
    quantity: l.quantity,
    tags: l.tags.map(decode),
    materials: l.materials.map(decode),
    taxonomyId: l.taxonomy_id,
    taxonomyPath: taxonomyPath.get(l.taxonomy_id) ?? null,
    sectionId: l.shop_section_id,
    sectionTitle: sectionTitle.get(l.shop_section_id) ?? null,
    ...personalization(l),
    hasVariations: l.has_variations,
    variations: null,
    views: l.views,
    numFavorers: l.num_favorers,
    createdAt: iso(l.created_timestamp),
    originalCreatedAt: iso(l.original_creation_timestamp),
    updatedAt: iso(l.updated_timestamp),
    images: (l.images ?? [])
      .sort((a, b) => a.rank - b.rank)
      .map((img) => ({
        rank: img.rank,
        url: img.url_fullxfull,
        width: img.full_width,
        height: img.full_height,
        alt: decode(img.alt_text) || null,
      })),
  }))
  .sort((a, b) => a.listingId - b.listingId);

if (rows.length !== count) {
  throw new Error(`Etsy reports ${count} active listings but ${rows.length} were exported`);
}

const manifest = {
  _schema: {
    description:
      'Snapshot of every ACTIVE ButterLu Etsy listing via Etsy Open API v3 (x-api-key only, read-only). Produced by scripts/etsy-export-listings.mjs. The new catalog is built from this. Descriptions are NOT stored, only length and sha256. Image URLs only, nothing downloaded.',
    row: {
      listingId: 'integer',
      title: 'string',
      url: 'string — etsy.com listing URL, query string stripped',
      state: 'active',
      descriptionLength: 'integer',
      descriptionSha256: 'string',
      price: 'number — minimum price across variations; exact per-offering prices need the inventory endpoint',
      currency: 'string',
      quantity: 'integer',
      tags: ['string'],
      materials: ['string'],
      taxonomyId: 'integer | null',
      taxonomyPath: 'string | null — seller taxonomy, "A > B > C"',
      sectionId: 'integer | null',
      sectionTitle: 'string | null',
      isPersonalizable: 'boolean',
      personalizationIsRequired: 'boolean — any question required',
      personalizationCharCountMax: 'integer | null — largest max_allowed_characters across text questions',
      personalizationInstructions: 'string | null — question instructions joined',
      personalizationQuestions: [{ questionText: 'string', type: 'string', required: 'boolean', maxChars: 'integer | null', maxFiles: 'integer | null', instructions: 'string | null' }],
      hasVariations: 'boolean',
      variations: 'null — getListingInventory needs OAuth scope listings_r, see variationsStatus',
      views: 'integer — Etsy tabulates daily, lifetime count',
      numFavorers: 'integer',
      createdAt: 'iso8601',
      originalCreatedAt: 'iso8601',
      updatedAt: 'iso8601',
      images: [{ rank: 'integer', url: 'string — url_fullxfull', width: 'integer', height: 'integer', alt: 'string | null' }],
    },
  },
  generatedAt: new Date().toISOString(),
  shop: {
    shopId: shop.shop_id,
    shopName: shop.shop_name,
    listingActiveCount: shop.listing_active_count,
    transactionSoldCount: shop.transaction_sold_count,
    reviewCount: shop.review_count,
    reviewAverage: shop.review_average,
  },
  variationsStatus:
    'skipped: GET /v3/application/listings/{listing_id}/inventory returns 401 "Access token is required for this request (requires scope: listings_r)" with x-api-key alone. Needs the OAuth flow.',
  rows,
};

await writeFile(OUT, JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${rows.length} listings to plans/etsy-listings.json`);

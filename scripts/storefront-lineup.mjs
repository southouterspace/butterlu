// Writes a PROPOSED line-up into plans/decisions.json (gate G2) from the pages the
// storefront builds (apps/site/src/catalog/products.ts). Every clusters.json page
// gets a row: build true with its preset, or build false with where its old URLs
// go. The owner still rules on it: decidedBy stays null and status stays
// "proposed" until they change it. Rerun after editing the catalog.
//
//   node scripts/storefront-lineup.mjs
//
// Pure local computation. No network.
import { readFile, writeFile } from 'node:fs/promises';
import { COLLECTIONS, PRODUCTS } from '../apps/site/src/catalog/products.ts';

const read = async (f) => JSON.parse(await readFile(new URL(`../plans/${f}`, import.meta.url), 'utf8'));
const clusters = await read('clusters.json');
const decisions = await read('decisions.json');

const built = new Map(PRODUCTS.map((p) => [p.pageKey, p]));
const parts = (pageKey) => {
  const [type, recipient, occasion = null] = pageKey.split('/');
  return { type, recipient, occasion };
};
const rankOf = new Map(clusters.rows.map((r) => [r.pageKey, r.rank]));
const builtByRank = [...built.keys()].sort((a, b) => rankOf.get(a) - rankOf.get(b));

// When no built page shares the recipient, old URLs go to the collection for the occasion.
const OCCASION_COLLECTION = {
  wedding: 'wedding-thank-you-frames',
  announcement: 'new-grandparent-to-be',
  baptism: 'godparent-frames',
  proposal: 'godparent-frames',
  birth: 'baby-frames',
};
const RECIPIENT_COLLECTION = {
  grandparents: 'grandparent-frames',
  'great-grandparent': 'grandparent-frames',
};
const collectionHandles = new Set(COLLECTIONS.map((c) => c.handle));

function redirectFor(pageKey) {
  const { recipient, occasion } = parts(pageKey);
  // Memorial pages only ever take memorial URLs, in both directions.
  const sameRecipient = builtByRank.filter((k) => parts(k).recipient === recipient && (parts(k).occasion === 'memorial') === (occasion === 'memorial'));
  const exact = sameRecipient.find((k) => parts(k).occasion === occasion);
  if (exact) return { redirectTo: exact, why: 'built page for the same recipient and occasion' };
  const everyday = sameRecipient.find((k) => parts(k).occasion === 'everyday');
  if (everyday ?? sameRecipient[0]) {
    return { redirectTo: everyday ?? sameRecipient[0], why: 'nearest built page for the same recipient' };
  }
  const col = recipient === 'pet' ? undefined : (RECIPIENT_COLLECTION[recipient] ?? OCCASION_COLLECTION[occasion]);
  if (col && collectionHandles.has(col)) return { redirectTo: `collection:${col}`, why: `no built page for ${recipient}; the ${col} collection fits` };
  return { redirectTo: 'collection:all', why: `no built page or collection fits ${pageKey}` };
}

const rows = clusters.rows.map((c) => {
  const p = built.get(c.pageKey);
  if (p) {
    return {
      clusterId: c.clusterId,
      pageKey: c.pageKey,
      build: true,
      handle: p.handle,
      shape: p.preset.shape,
      background: p.preset.backgroundId,
      presetFrom: p.etsyListingId,
      priceCents: p.priceCents,
      redirectTo: null,
      note: `${c.tier} tier, ${c.favorers} favourites over ${c.listingCount} listings`,
    };
  }
  const { redirectTo, why } = redirectFor(c.pageKey);
  const type = parts(c.pageKey).type;
  const notFrame = type !== 'frame' ? ` ${type} pages wait until that product's shape and backgrounds are in the repo.` : '';
  return {
    clusterId: c.clusterId,
    pageKey: c.pageKey,
    build: false,
    shape: null,
    background: null,
    presetFrom: null,
    redirectTo,
    note: `${c.tier} tier; ${why}.${notFrame}`,
  };
});

decisions._schema.row.handle = 'built pages only: the /products/<handle> URL';
decisions._schema.row.priceCents = 'built pages only: price in cents, Etsy parity from the preset listing';
decisions._schema.row.redirectTo =
  'pageKey that takes this page\'s old URLs when build is false, or "collection:<handle>" when no built page fits';
decisions.status = 'proposed';
decisions.proposedBy = 'agent, from apps/site/src/catalog/products.ts via scripts/storefront-lineup.mjs';
decisions.proposedAt = new Date().toISOString();
decisions.decidedBy = null;
decisions.decidedAt = null;
decisions.rows = rows;

await writeFile(new URL('../plans/decisions.json', import.meta.url), JSON.stringify(decisions, null, 2) + '\n');
const n = rows.filter((r) => r.build).length;
console.log(`storefront-lineup: ${rows.length} pages, ${n} built, ${rows.length - n} redirected (status: proposed)`);

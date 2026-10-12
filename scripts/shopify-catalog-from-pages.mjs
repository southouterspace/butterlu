// Builds plans/catalog.json from raw Shopify Admin GraphQL pages saved from the Shopify
// connector (read-only graphql_query). The connector is the only Shopify access, so the
// fetch is done by an agent and this script turns the saved pages into the manifest.
//
//   node scripts/shopify-catalog-from-pages.mjs <dir>
//
// <dir> holds products-*.json and collections-*.json, each one raw response page of:
//
//   query P($first:Int!,$after:String){ products(first:$first, after:$after, sortKey:ID){
//     pageInfo{hasNextPage endCursor} nodes{ id handle title status publishedAt productType
//     tags variantsCount{count} options{name optionValues{name}} seo{title description}
//     featuredMedia{alt} collections(first:25){nodes{handle}} } } }
//
//   query C($first:Int!,$after:String){ collections(first:$first, after:$after, sortKey:ID){
//     pageInfo{hasNextPage endCursor} nodes{ id handle title updatedAt productsCount{count}
//     ruleSet{appliedDisjunctively} seo{title description} } } }
//
// Page with first: 50 and pass each endCursor as after until hasNextPage is false.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node scripts/shopify-catalog-from-pages.mjs <dir>');
  process.exit(1);
}
const OUT = new URL('../plans/catalog.json', import.meta.url);

async function nodes(prefix, key) {
  const files = (await readdir(dir)).filter((f) => f.startsWith(prefix) && f.endsWith('.json')).sort();
  const pages = await Promise.all(files.map(async (f) => JSON.parse(await readFile(join(dir, f), 'utf8')).data[key]));
  if (pages.length === 0 || pages.at(-1).pageInfo.hasNextPage) throw new Error(`${prefix} pages are incomplete`);
  return pages.flatMap((p) => p.nodes);
}

const products = await nodes('products-', 'products');
const collections = await nodes('collections-', 'collections');
if (new Set(products.map((p) => p.id)).size !== products.length) throw new Error('duplicate products across pages');

const catalog = JSON.parse(await readFile(OUT, 'utf8'));
catalog.generatedAt = new Date().toISOString();
catalog.source = 'Shopify connector, read-only graphql_query, built by scripts/shopify-catalog-from-pages.mjs';
catalog.notFetched = 'descriptionHtml was not fetched (too large for the connector page), so descriptionLength and descriptionSha256 are null. Etsy descriptions are the source now.';
catalog.rows = products
  .map((p) => ({
    id: p.id,
    handle: p.handle,
    url: `/products/${p.handle}`,
    title: p.title,
    status: p.status,
    publishedAt: p.publishedAt,
    productType: p.productType,
    tags: p.tags,
    variantsCount: p.variantsCount.count,
    options: p.options.map((o) => ({ name: o.name, valueCount: o.optionValues.length })),
    seoTitle: p.seo.title,
    seoDescription: p.seo.description,
    descriptionLength: null,
    descriptionSha256: null,
    featuredImageAlt: p.featuredMedia?.alt || null,
    collections: p.collections.nodes.map((c) => c.handle),
  }))
  .sort((a, b) => a.handle.localeCompare(b.handle));
catalog.collections = collections
  .map((c) => ({
    id: c.id,
    handle: c.handle,
    url: `/collections/${c.handle}`,
    title: c.title,
    productsCount: c.productsCount.count,
    smart: c.ruleSet !== null,
    seoTitle: c.seo.title,
    seoDescription: c.seo.description,
  }))
  .sort((a, b) => a.handle.localeCompare(b.handle));

await writeFile(OUT, JSON.stringify(catalog, null, 2) + '\n');
console.log(`wrote ${catalog.rows.length} products and ${catalog.collections.length} collections to plans/catalog.json`);

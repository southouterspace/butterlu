// Search copy for collection and product pages: the words below the grid, FAQs and
// sibling links (docs/12-serp-leadership.md §5). Kept out of products.ts so the
// checkout Worker, which imports products.ts for prices, doesn't bundle it.
import data from './copy.json';
import { COLLECTIONS, PRODUCTS } from './products';

export type Faq = readonly [question: string, answer: string];
export interface CollectionCopy {
  body: string[];
  faq: Faq[];
  related: string[];
}

// JSON imports type arrays as string[][], not tuples; the checks below fail the build on a
// mistyped handle or a FAQ that isn't a question and answer pair.
const collections = data.collections as unknown as Record<string, CollectionCopy>;
const products = data.products as unknown as Record<string, { faq?: Faq[] }>;

const productHandles = new Set(PRODUCTS.map((p) => p.handle));
const collectionHandles = new Set(COLLECTIONS.map((c) => c.handle));
const badFaq = (faq: Faq[]) => faq.some((f) => f.length !== 2 || !f[0] || !f[1]);
for (const [handle, c] of Object.entries(collections)) {
  if (!collectionHandles.has(handle)) throw new Error(`copy.json: no collection "${handle}"`);
  const missing = c.related.filter((r) => !collectionHandles.has(r));
  if (missing.length) throw new Error(`copy.json: ${handle} links to unknown collections ${missing.join(', ')}`);
  if (badFaq(c.faq)) throw new Error(`copy.json: ${handle} has a malformed FAQ`);
}
for (const [handle, p] of Object.entries(products)) {
  if (!productHandles.has(handle)) throw new Error(`copy.json: no product "${handle}"`);
  if (badFaq(p.faq ?? [])) throw new Error(`copy.json: ${handle} has a malformed FAQ`);
}

export const collectionCopy = (handle: string): CollectionCopy | undefined => collections[handle];
export const productFaq = (handle: string): Faq[] => products[handle]?.faq ?? [];

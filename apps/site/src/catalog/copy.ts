// Search copy for collection and product pages: the words below the grid, wording
// ideas and sibling links. Questions are shared by every page (pages.json) (docs/12-serp-leadership.md §5). Kept out of products.ts so the
// checkout Worker, which imports products.ts for prices, doesn't bundle it.
import data from './copy.json';
import { COLLECTIONS, PRODUCTS } from './products';

/** Text for some of the sides (top, bottom, left, right), loaded into the customizer on tap. */
export type Idea = Partial<Record<'top' | 'bottom' | 'left' | 'right', string>>;
export interface CollectionCopy {
  body: string[];
  related: string[];
}

// JSON imports type arrays as string[][], not tuples; the checks below fail the build on a
// mistyped handle or a bad wording idea.
const collections = data.collections as unknown as Record<string, CollectionCopy>;
const products = data.products as unknown as Record<string, { ideas?: Idea[] }>;

const productHandles = new Set(PRODUCTS.map((p) => p.handle));
const collectionHandles = new Set(COLLECTIONS.map((c) => c.handle));
for (const [handle, c] of Object.entries(collections)) {
  if (!collectionHandles.has(handle)) throw new Error(`copy.json: no collection "${handle}"`);
  const missing = c.related.filter((r) => !collectionHandles.has(r));
  if (missing.length) throw new Error(`copy.json: ${handle} links to unknown collections ${missing.join(', ')}`);
}
for (const [handle, p] of Object.entries(products)) {
  if (!productHandles.has(handle)) throw new Error(`copy.json: no product "${handle}"`);
  for (const idea of p.ideas ?? []) {
    const lines = Object.entries(idea);
    if (!idea.top && !idea.bottom) throw new Error(`copy.json: ${handle} has an idea with no top or bottom line`);
    if (lines.some(([side, text]) => !['top', 'bottom', 'left', 'right'].includes(side) || typeof text !== 'string' || text.length > 60))
      throw new Error(`copy.json: ${handle} has an idea with a bad side or a line over 60 characters`);
  }
}

export const collectionCopy = (handle: string): CollectionCopy | undefined => collections[handle];
export const productIdeas = (handle: string): Idea[] => products[handle]?.ideas ?? [];

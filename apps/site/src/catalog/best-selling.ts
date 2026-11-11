/**
 * Best selling order for Shop All. Category pages keep their own order.
 *
 * Edit this list by hand: put the design you want first at the top. Until the
 * site has sales of its own, the order comes from the Etsy shop. The first cut
 * (2026-11-11) ranks by Etsy favorites from plans/etsy-listings.json, because
 * the Etsy API gives no per-listing sales. Swap in real Etsy sales when Asli
 * pulls them from Shop Manager.
 *
 * A design missing from the list sorts after the listed ones, in catalog order,
 * so a new design never disappears. The build fails on a handle that isn't a design.
 */
import { DESIGNS } from './products';

export const BEST_SELLING: readonly string[] = [
  'grandparent-pregnancy-announcement-frame',
  'godmother-proposal-frame',
  'personalized-grandma-frame',
  'godfather-baptism-frame',
  'grandpa-birthday-frame',
  'godmother-baptism-frame',
  'father-of-the-bride-frame',
  'grandpa-christmas-frame',
  'engagement-frame-for-couple',
  'grandpa-picture-frame',
  'love-at-first-sight-ultrasound-frame',
  'grandpa-fathers-day-frame',
  'aunt-uncle-picture-frame',
  'mimi-picture-frame',
  'mother-of-the-groom-frame',
  'papa-picture-frame',
  'gigi-christmas-frame',
  'great-grandparent-announcement-frame',
  'abuela-picture-frame',
  'twins-ultrasound-frame',
  'baby-name-frame',
  'godparents-baptism-frame',
  'nana-picture-frame',
  'pet-memorial-frame',
];

const rank = new Map(BEST_SELLING.map((handle, i) => [handle, i]));

/** Sorts designs best selling first; unlisted designs keep their catalog order after the listed ones. */
export function byBestSelling<T extends { handle: string }>(items: readonly T[]): T[] {
  return items
    .map((item, i) => ({ item, key: rank.get(item.handle) ?? BEST_SELLING.length + i }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);
}

// The build fails on a handle that isn't a design (a typo or a retired design).
const designs = new Set(DESIGNS.map((d) => d.handle));
const unknown = BEST_SELLING.filter((h) => !designs.has(h));
if (unknown.length) throw new Error(`best-selling.ts lists handles that aren't designs: ${unknown.join(', ')}`);
if (new Set(BEST_SELLING).size !== BEST_SELLING.length) throw new Error('best-selling.ts lists a design twice');

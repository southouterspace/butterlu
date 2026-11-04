// Groups the 44 backgrounds into the three families the shop already names
// (patterns, wood and texture, solids), so a shopper scans short sets, not one wall.
import { BACKGROUNDS } from '@butterlu/frame';

type Background = (typeof BACKGROUNDS)[number];

export const BACKGROUND_GROUPS = [
  { id: 'patterns', label: 'Stripes, checks, toile and bows', test: (id: string) => /(stripes|checkers|toile|bows)$/.test(id) },
  { id: 'texture', label: 'Wood, shiplap and linen', test: (id: string) => /(linen|shiplap|wood|distressed)/.test(id) },
  { id: 'solids', label: 'Solid colors', test: () => true },
] as const;

export function groupedBackgrounds(): { id: string; label: string; items: Background[] }[] {
  const seen = new Set<string>();
  return BACKGROUND_GROUPS.map((g) => {
    const items = BACKGROUNDS.filter((b) => !seen.has(b.id) && g.test(b.id));
    for (const b of items) seen.add(b.id);
    return { id: g.id, label: g.label, items: [...items] };
  });
}

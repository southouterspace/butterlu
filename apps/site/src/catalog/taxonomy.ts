// How shoppers browse the designs (docs/12 §4c). Each design is tagged once with who
// it's for and with the occasions it suits; its frame shape comes from its preset.
// The header menu, the filter chips on category pages, the home page and the feed
// all read these lists. A filtered view (?for=, ?occasion=, ?frame=) keeps its
// category's canonical URL, so filtering adds no pages to the index.
//
// Plain TypeScript with no Astro imports, like products.ts.
import { COLLECTIONS, DESIGNS, type Product, collectionProducts, isFrame } from './products';

export type RecipientKey =
  | 'grandma'
  | 'grandpa'
  | 'great-grandparents'
  | 'both-grandparents'
  | 'godmother'
  | 'godfather'
  | 'both-godparents'
  | 'parents-of-the-couple'
  | 'couple'
  | 'aunt-uncle'
  | 'baby'
  | 'pet';

export type OccasionKey =
  | 'pregnancy-announcement'
  | 'baptism'
  | 'wedding'
  | 'engagement'
  | 'christmas'
  | 'birthday'
  | 'mothers-day'
  | 'fathers-day'
  | 'baby-shower'
  | 'memorial'
  | 'everyday';

export type FrameKey = 'scalloped' | 'rounded';

export interface Recipient {
  key: RecipientKey;
  /** Short, for chips and links. */
  label: string;
  /** Other names shoppers use, shown in the menu under the label. */
  hint?: string;
}

export interface RecipientGroup {
  key: string;
  label: string;
  /** The category page this group opens. Its designs must all be in it. */
  collection: string;
  children: Recipient[];
}

export interface Occasion {
  key: OccasionKey;
  label: string;
  /** A category page made for this occasion. Without one it opens a filtered Shop all. */
  collection?: string;
}

/** Menu order. Group keys and recipient keys share one namespace in ?for=. */
export const RECIPIENT_GROUPS: RecipientGroup[] = [
  {
    key: 'grandparents',
    label: 'Grandparents',
    collection: 'grandparent-frames',
    children: [
      { key: 'grandma', label: 'Grandma', hint: 'Mimi, Nana, Gigi, Abuela' },
      { key: 'grandpa', label: 'Grandpa', hint: 'Papa, Pop, Grandad' },
      { key: 'both-grandparents', label: 'Both grandparents' },
      { key: 'great-grandparents', label: 'Great-grandparents' },
    ],
  },
  {
    key: 'godparents',
    label: 'Godparents',
    collection: 'godparent-frames',
    children: [
      { key: 'godmother', label: 'Godmother' },
      { key: 'godfather', label: 'Godfather' },
      { key: 'both-godparents', label: 'Both godparents' },
    ],
  },
  {
    key: 'weddings',
    label: 'Weddings',
    collection: 'wedding-thank-you-frames',
    children: [
      { key: 'parents-of-the-couple', label: 'Parents of the couple' },
      { key: 'couple', label: 'The couple' },
    ],
  },
  { key: 'aunts-and-uncles', label: 'Aunts and uncles', collection: 'aunt-uncle-frames', children: [{ key: 'aunt-uncle', label: 'Aunt and uncle' }] },
  { key: 'new-baby', label: 'New baby', collection: 'baby-frames', children: [{ key: 'baby', label: 'Babies and parents-to-be' }] },
  { key: 'pets', label: 'Pets', collection: 'pet-loss-memorial', children: [{ key: 'pet', label: 'Dogs and cats' }] },
];

/** Menu order. Only occasions with at least one design are shown anywhere. */
const ALL_OCCASIONS: Occasion[] = [
  { key: 'pregnancy-announcement', label: 'Pregnancy announcements', collection: 'new-grandparent-to-be' },
  { key: 'baptism', label: 'Baptisms and christenings', collection: 'godparent-frames' },
  { key: 'wedding', label: 'Weddings', collection: 'wedding-thank-you-frames' },
  { key: 'engagement', label: 'Engagements' },
  { key: 'christmas', label: 'Christmas' },
  { key: 'birthday', label: 'Birthdays' },
  { key: 'mothers-day', label: 'Mother’s Day' },
  { key: 'fathers-day', label: 'Father’s Day' },
  { key: 'baby-shower', label: 'Baby showers' },
  // Only a pet design so far; rename to "In memory" when other memorial designs exist.
  { key: 'memorial', label: 'Pet memorials', collection: 'pet-loss-memorial' },
  { key: 'everyday', label: 'Just because' },
];

export const FRAME_SHAPES: { key: FrameKey; label: string; shape: Product['preset']['shape'] }[] = [
  { key: 'scalloped', label: 'Scalloped', shape: 'scalloped' },
  { key: 'rounded', label: 'Rounded', shape: 'rounded-rectangle' },
];

/** Every design, tagged from its own "good for" list. The build fails on a gap. */
const TAGS: Record<string, { for: RecipientKey; occasions: OccasionKey[] }> = {
  'grandparent-pregnancy-announcement-frame': { for: 'both-grandparents', occasions: ['pregnancy-announcement'] },
  'father-of-the-bride-frame': { for: 'parents-of-the-couple', occasions: ['wedding'] },
  'personalized-grandma-frame': { for: 'grandma', occasions: ['mothers-day', 'birthday'] },
  'godmother-proposal-frame': { for: 'godmother', occasions: ['baptism'] },
  'godfather-baptism-frame': { for: 'godfather', occasions: ['baptism'] },
  'godmother-baptism-frame': { for: 'godmother', occasions: ['baptism', 'birthday'] },
  'grandpa-christmas-frame': { for: 'grandpa', occasions: ['christmas'] },
  'grandpa-birthday-frame': { for: 'grandpa', occasions: ['birthday', 'fathers-day'] },
  'engagement-frame-for-couple': { for: 'couple', occasions: ['engagement', 'wedding'] },
  'aunt-uncle-picture-frame': { for: 'aunt-uncle', occasions: ['birthday', 'everyday'] },
  'love-at-first-sight-ultrasound-frame': { for: 'grandma', occasions: ['pregnancy-announcement'] },
  'grandpa-fathers-day-frame': { for: 'grandpa', occasions: ['fathers-day'] },
  'grandpa-picture-frame': { for: 'grandpa', occasions: ['birthday', 'christmas'] },
  'gigi-christmas-frame': { for: 'grandma', occasions: ['christmas'] },
  'twins-ultrasound-frame': { for: 'baby', occasions: ['pregnancy-announcement'] },
  'baby-name-frame': { for: 'baby', occasions: ['baby-shower'] },
  'great-grandparent-announcement-frame': { for: 'great-grandparents', occasions: ['pregnancy-announcement'] },
  'godparents-baptism-frame': { for: 'both-godparents', occasions: ['baptism'] },
  'pet-memorial-frame': { for: 'pet', occasions: ['memorial'] },
  'mimi-picture-frame': { for: 'grandma', occasions: ['mothers-day', 'birthday', 'christmas'] },
  'nana-picture-frame': { for: 'grandma', occasions: ['mothers-day', 'birthday', 'christmas'] },
  'papa-picture-frame': { for: 'grandpa', occasions: ['fathers-day', 'birthday', 'christmas'] },
  'abuela-picture-frame': { for: 'grandma', occasions: ['mothers-day', 'birthday', 'christmas'] },
  'mother-of-the-groom-frame': { for: 'parents-of-the-couple', occasions: ['wedding'] },
};

export interface Tags {
  for: Recipient;
  group: RecipientGroup;
  occasions: Occasion[];
  frame: (typeof FRAME_SHAPES)[number];
}

const groupOf = new Map<RecipientKey, RecipientGroup>();
for (const g of RECIPIENT_GROUPS) for (const r of g.children) groupOf.set(r.key, g);
const occasionByKey = new Map(ALL_OCCASIONS.map((o) => [o.key, o]));
const collectionHandles = new Set(COLLECTIONS.map((c) => c.handle));

/** Who it's for, occasions and frame for a design; undefined for the two frames. */
export function tagsFor(p: Product): Tags | undefined {
  if (isFrame(p)) return undefined;
  const t = TAGS[p.handle];
  if (!t) return undefined;
  const r = groupOf.get(t.for)!;
  return {
    for: r.children.find((c) => c.key === t.for)!,
    group: r,
    occasions: t.occasions.map((k) => occasionByKey.get(k)!),
    frame: FRAME_SHAPES.find((f) => f.shape === p.preset.shape)!,
  };
}

// Build-time checks: a gap here would hide a design from a menu or a filter.
{
  const keys = new Set<string>();
  for (const g of RECIPIENT_GROUPS) {
    if (!collectionHandles.has(g.collection)) throw new Error(`taxonomy: ${g.key} opens unknown collection ${g.collection}`);
    for (const k of [g.key, ...g.children.map((c) => c.key)]) {
      if (keys.has(k)) throw new Error(`taxonomy: key "${k}" is used twice`);
      keys.add(k);
    }
  }
  for (const o of ALL_OCCASIONS) if (o.collection && !collectionHandles.has(o.collection)) throw new Error(`taxonomy: ${o.key} opens unknown collection ${o.collection}`);
  const designHandles = new Set(DESIGNS.map((p) => p.handle));
  for (const h of Object.keys(TAGS)) if (!designHandles.has(h)) throw new Error(`taxonomy: tags for unknown design "${h}"`);
  for (const p of DESIGNS) {
    const t = TAGS[p.handle];
    if (!t) throw new Error(`taxonomy: design "${p.handle}" has no tags`);
    if (!t.occasions.length) throw new Error(`taxonomy: design "${p.handle}" has no occasion`);
    const tags = tagsFor(p)!;
    // The menu link for a group or occasion opens its category page, so every design
    // tagged with it has to be on that page.
    if (!p.collections.includes(tags.group.collection)) throw new Error(`taxonomy: "${p.handle}" is for ${tags.group.label} but not in ${tags.group.collection}`);
    for (const o of tags.occasions) if (o.collection && !p.collections.includes(o.collection)) throw new Error(`taxonomy: "${p.handle}" is tagged ${o.key} but not in ${o.collection}`);
  }
}

/** Occasions with at least one design, in menu order. */
export const OCCASIONS: Occasion[] = ALL_OCCASIONS.filter((o) => DESIGNS.some((p) => TAGS[p.handle]!.occasions.includes(o.key)));

export const groupHref = (g: RecipientGroup) => `/collections/${g.collection}`;
/** A person in a group of one opens the group's page; it has nothing to filter. */
export const recipientHref = (r: Recipient) => {
  const g = groupOf.get(r.key)!;
  return g.children.length > 1 ? `${groupHref(g)}?for=${r.key}` : groupHref(g);
};
export const occasionHref = (o: Occasion) => (o.collection ? `/collections/${o.collection}` : `/collections/all?occasion=${o.key}`);

/** Designs a link opens, so a design page doesn't link to a view of only itself. */
export const recipientCount = (r: Recipient) => {
  const g = groupOf.get(r.key)!;
  return g.children.length > 1 ? DESIGNS.filter((p) => TAGS[p.handle]!.for === r.key).length : collectionProducts(g.collection).length;
};
export const occasionCount = (o: Occasion) =>
  o.collection ? collectionProducts(o.collection).length : DESIGNS.filter((p) => TAGS[p.handle]!.occasions.includes(o.key)).length;

/** Designs on the page a group opens, for the home page tiles. */
export const groupCount = (g: RecipientGroup) => collectionProducts(g.collection).length;

export interface Facet {
  /** URL parameter. */
  param: 'for' | 'occasion' | 'frame';
  label: string;
  options: { key: string; label: string; count: number }[];
}

/**
 * Filter chips for a page of designs. Shop all filters by group; a category filters by
 * the recipients on it. A facet is offered only when it splits the page.
 */
export function facetsFor(products: Product[], level: 'group' | 'recipient'): Facet[] {
  const tags = products.map((p) => tagsFor(p)).filter((t): t is Tags => Boolean(t));
  const count = <T>(items: T[], key: (t: Tags) => T[], id: (x: T) => string, label: (x: T) => string) =>
    items
      .map((x) => ({ key: id(x), label: label(x), count: tags.filter((t) => key(t).some((y) => id(y) === id(x))).length }))
      .filter((o) => o.count > 0);
  const forOptions =
    level === 'group'
      ? count(RECIPIENT_GROUPS, (t) => [t.group], (g) => g.key, (g) => g.label)
      : count(RECIPIENT_GROUPS.flatMap((g) => g.children), (t) => [t.for], (r) => r.key, (r) => r.label);
  const facets: Facet[] = [
    { param: 'for', label: 'Who it’s for', options: forOptions },
    { param: 'occasion', label: 'Occasion', options: count(OCCASIONS, (t) => t.occasions, (o) => o.key, (o) => o.label) },
    { param: 'frame', label: 'Frame', options: count(FRAME_SHAPES, (t) => [t.frame], (f) => f.key, (f) => f.label) },
  ];
  return facets.filter((f) => f.options.length > 1 && f.options.some((o) => o.count < tags.length));
}

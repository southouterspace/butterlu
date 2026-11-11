// Checks a catalog document before it is saved or published (docs/13). The same
// rules the build enforces on the catalog modules, plus the SEO length limits
// lint-dist applies to the rendered pages, so a publish that passes here builds.
import { parseDesign } from '@butterlu/frame/design';
import type { CatalogDoc, CategoryDoc, SeoField, TemplateDoc } from './doc';

/** " | Butterlu" is added to every page title; lint-dist allows 60 characters in all. */
export const TITLE_SUFFIX = ' | Butterlu';
export const SEO_LIMITS = {
  seoTitle: 60 - TITLE_SUFFIX.length,
  seoDescription: 160,
  altText: 125,
  feedTitle: 150,
  feedDescription: 1000,
} as const;
export type SeoKey = keyof typeof SEO_LIMITS;

export const SEO_LABELS: Record<SeoKey, string> = {
  seoTitle: 'Search title',
  seoDescription: 'Search description',
  altText: 'Image description (alt text)',
  feedTitle: 'Google Shopping title',
  feedDescription: 'Google Shopping description',
};

export const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED = new Set(['scalloped-picture-frame', 'rounded-picture-frame', 'all']);

// Justin's rule (2026-11-11): store labels are always Title Case and use "&" for "and",
// as in "Baptisms & Christenings". Covers design names, category names and the shop-by
// lists. Small words stay lower case unless they start or end the label.
const SMALL = new Set(['a', 'an', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'vs', 'via', 'with']);
const capWord = (w: string) => (/[A-Z]/.test(w.slice(1)) ? w : w.charAt(0).toUpperCase() + w.slice(1));

/** A label in the store's style: Title Case, "&" for "and". */
export function toLabel(text: string): string {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).map((w) => (w.toLowerCase() === 'and' ? '&' : w));
  return words
    .map((w, i) => {
      if (w === '&') return w;
      const lower = w.toLowerCase();
      if (i > 0 && i < words.length - 1 && SMALL.has(lower)) return lower;
      // Each part of a hyphenated word: "Great-Grandparents".
      return w.split('-').map(capWord).join('-');
    })
    .join(' ');
}

function checkLabel(where: string, what: string, label: string, errors: string[]) {
  const want = toLabel(label);
  if (label.trim() && label !== want) errors.push(`${where}: ${what} should read "${want}" (Title Case, "&" for "and")`);
}

/** The shop-by lists' labels against the label rule. */
export function checkTaxonomyLabels(taxonomy: CatalogDoc['taxonomy']): string[] {
  const errors: string[] = [];
  for (const g of taxonomy.groups) {
    checkLabel(g.label, 'the group name', g.label, errors);
    for (const c of g.children) checkLabel(c.label, 'the name', c.label, errors);
  }
  for (const o of taxonomy.occasions) checkLabel(o.label, 'the occasion', o.label, errors);
  return errors;
}

export interface CheckResult {
  /** Must be fixed before a publish. */
  errors: string[];
  /** Worth a look; a publish still goes ahead. */
  warnings: string[];
}

export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

function checkSeo(where: string, key: SeoKey, f: SeoField | undefined, errors: string[], warnings: string[], required: boolean) {
  if (!f || f.status === 'empty' || !f.value.trim()) {
    if (required) errors.push(`${where}: ${SEO_LABELS[key]} is missing`);
    return;
  }
  if (f.value.length > SEO_LIMITS[key]) errors.push(`${where}: ${SEO_LABELS[key]} is ${f.value.length} characters, ${SEO_LIMITS[key]} at most`);
  if (f.status === 'draft') errors.push(`${where}: ${SEO_LABELS[key]} is a draft Claude wrote and isn't approved yet`);
  if (/[<>]/.test(f.value)) errors.push(`${where}: ${SEO_LABELS[key]} can't contain < or >`);
}

/** Checks one template on its own: what the editor can tell before saving. */
export function checkTemplate(t: TemplateDoc, doc: Pick<CatalogDoc, 'categories' | 'taxonomy'>): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const where = t.name || t.handle || 'New template';
  if (!HANDLE.test(t.handle) || t.handle.length > 80) errors.push(`${where}: the web address name may use only a-z, 0-9 and dashes`);
  if (RESERVED.has(t.handle)) errors.push(`${where}: "${t.handle}" is taken by the store`);
  if (!t.name.trim() || t.name.length > 80) errors.push(`${where}: give it a name of at most 80 characters`);
  checkLabel(where, 'the name', t.name, errors);
  const design = parseDesign(t.preset);
  if (!design.ok) errors.push(...design.errors.map((e) => `${where}: ${e}`));

  const recipients = new Map(doc.taxonomy.groups.flatMap((g) => g.children.map((r) => [r.key, g] as const)));
  const occasions = new Map(doc.taxonomy.occasions.map((o) => [o.key, o]));
  const categories = new Set(doc.categories.map((c) => c.handle));
  const group = recipients.get(t.for);
  if (!group) errors.push(`${where}: choose who it's for`);
  for (const o of t.occasions) if (!occasions.has(o)) errors.push(`${where}: unknown occasion "${o}"`);
  for (const c of t.collections) if (!categories.has(c)) errors.push(`${where}: unknown category "${c}"`);

  if (t.status === 'live') {
    if (!t.occasions.length) errors.push(`${where}: choose at least one occasion`);
    if (!t.collections.length) errors.push(`${where}: put it on at least one category page`);
    // Menus open a group's or occasion's category page, so a live template has to be on it.
    if (group && !t.collections.includes(group.collection)) errors.push(`${where}: it's for ${group.label}, so it must be on that category page`);
    for (const key of t.occasions) {
      const o = occasions.get(key);
      if (o?.collection && !t.collections.includes(o.collection)) errors.push(`${where}: it's tagged ${o.label}, so it must be on that category page`);
    }
  }
  for (const idea of t.ideas) {
    if (!idea.top && !idea.bottom) errors.push(`${where}: every wording idea needs a top or bottom line`);
    if (Object.values(idea).some((line) => typeof line !== 'string' || line.length > 60)) errors.push(`${where}: wording idea lines are 60 characters at most`);
  }
  if (t.intro.length > 400) errors.push(`${where}: the intro is 400 characters at most`);
  // Justin (2026-11-11): descriptions are short and don't restate the obvious.
  else if (t.intro.length > 200) warnings.push(`${where}: the intro is long; keep it to a sentence or two`);
  const needsPageSeo = t.hasPage && t.status === 'live';
  checkSeo(where, 'seoTitle', t.seo.seoTitle, errors, warnings, needsPageSeo);
  checkSeo(where, 'seoDescription', t.seo.seoDescription, errors, warnings, needsPageSeo);
  checkSeo(where, 'altText', t.seo.altText, errors, warnings, false);
  checkSeo(where, 'feedTitle', t.seo.feedTitle, errors, warnings, false);
  checkSeo(where, 'feedDescription', t.seo.feedDescription, errors, warnings, false);
  if (t.status === 'live' && !t.seo.altText.value) warnings.push(`${where}: no image description yet; the card falls back to the name`);
  return { errors, warnings };
}

export function checkCategory(c: CategoryDoc, templates: TemplateDoc[]): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const where = c.name || c.handle;
  if (!c.name.trim()) errors.push(`${c.handle}: give the category a name`);
  checkLabel(where, 'the name', c.name, errors);
  if (c.intro.length > 400) errors.push(`${where}: the intro is 400 characters at most`);
  else if (c.intro.length > 200) warnings.push(`${where}: the intro is long; keep it to a sentence or two`);
  for (const [q, a] of c.faq) if (!q?.trim() || !a?.trim()) errors.push(`${where}: every FAQ needs a question and an answer`);
  const handles = new Set(templates.map((t) => t.handle));
  for (const h of c.order) if (!handles.has(h)) errors.push(`${where}: lists unknown template "${h}"`);
  checkSeo(where, 'seoTitle', c.seo.seoTitle, errors, warnings, true);
  checkSeo(where, 'seoDescription', c.seo.seoDescription, errors, warnings, true);
  return { errors, warnings };
}

/** The whole catalog: every template and category, plus the rules that span them. */
export function checkCatalog(doc: CatalogDoc): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const add = (r: CheckResult) => {
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  };
  const seen = new Set<string>();
  for (const t of doc.templates) {
    if (seen.has(t.handle)) errors.push(`Two templates share the web address name "${t.handle}"`);
    seen.add(t.handle);
    add(checkTemplate(t, doc));
  }
  const categoryHandles = new Set(doc.categories.map((c) => c.handle));
  for (const c of doc.categories) {
    add(checkCategory(c, doc.templates));
    for (const r of c.related) if (!categoryHandles.has(r)) errors.push(`${c.name}: links to unknown category "${r}"`);
  }
  const keys = new Set<string>();
  for (const g of doc.taxonomy.groups) {
    if (!categoryHandles.has(g.collection)) errors.push(`${g.label}: opens unknown category "${g.collection}"`);
    if (!g.label.trim()) errors.push(`${g.key}: give the group a label`);
    for (const k of [g.key, ...g.children.map((c) => c.key)]) {
      if (keys.has(k)) errors.push(`Shop-by key "${k}" is used twice`);
      keys.add(k);
    }
  }
  for (const o of doc.taxonomy.occasions) {
    if (o.collection && !categoryHandles.has(o.collection)) errors.push(`${o.label}: opens unknown category "${o.collection}"`);
  }
  errors.push(...checkTaxonomyLabels(doc.taxonomy));
  // Titles that compete with each other in search.
  const titles = new Map<string, string>();
  for (const [name, f] of [...doc.templates.filter((t) => t.status === 'live').map((t) => [t.name, t.seo.seoTitle] as const), ...doc.categories.map((c) => [c.name, c.seo.seoTitle] as const)]) {
    const k = f.value.trim().toLowerCase();
    if (!k) continue;
    const other = titles.get(k);
    if (other) warnings.push(`${name} and ${other} have the same search title`);
    else titles.set(k, name);
  }
  return { errors, warnings };
}

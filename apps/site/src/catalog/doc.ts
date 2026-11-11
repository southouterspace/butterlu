// The store's catalog as one data document: templates (ready-made designs),
// category pages, the shop-by lists and the component-built pages. The admin (docs/13) edits this shape, and
// `liveCatalog()` builds it from the catalog modules the site is built from today,
// so the admin starts from exactly what stage shows.
//
// Plain TypeScript with no Astro imports: the admin Worker and the build both read it.
import type { FrameSpec } from '@butterlu/frame';
import { collectionCopy, productIdeas, type Idea } from './copy';
import { COLLECTIONS, DESIGNS, collectionProducts, readyAsShown } from './products';
import { livePages, liveQuestions, type PageDoc, type QuestionDoc } from './pages';
import { OCCASIONS, RECIPIENT_GROUPS, tagsFor } from './taxonomy';

export type SeoStatus = 'approved' | 'draft' | 'empty';

/** One piece of search copy and who stands behind it. Only approved copy is published. */
export interface SeoField {
  value: string;
  status: SeoStatus;
  /** site: on the live site already; claude: drafted by Claude; hand: typed in the admin. */
  source?: 'site' | 'claude' | 'hand';
  by?: string;
  at?: string;
}

export const TEMPLATE_SEO = ['seoTitle', 'seoDescription', 'altText', 'feedTitle', 'feedDescription'] as const;
export const CATEGORY_SEO = ['seoTitle', 'seoDescription'] as const;
export type TemplateSeoKey = (typeof TEMPLATE_SEO)[number];
export type CategorySeoKey = (typeof CATEGORY_SEO)[number];

export type TemplateStatus = 'live' | 'draft' | 'hidden';

export interface TemplateDoc {
  handle: string;
  name: string;
  /** live: shown in the store; draft: being worked on; hidden: kept but not shown. */
  status: TemplateStatus;
  /** True for designs that keep their own /products page (the exact-search pages). */
  hasPage: boolean;
  preset: FrameSpec;
  /** Who it's for: a recipient key from the shop-by lists. */
  for: string;
  occasions: string[];
  /** Category pages that show it. */
  collections: string[];
  /** One tap adds it to the cart exactly as shown. */
  readyAsShown: boolean;
  intro: string;
  goodFor: string[];
  /** Wording ideas a shopper can load into the editor. */
  ideas: Idea[];
  seo: Record<TemplateSeoKey, SeoField>;
}

export interface CategoryDoc {
  handle: string;
  name: string;
  intro: string;
  /** Paragraphs under the grid. */
  body: string[];
  related: string[];
  /** Template handles in the order the page shows them. */
  order: string[];
  seo: Record<CategorySeoKey, SeoField>;
}

export interface RecipientDoc {
  key: string;
  label: string;
  hint?: string;
}

export interface GroupDoc {
  key: string;
  label: string;
  collection: string;
  inMenus: boolean;
  /** A key from src/catalog/illustrations.ts: the drawing on its home card. */
  illustration?: string;
  children: RecipientDoc[];
}

export interface OccasionDoc {
  key: string;
  label: string;
  collection?: string;
  /** A key from src/catalog/illustrations.ts: the drawing on its home card. */
  illustration?: string;
}

export interface TaxonomyDoc {
  groups: GroupDoc[];
  occasions: OccasionDoc[];
}

export interface CatalogDoc {
  templates: TemplateDoc[];
  categories: CategoryDoc[];
  taxonomy: TaxonomyDoc;
  /** Pages built from components (src/catalog/pages.ts): the homepage so far. */
  pages: PageDoc[];
  /** The questions and answers every page shares (one list, src/catalog/pages.json). */
  questions: QuestionDoc[];
}

const field = (value: string | undefined): SeoField =>
  value ? { value, status: 'approved', source: 'site' } : { value: '', status: 'empty' };

/** The catalog stage is built from right now, as a document. */
export function liveCatalog(): CatalogDoc {
  const templates: TemplateDoc[] = DESIGNS.map((p) => {
    const t = tagsFor(p);
    return {
      handle: p.handle,
      name: p.name,
      status: 'live',
      hasPage: true,
      preset: structuredClone(p.preset),
      for: t?.for.key ?? '',
      occasions: t?.occasions.map((o) => o.key) ?? [],
      collections: [...p.collections],
      readyAsShown: readyAsShown(p),
      intro: p.intro,
      goodFor: [...p.goodFor],
      ideas: structuredClone(productIdeas(p.handle)),
      seo: {
        seoTitle: field(p.seoTitle),
        seoDescription: field(p.seoDescription),
        altText: field(undefined),
        feedTitle: field(undefined),
        feedDescription: field(undefined),
      },
    };
  });
  const categories: CategoryDoc[] = COLLECTIONS.map((c) => {
    const copy = collectionCopy(c.handle);
    return {
      handle: c.handle,
      name: c.name,
      intro: c.intro,
      body: [...(copy?.body ?? [])],
      related: [...(copy?.related ?? [])],
      order: collectionProducts(c.handle).map((p) => p.handle),
      seo: { seoTitle: field(c.seoTitle), seoDescription: field(c.seoDescription) },
    };
  });
  const taxonomy: TaxonomyDoc = {
    groups: RECIPIENT_GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      collection: g.collection,
      inMenus: g.inMenus !== false,
      ...(g.illustration ? { illustration: g.illustration } : {}),
      children: g.children.map((r) => ({ key: r.key, label: r.label, ...(r.hint ? { hint: r.hint } : {}) })),
    })),
    occasions: OCCASIONS.map((o) => ({
      key: o.key,
      label: o.label,
      ...(o.collection ? { collection: o.collection } : {}),
      ...(o.illustration ? { illustration: o.illustration } : {}),
    })),
  };
  return { templates, categories, taxonomy, pages: livePages(), questions: liveQuestions() };
}

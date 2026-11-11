// Claude drafts SEO copy for the store admin (docs/13). It only ever returns options:
// the admin puts a picked option in the field as a draft, and only Asli's Approve makes
// it count. Nothing here writes to the catalog.
import Anthropic from '@anthropic-ai/sdk';
import { describeDesign } from '@butterlu/frame/design';
import { SEO_LABELS, SEO_LIMITS, TITLE_SUFFIX, type SeoKey } from '../src/catalog/check';
import type { CatalogDoc } from '../src/catalog/doc';
import { FRAME_PRICE_CENTS, SHOP } from '../src/catalog/products';
import type { Env } from './env';

export const DEFAULT_SEO_MODEL = 'claude-opus-5-5';

export const seoReady = (env: Env) => Boolean(env.ANTHROPIC_API_KEY);

export interface DraftRequest {
  kind: 'template' | 'category';
  field: SeoKey;
  /** The item as it stands on the form (may be unsaved). */
  item: Record<string, unknown>;
  doc: CatalogDoc;
}

export type DraftResult =
  | { ok: true; options: string[]; model: string }
  | { ok: false; status: number; error: string };

const GUIDE: Record<SeoKey, string> = {
  seoTitle: `The page's <title>, before "${TITLE_SUFFIX.trim()}" is added. Start with the exact phrase a shopper searches for (for example "Nana Picture Frame" or "Personalized Godmother Proposal Frames"). Title case. No price, no emoji, no brand name.`,
  seoDescription:
    'The meta description Google shows under the title. One short sentence about what is specific to this page: who it is for and what it says. Mention the live preview or free US shipping only if it adds something, never the price. Aim for 80 to 140 characters.',
  altText:
    'Alt text for the product image, read out by screen readers and used by image search. Describe what the frame shows: the shape, the background and the words on it. Start with "Personalized", no "image of", no marketing.',
  feedTitle:
    'The product title in Google Shopping. Lead with the search phrase, then "Personalized Picture Frame", then the shape or occasion. No promotional words, no all caps, no price.',
  feedDescription:
    'The product description in Google Shopping. Two or three short sentences: what it is, who it is for, the occasions. Add that the wording is personalized and it holds a 4x6 photo only once. No promotional claims you can\'t back, no all caps.',
};

const SYSTEM = `You write search copy for Butterlu, a small shop that makes one personalized picture frame (scalloped or rounded) with the customer's own words printed on each side. Every ready-made design can be bought as shown or changed in a live preview.

Voice: short, warm, plain and specific, like a person who makes gifts, not an ad. Say less: no long paragraphs, and don't restate the obvious (that a frame is personalized, that you can see it before you buy, the price) unless the field needs it. Use the words shoppers type. No exclamation marks, no emoji, no "perfect gift", "unique", "cherish" or "keepsake" more than once, no superlatives you can't prove, no em dashes.

Use only the facts you are given. Never invent reviews, ratings, delivery dates, materials or discounts. Each option must be a different angle, not the same sentence reworded, and must not repeat a title already used elsewhere in the store.`;

const SCHEMA = {
  type: 'object',
  properties: {
    options: { type: 'array', items: { type: 'string' } },
  },
  required: ['options'],
  additionalProperties: false,
} as const;

function facts(req: DraftRequest): string {
  const { item, doc } = req;
  const lines: string[] = [
    `Shop: ${SHOP.name}. Price: $${FRAME_PRICE_CENTS / 100}. ${SHOP.shipping}. ${SHOP.photoNote} ${SHOP.dispatch}.`,
  ];
  const s = (v: unknown) => (typeof v === 'string' ? v : '');
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  if (req.kind === 'template') {
    const recipients = new Map(doc.taxonomy.groups.flatMap((g) => g.children.map((r) => [r.key, `${r.label} (${g.label})`] as const)));
    const occasions = new Map(doc.taxonomy.occasions.map((o) => [o.key, o.label]));
    const categories = new Map(doc.categories.map((c) => [c.handle, c.name]));
    lines.push(`Ready-made design: ${s(item.name)}`);
    lines.push(`Who it's for: ${recipients.get(s(item.for)) ?? 'not set'}`);
    const occ = list(item.occasions).map((k) => occasions.get(k) ?? k);
    if (occ.length) lines.push(`Occasions: ${occ.join(', ')}`);
    const cats = list(item.collections).map((h) => categories.get(h) ?? h);
    if (cats.length) lines.push(`Shown on category pages: ${cats.join(', ')}`);
    try {
      lines.push(`The design: ${describeDesign(item.preset as never)}`);
    } catch {
      /* an unfinished preset just leaves this out */
    }
    if (s(item.intro)) lines.push(`Intro on the page: ${s(item.intro)}`);
    const goodFor = list(item.goodFor);
    if (goodFor.length) lines.push(`Good for: ${goodFor.join('; ')}`);
  } else {
    lines.push(`Category page: ${s(item.name)}`);
    if (s(item.intro)) lines.push(`Intro: ${s(item.intro)}`);
    const body = list(item.body).join(' ');
    if (body) lines.push(`Page copy: ${body.slice(0, 1500)}`);
    const order = list(item.order);
    const names = order
      .map((h) => doc.templates.find((t) => t.handle === h)?.name)
      .filter(Boolean)
      .slice(0, 12);
    if (names.length) lines.push(`Designs on the page: ${names.join(', ')}`);
  }
  return lines.join('\n');
}

function usedTitles(req: DraftRequest): string[] {
  const self = String(req.item.handle ?? '');
  return [...req.doc.templates.filter((t) => t.handle !== self && t.status === 'live'), ...req.doc.categories.filter((c) => c.handle !== self)]
    .map((x) => x.seo.seoTitle.value)
    .filter(Boolean);
}

/** The prompt, split out so a test can check it without calling the API. */
export function draftPrompt(req: DraftRequest): string {
  const limit = SEO_LIMITS[req.field];
  const parts = [
    `Write 3 options for this field: ${SEO_LABELS[req.field]}.`,
    GUIDE[req.field],
    `Hard limit: ${limit} characters per option, counting spaces. Stay under it.`,
    '',
    'Facts:',
    facts(req),
  ];
  if (req.field === 'seoTitle' || req.field === 'feedTitle') {
    const used = usedTitles(req);
    if (used.length) parts.push('', 'Titles already used in the store (do not reuse or near-copy):', ...used.map((t) => `- ${t}`));
  }
  return parts.join('\n');
}

/** Keeps options that fit: in the limit, no markup, no duplicates. */
export function cleanOptions(raw: unknown, field: SeoKey): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  for (const o of list) {
    if (typeof o !== 'string') continue;
    const v = o.replace(/\s+/g, ' ').trim().replace(/^["“]|["”]$/g, '');
    if (!v || v.length > SEO_LIMITS[field] || /[<>]/.test(v)) continue;
    if (out.some((x) => x.toLowerCase() === v.toLowerCase())) continue;
    out.push(v);
  }
  return out.slice(0, 3);
}

export async function draftSeo(env: Env, req: DraftRequest, client?: Pick<Anthropic, 'beta'>): Promise<DraftResult> {
  if (!env.ANTHROPIC_API_KEY && !client) return { ok: false, status: 503, error: 'Claude drafts are not switched on yet (no API key on this site).' };
  const model = env.SEO_MODEL || DEFAULT_SEO_MODEL;
  const api = client ?? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  let res;
  try {
    res = await api.beta.messages.create({
      model,
      // Thinking counts against max_tokens; a short task at low effort stays far under this.
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [{ role: 'user', content: draftPrompt(req) }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    });
  } catch (e) {
    console.error('seo draft', e instanceof Error ? e.message : e);
    return { ok: false, status: 502, error: "Claude couldn't be reached. Try again in a minute." };
  }
  if (res.stop_reason === 'refusal') return { ok: false, status: 422, error: 'Claude declined to write this one. Write it by hand.' };
  if (res.stop_reason === 'max_tokens') return { ok: false, status: 502, error: 'Claude ran out of room before finishing. Try again.' };
  const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, status: 502, error: "Claude's answer didn't come back whole. Try again." };
  }
  const options = cleanOptions((parsed as { options?: unknown }).options, req.field);
  if (!options.length) return { ok: false, status: 502, error: 'None of the options fit the length limit. Try again.' };
  return { ok: true, options, model: res.model ?? model };
}

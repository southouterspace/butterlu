// Store admin API (docs/13): /api/admin/*. Asli's edits (designs, categories, shop-by
// lists and page components) are saved as drafts in D1
// over the live catalog (src/catalog/doc.ts); nothing here changes what the store
// shows. Publishing writes the merged catalog to git and waits on the catalog
// handover (docs/13 "Catalog handover").
//
// Every route here is reached only after admin.ts has signed the request in.
import { BACKGROUNDS, FONTS } from '@butterlu/frame';
import { TEXT_COLORS, parseDesign } from '@butterlu/frame/design';
import { checkCatalog, checkCategory, checkTaxonomyLabels, checkTemplate, HANDLE, SEO_LIMITS, type SeoKey } from '../src/catalog/check';
import {
  CATEGORY_SEO,
  TEMPLATE_SEO,
  liveCatalog,
  type CatalogDoc,
  type CategoryDoc,
  type SeoField,
  type TaxonomyDoc,
  type TemplateDoc,
} from '../src/catalog/doc';
import { PAGE_KEYS, checkPage, checkQuestions, pageFrom, questionsFrom, type PageDoc, type QuestionDoc } from '../src/catalog/pages';
import { isIllustration } from '../src/catalog/illustrations';
import { signInMode } from './admin-auth';
import type { Env } from './env';
import { draftSeo, seoReady } from './seo-draft';

/** Same statements as migrations/0002_catalog.sql (a unit test keeps them equal). */
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS catalog_drafts (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, base TEXT, updated_at TEXT NOT NULL, updated_by TEXT, PRIMARY KEY (kind, id))`,
  `CREATE TABLE IF NOT EXISTS catalog_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, by TEXT, kind TEXT NOT NULL, item_id TEXT NOT NULL, action TEXT NOT NULL, detail TEXT)`,
  `CREATE INDEX IF NOT EXISTS catalog_log_at ON catalog_log (at DESC)`,
  `CREATE TABLE IF NOT EXISTS seo_suggestions (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, by TEXT, kind TEXT NOT NULL, item_id TEXT NOT NULL, field TEXT NOT NULL, model TEXT, options TEXT NOT NULL)`,
];

const ready = new WeakMap<D1Database, Promise<unknown>>();
/** Creates the admin tables once per database per isolate. */
export function ensureSchema(db: D1Database): Promise<unknown> {
  let p = ready.get(db);
  if (!p) {
    p = db.batch(SCHEMA.map((s) => db.prepare(s))).catch((e) => {
      ready.delete(db);
      throw e;
    });
    ready.set(db, p);
  }
  return p;
}

type Kind = 'template' | 'category' | 'taxonomy' | 'page' | 'questions';
interface DraftRow {
  kind: Kind;
  id: string;
  data: string;
  /** The live item when the draft was saved, to tell when the site changed under it. */
  base?: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface Change {
  kind: Kind;
  id: string;
  name: string;
  /** new: not in the live catalog yet. */
  isNew: boolean;
  /** The live site changed this item after the draft was saved: review before publishing. */
  stale: boolean;
  at: string;
  by: string | null;
}

/** The live catalog with every saved draft laid over it. */
export function mergeDrafts(live: CatalogDoc, rows: DraftRow[]): { doc: CatalogDoc; changes: Change[] } {
  const doc = structuredClone(live);
  const changes: Change[] = [];
  const stale = (row: DraftRow, liveItem: unknown) => liveItem !== undefined && (row.base ?? null) !== null && row.base !== JSON.stringify(liveItem);
  for (const row of rows) {
    let data: unknown;
    try {
      data = JSON.parse(row.data);
    } catch {
      continue;
    }
    const at = row.updated_at;
    const by = row.updated_by;
    if (row.kind === 'template') {
      const t = data as TemplateDoc;
      const i = doc.templates.findIndex((x) => x.handle === row.id);
      const liveItem = live.templates.find((x) => x.handle === row.id);
      if (i >= 0) doc.templates[i] = t;
      else doc.templates.push(t);
      changes.push({ kind: 'template', id: row.id, name: t.name, isNew: i < 0, stale: stale(row, liveItem), at, by });
    } else if (row.kind === 'category') {
      const c = data as CategoryDoc;
      const i = doc.categories.findIndex((x) => x.handle === row.id);
      if (i < 0) continue;
      doc.categories[i] = c;
      changes.push({ kind: 'category', id: row.id, name: c.name, isNew: false, stale: stale(row, live.categories[i]), at, by });
    } else if (row.kind === 'taxonomy' && row.id === 'all') {
      const tax = data as TaxonomyDoc;
      // Keep anything the site added in code since: a person or occasion missing from
      // the draft would leave designs tagged with it pointing nowhere.
      for (const g of live.taxonomy.groups) {
        const dg = tax.groups.find((x) => x.key === g.key);
        if (!dg) tax.groups.push(structuredClone(g));
        else {
          for (const c of g.children) if (!dg.children.some((x) => x.key === c.key)) dg.children.push(structuredClone(c));
          // A draft saved before drawings existed has no field at all: take the site's.
          // "No drawing" saves as "", so her choice of none is kept.
          if (dg.illustration === undefined && g.illustration) dg.illustration = g.illustration;
        }
      }
      for (const o of live.taxonomy.occasions) {
        const d = tax.occasions.find((x) => x.key === o.key);
        if (!d) tax.occasions.push(structuredClone(o));
        else if (d.illustration === undefined && o.illustration) d.illustration = o.illustration;
      }
      doc.taxonomy = tax;
      changes.push({ kind: 'taxonomy', id: 'all', name: 'Shop-by lists', isNew: false, stale: stale(row, live.taxonomy), at, by });
    } else if (row.kind === 'page') {
      const i = doc.pages.findIndex((x) => x.key === row.id);
      if (i < 0) continue;
      const p = { ...(data as PageDoc), key: row.id, name: doc.pages[i]!.name };
      doc.pages[i] = p;
      changes.push({ kind: 'page', id: row.id, name: p.name, isNew: false, stale: stale(row, live.pages[i]), at, by });
    } else if (row.kind === 'questions' && row.id === 'all') {
      doc.questions = data as QuestionDoc[];
      changes.push({ kind: 'questions', id: 'all', name: 'Questions', isNew: false, stale: stale(row, live.questions), at, by });
    }
  }
  // A category lists every template filed under it: drop ones moved away, append new ones.
  for (const c of doc.categories) {
    const on = new Set(doc.templates.filter((t) => t.collections.includes(c.handle)).map((t) => t.handle));
    c.order = [...c.order.filter((h) => on.has(h)), ...[...on].filter((h) => !c.order.includes(h))];
  }
  changes.sort((a, b) => b.at.localeCompare(a.at));
  return { doc, changes };
}

async function loadDoc(db: D1Database) {
  await ensureSchema(db);
  const { results } = await db.prepare('SELECT kind, id, data, base, updated_at, updated_by FROM catalog_drafts').all<DraftRow>();
  const live = liveCatalog();
  return { ...mergeDrafts(live, results), live };
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
const fail = (status: number, error: string, details?: string[]) => json({ error, ...(details ? { details } : {}) }, status);

const MAX_BODY = 64 * 1024;
async function readJson(request: Request): Promise<unknown> {
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json')) throw new Error('send JSON');
  const text = await request.text();
  if (text.length > MAX_BODY) throw new Error('too large');
  return JSON.parse(text);
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Every option Claude has offered for an item, by field, to recognise its words on save. */
async function claudeOptions(db: D1Database, kind: Kind, id: string): Promise<Map<string, Set<string>>> {
  const { results } = await db.prepare('SELECT field, options FROM seo_suggestions WHERE kind = ?1 AND item_id = ?2').bind(kind, id).all<{ field: string; options: string }>();
  const out = new Map<string, Set<string>>();
  for (const r of results) {
    try {
      const set = out.get(r.field) ?? new Set<string>();
      for (const o of JSON.parse(r.options) as string[]) set.add(squash(o));
      out.set(r.field, set);
    } catch {
      /* skip a broken row */
    }
  }
  return out;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const strList = (v: unknown, max: number, each: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max).map((x) => x.slice(0, each)) : []);

/**
 * The SEO fields to save. Whether a value is Claude's is decided here, not by the form:
 * text that matches one of Claude's options for that field (ignoring spacing) stays a
 * draft until /seo/approve, whatever the form says. Anything else was written by the
 * person saving it.
 */
function seoFrom(raw: unknown, keys: readonly SeoKey[], before: Record<string, SeoField> | undefined, by: string, now: string, claude: Map<string, Set<string>> = new Map()) {
  const out: Record<string, SeoField> = {};
  const input = isRecord(raw) ? raw : {};
  for (const k of keys) {
    const f = isRecord(input[k]) ? input[k] : {};
    const value = str(f.value, SEO_LIMITS[k] + 200).trim();
    const prev = before?.[k];
    if (!value) {
      out[k] = { value: '', status: 'empty' };
    } else if (prev && prev.value === value) {
      // Unchanged text keeps its status: a draft stays a draft until it's approved.
      out[k] = prev;
    } else if ((f.status === 'draft' && f.source === 'claude') || claude.get(k)?.has(squash(value))) {
      // Claude's words, not approved yet.
      out[k] = { value, status: 'draft', source: 'claude', by, at: now };
    } else {
      // Typed or edited in the admin: the person saving it stands behind it.
      out[k] = { value, status: 'approved', source: 'hand', by, at: now };
    }
  }
  return out;
}

/** Builds a clean TemplateDoc from a request body. Unknown fields are dropped. */
export function templateFrom(raw: unknown, before: TemplateDoc | undefined, by: string, now: string, claude?: Map<string, Set<string>>): TemplateDoc {
  const r = isRecord(raw) ? raw : {};
  const status = r.status === 'live' || r.status === 'hidden' ? r.status : 'draft';
  const ideas = Array.isArray(r.ideas)
    ? r.ideas.filter(isRecord).slice(0, 12).map((i) => {
        const idea: Record<string, string> = {};
        for (const side of ['top', 'right', 'bottom', 'left']) if (typeof i[side] === 'string' && (i[side] as string).trim()) idea[side] = (i[side] as string).trim().slice(0, 80);
        return idea;
      }).filter((i) => Object.keys(i).length)
    : [];
  return {
    handle: str(r.handle, 100),
    name: str(r.name, 120).trim(),
    status,
    hasPage: before?.hasPage ?? false,
    // Stored normalised, so only fields the frame code knows are kept (background size and
    // position included). The route refuses a preset that doesn't parse, so the raw one
    // is never stored.
    preset: ((d) => (d.ok ? d.spec : r.preset))(parseDesign(r.preset)) as TemplateDoc['preset'],
    for: str(r.for, 60),
    occasions: [...new Set(strList(r.occasions, 20, 60))],
    collections: [...new Set(strList(r.collections, 20, 100))],
    readyAsShown: r.readyAsShown === true,
    intro: str(r.intro, 500).trim(),
    goodFor: strList(r.goodFor, 6, 80).map((s) => s.trim()).filter(Boolean),
    ideas,
    seo: seoFrom(r.seo, TEMPLATE_SEO, before?.seo, by, now, claude) as TemplateDoc['seo'],
  };
}

export function categoryFrom(raw: unknown, before: CategoryDoc, by: string, now: string, claude?: Map<string, Set<string>>): CategoryDoc {
  const r = isRecord(raw) ? raw : {};
  return {
    handle: before.handle,
    name: str(r.name, 80).trim(),
    intro: str(r.intro, 500).trim(),
    body: strList(r.body, 8, 1500).map((s) => s.trim()).filter(Boolean),
    related: strList(r.related, 10, 100),
    order: strList(r.order, 200, 100),
    seo: seoFrom(r.seo, CATEGORY_SEO, before.seo, by, now, claude) as CategoryDoc['seo'],
  };
}

/** A drawing the site has, or "" for one she cleared; anything else is left unset. */
const illustrationFrom = (v: unknown): { illustration?: string } => (isIllustration(v) || v === '' ? { illustration: v } : {});

export function taxonomyFrom(raw: unknown): TaxonomyDoc {
  const r = isRecord(raw) ? raw : {};
  const groups = Array.isArray(r.groups)
    ? r.groups.filter(isRecord).slice(0, 30).map((g) => ({
        key: str(g.key, 60),
        label: str(g.label, 60).trim(),
        collection: str(g.collection, 100),
        inMenus: g.inMenus !== false,
        ...illustrationFrom(g.illustration),
        children: (Array.isArray(g.children) ? g.children.filter(isRecord) : []).slice(0, 20).map((c) => ({
          key: str(c.key, 60),
          label: str(c.label, 60).trim(),
          ...(typeof c.hint === 'string' && c.hint.trim() ? { hint: c.hint.trim().slice(0, 80) } : {}),
        })),
      }))
    : [];
  const occasions = Array.isArray(r.occasions)
    ? r.occasions.filter(isRecord).slice(0, 40).map((o) => ({
        key: str(o.key, 60),
        label: str(o.label, 60).trim(),
        ...(typeof o.collection === 'string' && o.collection ? { collection: o.collection.slice(0, 100) } : {}),
        ...illustrationFrom(o.illustration),
      }))
    : [];
  return { groups, occasions };
}

async function save(db: D1Database, kind: Kind, id: string, data: unknown, base: unknown, by: string, now: string, action = 'save', detail?: string) {
  await db.batch([
    db
      .prepare(
        `INSERT INTO catalog_drafts (kind, id, data, base, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT (kind, id) DO UPDATE SET data = excluded.data, base = COALESCE(catalog_drafts.base, excluded.base), updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
      )
      .bind(kind, id, JSON.stringify(data), base === undefined ? null : JSON.stringify(base), now, by),
    db.prepare('INSERT INTO catalog_log (at, by, kind, item_id, action, detail) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(now, by, kind, id, action, detail ?? null),
  ]);
}

function options() {
  return {
    backgrounds: BACKGROUNDS.map((b) => ({ id: b.id, name: b.name, defaultTextColor: b.defaultTextColor })),
    fonts: FONTS.map((f) => ({ id: f.id, name: f.name })),
    textColors: TEXT_COLORS,
    limits: SEO_LIMITS,
  };
}

/** Handles /api/admin/*. `by` is the signed-in name. */
export async function handleCatalogAdmin(request: Request, env: Env, db: D1Database, by: string): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/admin/, '');
  const method = request.method;
  const now = new Date().toISOString();
  if (method !== 'GET' && request.headers.get('origin') !== url.origin) return fail(403, 'forbidden');

  try {
    if (path === '/catalog' && method === 'GET') {
      const { doc, changes, live } = await loadDoc(db);
      return json({
        doc,
        liveHandles: { templates: live.templates.map((t) => t.handle), categories: live.categories.map((c) => c.handle) },
        changes,
        check: checkCatalog(doc),
        setup: { claude: seoReady(env), publish: false, signIn: signInMode(env).mode },
        ...options(),
        me: by,
      });
    }

    let m = /^\/templates\/([a-z0-9-]{1,100})$/.exec(path);
    if (m && method === 'PUT') {
      const { doc, live } = await loadDoc(db);
      const handle = m[1]!;
      const before = doc.templates.find((t) => t.handle === handle);
      const raw = await readJson(request);
      const design = parseDesign(isRecord(raw) ? raw.preset : undefined);
      if (!design.ok) return fail(422, 'Fix the design first', design.errors);
      const t = templateFrom(raw, before, by, now, await claudeOptions(db, 'template', handle));
      if (t.handle !== handle) return fail(400, 'the web address name in the body does not match');
      if (!before && !HANDLE.test(handle)) return fail(400, 'bad web address name');
      const result = checkTemplate(t, doc);
      // Drafts and hidden templates may be saved unfinished; a live one must pass, except
      // for search copy still waiting on approval (a publish refuses that anyway).
      const blocking =
        t.status === 'live'
          ? result.errors.filter((e) => !/isn't approved/.test(e))
          : result.errors.filter((e) => /web address|taken|unknown|characters|can't contain|Title Case/.test(e));
      if (blocking.length) return fail(422, 'Fix these first', blocking);
      await save(db, 'template', handle, t, live.templates.find((x) => x.handle === handle), by, now, before ? 'save' : 'create');
      return json({ ok: true, template: t, check: result });
    }

    m = /^\/categories\/([a-z0-9-]{1,100})$/.exec(path);
    if (m && method === 'PUT') {
      const { doc, live } = await loadDoc(db);
      const before = doc.categories.find((c) => c.handle === m![1]);
      if (!before) return fail(404, 'no such category');
      const c = categoryFrom(await readJson(request), before, by, now, await claudeOptions(db, 'category', before.handle));
      const result = checkCategory(c, doc.templates);
      const blocking = result.errors.filter((e) => !/is missing|isn't approved/.test(e));
      if (blocking.length) return fail(422, 'Fix these first', blocking);
      await save(db, 'category', c.handle, c, live.categories.find((x) => x.handle === c.handle), by, now);
      return json({ ok: true, category: c, check: result });
    }

    if (path === '/taxonomy' && method === 'PUT') {
      const { doc, live } = await loadDoc(db);
      const taxonomy = taxonomyFrom(await readJson(request));
      const result = checkCatalog({ ...doc, taxonomy });
      const blocking = [...result.errors.filter((e) => /Shop-by key|opens unknown|give the group/.test(e)), ...checkTaxonomyLabels(taxonomy)];
      if (blocking.length) return fail(422, 'Fix these first', blocking);
      await save(db, 'taxonomy', 'all', taxonomy, live.taxonomy, by, now);
      return json({ ok: true, taxonomy, check: result });
    }

    m = /^\/pages\/([a-z0-9-]{1,40})$/.exec(path);
    if (m && method === 'PUT') {
      const { doc, live } = await loadDoc(db);
      const before = (PAGE_KEYS as readonly string[]).includes(m[1]!) ? doc.pages.find((p) => p.key === m![1]) : undefined;
      if (!before) return fail(404, 'no such page');
      const page = pageFrom(await readJson(request), before);
      // The Worker can't see which photo files exist; the build checks that, and refuses a missing one.
      const blocking = checkPage(page);
      if (blocking.length) return fail(422, 'Fix these first', blocking);
      await save(db, 'page', page.key, page, live.pages.find((p) => p.key === page.key), by, now);
      return json({ ok: true, page });
    }

    if (path === '/questions' && method === 'PUT') {
      const { live } = await loadDoc(db);
      const questions = questionsFrom(await readJson(request));
      const blocking = checkQuestions(questions);
      if (blocking.length) return fail(422, 'Fix these first', blocking);
      await save(db, 'questions', 'all', questions, live.questions, by, now);
      return json({ ok: true, questions });
    }

    m = /^\/drafts\/(template|category|taxonomy|page|questions)\/([a-z0-9-]{1,100})$/.exec(path);
    if (m && method === 'DELETE') {
      await ensureSchema(db);
      await db.batch([
        db.prepare('DELETE FROM catalog_drafts WHERE kind = ?1 AND id = ?2').bind(m[1], m[2]),
        db.prepare('INSERT INTO catalog_log (at, by, kind, item_id, action) VALUES (?1, ?2, ?3, ?4, ?5)').bind(now, by, m[1], m[2], 'discard'),
      ]);
      return json({ ok: true });
    }

    if (path === '/seo/approve' && method === 'POST') {
      const body = await readJson(request);
      if (!isRecord(body)) return fail(400, 'bad request');
      const { doc, live } = await loadDoc(db);
      const field = String(body.field) as SeoKey;
      const target =
        body.kind === 'template' ? doc.templates.find((t) => t.handle === body.id) : body.kind === 'category' ? doc.categories.find((c) => c.handle === body.id) : undefined;
      const seo = target?.seo as Record<string, SeoField> | undefined;
      if (!target || !seo || !(field in seo)) return fail(404, 'nothing to approve');
      const f = seo[field]!;
      if (!f.value) return fail(400, 'the field is empty');
      if (f.value.length > SEO_LIMITS[field]) return fail(422, `It's ${f.value.length} characters; ${SEO_LIMITS[field]} at most`);
      seo[field] = { ...f, status: 'approved', by, at: now };
      const kind = body.kind as Kind;
      const id = kind === 'template' ? (target as TemplateDoc).handle : (target as CategoryDoc).handle;
      await save(db, kind, id, target, kind === 'template' ? live.templates.find((x) => x.handle === id) : live.categories.find((x) => x.handle === id), by, now, 'approve', field);
      return json({ ok: true, field: seo[field] });
    }

    if (path === '/seo/draft' && method === 'POST') {
      const body = await readJson(request);
      if (!isRecord(body)) return fail(400, 'bad request');
      const { doc } = await loadDoc(db);
      const field = String(body.field) as SeoKey;
      if (!(field in SEO_LIMITS)) return fail(400, 'unknown field');
      // Draft from what's on the form, so unsaved edits count.
      const kind = body.kind === 'category' ? 'category' : 'template';
      const item = isRecord(body.item) ? body.item : undefined;
      const fallback = kind === 'template' ? doc.templates.find((t) => t.handle === body.id) : doc.categories.find((c) => c.handle === body.id);
      const subject = (item ?? fallback) as Record<string, unknown> | undefined;
      if (!subject) return fail(404, 'nothing to draft for');
      const result = await draftSeo(env, { kind, field, item: subject, doc });
      if (!result.ok) return fail(result.status, result.error);
      await ensureSchema(db);
      await db
        .prepare('INSERT INTO seo_suggestions (at, by, kind, item_id, field, model, options) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)')
        .bind(now, by, kind, String(body.id ?? ''), field, result.model, JSON.stringify(result.options))
        .run();
      return json({ ok: true, options: result.options });
    }

    if (path === '/export' && method === 'GET') {
      // What a publish would write, for review. The handover decides where it goes.
      const { doc } = await loadDoc(db);
      return json({ doc, check: checkCatalog(doc) });
    }
  } catch (e) {
    if (e instanceof SyntaxError || (e instanceof Error && /send JSON|too large/.test(e.message))) return fail(400, e.message);
    console.error('admin api', e);
    return fail(500, 'Something went wrong saving that. Try again.');
  }
  return fail(404, 'not found');
}

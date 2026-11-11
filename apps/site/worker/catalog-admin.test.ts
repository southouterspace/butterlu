import { Database } from 'bun:sqlite';
import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { checkCatalog, toLabel } from '../src/catalog/check';
import { liveCatalog, type TemplateDoc } from '../src/catalog/doc';
import { handleAdmin, signedInName } from './admin';
import { SCHEMA, mergeDrafts } from './catalog-admin';
import type { Env } from './env';
import { cleanOptions, draftPrompt, draftSeo } from './seo-draft';

/** Just enough of D1 over bun:sqlite for the admin's queries. */
function fakeD1(): D1Database {
  const db = new Database(':memory:');
  const stmt = (sql: string, args: unknown[] = []) => ({
    bind: (...a: unknown[]) => stmt(sql, a),
    all: async () => ({ results: db.query(sql).all(...(args as [])) }),
    run: async () => (db.query(sql).run(...(args as [])), { success: true }),
    first: async () => db.query(sql).get(...(args as [])),
    _exec: () => db.query(sql).run(...(args as [])),
  });
  return {
    prepare: (sql: string) => stmt(sql),
    batch: async (list: ReturnType<typeof stmt>[]) => db.transaction(() => list.map((s) => s._exec()))(),
  } as unknown as D1Database;
}

const basic = (user: string, pass: string) => ({ authorization: `Basic ${btoa(`${user}:${pass}`)}` });
const ORIGIN = 'https://s.test';

function setup(extra: Partial<Env> = {}) {
  const assets = { fetch: async (r: Request) => new Response(`page ${new URL(r.url).pathname}`, { headers: { 'content-type': 'text/html' } }) } as unknown as Fetcher;
  const env = { ASSETS: assets, ADMIN_PASSWORD: 'pw', ORDERS: fakeD1(), ...extra } as Env;
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = (await handleAdmin(
      new Request(`${ORIGIN}${path}`, {
        method,
        headers: { ...basic('Asli', 'pw'), ...(body ? { 'content-type': 'application/json', origin: ORIGIN } : method !== 'GET' ? { origin: ORIGIN } : {}), ...headers },
        body: body ? JSON.stringify(body) : undefined,
      }),
      env,
    ))!;
    return { status: res.status, body: (res.headers.get('content-type') ?? '').includes('json') ? ((await res.json()) as Record<string, any>) : await res.text() };
  };
  return { env, call };
}

const newTemplate = (over: Partial<TemplateDoc> = {}): TemplateDoc => {
  const live = liveCatalog();
  const base = live.templates[0]!;
  return {
    ...structuredClone(base),
    handle: 'aunt-picture-frame',
    name: 'Aunt Picture Frame',
    status: 'draft',
    hasPage: false,
    ideas: [],
    seo: {
      seoTitle: { value: '', status: 'empty' },
      seoDescription: { value: '', status: 'empty' },
      altText: { value: '', status: 'empty' },
      feedTitle: { value: '', status: 'empty' },
      feedDescription: { value: '', status: 'empty' },
    },
    ...over,
  };
};

test('the migration file and the statements the Worker runs agree', () => {
  const file = readFileSync(new URL('../migrations/0002_catalog.sql', import.meta.url), 'utf8')
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').trim())
    .filter(Boolean);
  const norm = SCHEMA.map((s) => s.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').trim());
  expect(norm).toEqual(file);
});

test('the live catalog passes the checks the admin applies', () => {
  // Labels on the live site are moving to the Title Case rule in the storefront's own
  // work; the admin reports any that haven't yet and holds new ones to it.
  const r = checkCatalog(liveCatalog());
  expect(r.errors.filter((e) => !e.includes('Title Case'))).toEqual([]);
});

test('labels are Title Case with "&" for "and"', () => {
  expect(toLabel('baptisms and christenings')).toBe('Baptisms & Christenings');
  expect(toLabel('gifts for dad')).toBe('Gifts for Dad');
  expect(toLabel('for the bride')).toBe('For the Bride');
  expect(toLabel('Mother’s day')).toBe('Mother’s Day');
  expect(toLabel('great-grandparents  frames')).toBe('Great-Grandparents Frames');
  expect(toLabel('Just Because')).toBe('Just Because');
  expect(toLabel('what to do with')).toBe('What to Do With');
});

test('a shop-by list with a label off the rule is refused', async () => {
  const { call } = setup();
  const tax = structuredClone(liveCatalog().taxonomy);
  for (const g of tax.groups) {
    g.label = toLabel(g.label);
    for (const c of g.children) c.label = toLabel(c.label);
  }
  for (const o of tax.occasions) o.label = toLabel(o.label);
  expect((await call('PUT', '/api/admin/taxonomy', tax)).status).toBe(200);
  tax.occasions[0]!.label = 'baptisms and christenings';
  const bad = await call('PUT', '/api/admin/taxonomy', tax);
  expect(bad.status).toBe(422);
  expect(bad.body.details.join(' ')).toContain('Baptisms & Christenings');
});

test('drafts lay over the live catalog and category order follows the filing', () => {
  const live = liveCatalog();
  const cat = live.categories.find((c) => c.order.length > 1)!;
  const moved = structuredClone(live.templates.find((t) => t.handle === cat.order[0])!);
  moved.collections = moved.collections.filter((c) => c !== cat.handle);
  const added = newTemplate({ collections: [cat.handle] });
  const { doc, changes } = mergeDrafts(live, [
    { kind: 'template', id: moved.handle, data: JSON.stringify(moved), updated_at: '2026-11-11T10:00:00Z', updated_by: 'Asli' },
    { kind: 'template', id: added.handle, data: JSON.stringify(added), updated_at: '2026-11-11T11:00:00Z', updated_by: 'Asli' },
    { kind: 'template', id: 'broken', data: '{nope', updated_at: '2026-11-11T12:00:00Z', updated_by: null },
  ]);
  const order = doc.categories.find((c) => c.handle === cat.handle)!.order;
  expect(order).not.toContain(moved.handle);
  expect(order.at(-1)).toBe(added.handle);
  expect(changes.map((c) => [c.id, c.isNew])).toEqual([
    [added.handle, true],
    [moved.handle, false],
  ]);
  // The live catalog itself is untouched.
  expect(live.templates.find((t) => t.handle === moved.handle)!.collections).toContain(cat.handle);
});

test('the editor and its API need the admin sign-in', async () => {
  const { env } = setup();
  for (const path of ['/admin/catalog', '/api/admin/catalog']) {
    const res = (await handleAdmin(new Request(`${ORIGIN}${path}`), env))!;
    expect(res.status).toBe(401);
    expect(await res.text()).not.toContain('page');
  }
  // Off where there's no database or password (production today).
  expect((await handleAdmin(new Request(`${ORIGIN}/api/admin/catalog`, { headers: basic('a', 'pw') }), { ...env, ORDERS: undefined }))!.status).toBe(404);
  const { call } = setup();
  const page = await call('GET', '/admin/catalog');
  expect(page.status).toBe(200);
  expect(page.body).toBe('page /admin/catalog');
  expect((await call('GET', '/admin')).status).toBe(303);
});

test('the signed-in name is recorded, cleaned', () => {
  expect(signedInName(new Request(ORIGIN, { headers: basic('Asli', 'x') }))).toBe('Asli');
  expect(signedInName(new Request(ORIGIN, { headers: basic('<b>', 'x') }))).toBe('b');
  expect(signedInName(new Request(ORIGIN, { headers: basic('', 'x') }))).toBe('admin');
});

test('GET catalog returns the live catalog with no changes', async () => {
  const { call } = setup();
  const { status, body } = await call('GET', '/api/admin/catalog');
  expect(status).toBe(200);
  expect(body.doc.templates.length).toBe(liveCatalog().templates.length);
  expect(body.changes).toEqual([]);
  expect(body.setup).toEqual({ claude: false, publish: false });
  expect(body.me).toBe('Asli');
});

test('a new design saves as a draft, then must pass the checks to go live', async () => {
  const { call } = setup();
  const t = newTemplate();
  const saved = await call('PUT', `/api/admin/templates/${t.handle}`, t);
  expect(saved.status).toBe(200);
  expect(saved.body.template.hasPage).toBe(false);
  let cat = await call('GET', '/api/admin/catalog');
  expect(cat.body.changes[0]).toMatchObject({ id: t.handle, isNew: true, by: 'Asli' });

  const bad = await call('PUT', `/api/admin/templates/${t.handle}`, { ...t, status: 'live', occasions: [], collections: [] });
  expect(bad.status).toBe(422);
  expect(bad.body.details.join(' ')).toContain('at least one occasion');

  // Discarding a new design removes it.
  expect((await call('DELETE', `/api/admin/drafts/template/${t.handle}`)).status).toBe(200);
  cat = await call('GET', '/api/admin/catalog');
  expect(cat.body.doc.templates.some((x: TemplateDoc) => x.handle === t.handle)).toBe(false);
});

test("a web address name that doesn't match, or a bad preset, is refused", async () => {
  const { call } = setup();
  const t = newTemplate();
  expect((await call('PUT', '/api/admin/templates/other-name', t)).status).toBe(400);
  const r = await call('PUT', `/api/admin/templates/${t.handle}`, { ...t, preset: { shape: 'triangle', backgroundId: 'x', sides: {} } });
  expect(r.status).toBe(422);
});

test('writes from another site are refused', async () => {
  const { call } = setup();
  const t = newTemplate();
  const r = await call('PUT', `/api/admin/templates/${t.handle}`, t, { origin: 'https://evil.test' });
  expect(r.status).toBe(403);
});

test("Claude's picked wording stays a draft until Asli approves it", async () => {
  const { call } = setup();
  const live = liveCatalog();
  const c = structuredClone(live.categories[0]!);
  c.name = toLabel(c.name);
  const picked = { ...c, seo: { ...c.seo, seoTitle: { value: 'Personalized Gift Frames for Everyone', status: 'draft', source: 'claude' } } };
  const saved = await call('PUT', `/api/admin/categories/${c.handle}`, picked);
  expect(saved.status).toBe(200);
  expect(saved.body.category.seo.seoTitle).toMatchObject({ status: 'draft', source: 'claude' });
  let cat = await call('GET', '/api/admin/catalog');
  expect(cat.body.check.errors.join(' ')).toContain("isn't approved yet");

  // Saving again without touching it doesn't approve it.
  const again = await call('PUT', `/api/admin/categories/${c.handle}`, { ...picked, seo: { ...picked.seo, seoTitle: { value: picked.seo.seoTitle.value, status: 'approved' } } });
  expect(again.body.category.seo.seoTitle.status).toBe('draft');

  const ok = await call('POST', '/api/admin/seo/approve', { kind: 'category', id: c.handle, field: 'seoTitle' });
  expect(ok.status).toBe(200);
  expect(ok.body.field).toMatchObject({ status: 'approved', by: 'Asli' });
  cat = await call('GET', '/api/admin/catalog');
  expect(cat.body.check.errors.join(' ')).not.toContain("isn't approved yet");
});

test('wording she types herself counts as hers', async () => {
  const { call } = setup();
  const c = structuredClone(liveCatalog().categories[0]!);
  c.name = toLabel(c.name);
  const r = await call('PUT', `/api/admin/categories/${c.handle}`, { ...c, seo: { ...c.seo, seoTitle: { value: 'Hand Written Title', status: 'draft', source: 'hand' } } });
  expect(r.body.category.seo.seoTitle).toMatchObject({ status: 'approved', source: 'hand', by: 'Asli' });
});

test('Claude drafts are off without a key, and say so', async () => {
  const { call } = setup();
  const r = await call('POST', '/api/admin/seo/draft', { kind: 'category', id: liveCatalog().categories[0]!.handle, field: 'seoDescription' });
  expect(r.status).toBe(503);
});

test('the prompt carries the facts, the limit and the titles already in use', () => {
  const doc = liveCatalog();
  const t = doc.templates[0]!;
  const p = draftPrompt({ kind: 'template', field: 'seoTitle', item: t as unknown as Record<string, unknown>, doc });
  expect(p).toContain(t.name);
  expect(p).toContain('49 characters');
  expect(p).toContain('Free shipping in the US');
  expect(p).toContain(doc.categories[0]!.seo.seoTitle.value);
  expect(p).not.toContain(`- ${t.seo.seoTitle.value}\n`);
});

test('options over the limit, with markup or repeated, are dropped', () => {
  expect(cleanOptions(['Nana Picture Frame', 'nana picture frame', 'x'.repeat(50), '<b>Hi</b>', 3, '  "Mimi  Frame" '], 'seoTitle')).toEqual(['Nana Picture Frame', 'Mimi Frame']);
});

test('draftSeo returns cleaned options and handles a refusal', async () => {
  const doc = liveCatalog();
  const req = { kind: 'category' as const, field: 'seoDescription' as const, item: doc.categories[0] as unknown as Record<string, unknown>, doc };
  let sent: any;
  const client = (reply: any) => ({ beta: { messages: { create: async (p: any) => ((sent = p), reply) } } }) as any;
  const ok = await draftSeo({} as Env, req, client({ stop_reason: 'end_turn', model: 'claude-opus-5-5', content: [{ type: 'text', text: JSON.stringify({ options: ['A personalized frame for grandparents with your words, a live preview before you buy and free shipping in the US.'] }) }] }));
  expect(ok).toMatchObject({ ok: true, model: 'claude-opus-5-5' });
  expect(sent.model).toBe('claude-opus-5-5');
  expect(sent.output_config.format.type).toBe('json_schema');
  expect(sent.fallbacks).toBe('default');
  const refused = await draftSeo({} as Env, req, client({ stop_reason: 'refusal', content: [] }));
  expect(refused).toMatchObject({ ok: false, status: 422 });
  const garbled = await draftSeo({} as Env, req, client({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }] }));
  expect(garbled).toMatchObject({ ok: false, status: 502 });
});

test("Claude's words stay a draft even when the form says otherwise", async () => {
  const { env, call } = setup();
  const c = structuredClone(liveCatalog().categories[0]!);
  c.name = toLabel(c.name);
  const option = 'Personalized Frames for Grandparents';
  await env.ORDERS!.prepare('INSERT INTO seo_suggestions (at, by, kind, item_id, field, model, options) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)')
    .bind('2026-11-11T00:00:00Z', 'Asli', 'category', c.handle, 'seoTitle', 'm', JSON.stringify([option]))
    .run()
    .catch(async () => {
      // Tables are made on first use; make them, then insert.
      await call('GET', '/api/admin/catalog');
      await env.ORDERS!.prepare('INSERT INTO seo_suggestions (at, by, kind, item_id, field, model, options) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)')
        .bind('2026-11-11T00:00:00Z', 'Asli', 'category', c.handle, 'seoTitle', 'm', JSON.stringify([option]))
        .run();
    });
  const r = await call('PUT', `/api/admin/categories/${c.handle}`, { ...c, seo: { ...c.seo, seoTitle: { value: ` ${option}  `, status: 'approved', source: 'hand' } } });
  expect(r.body.category.seo.seoTitle).toMatchObject({ status: 'draft', source: 'claude' });
});

test('a live design with a Claude draft still saves, and the draft can be approved', async () => {
  const { call } = setup();
  const t = structuredClone(liveCatalog().templates[0]!);
  t.name = toLabel(t.name);
  t.seo.altText = { value: 'Personalized scalloped frame with Nana on top', status: 'draft', source: 'claude' };
  const r = await call('PUT', `/api/admin/templates/${t.handle}`, t);
  expect(r.status).toBe(200);
  expect(r.body.template.seo.altText.status).toBe('draft');
  const ok = await call('POST', '/api/admin/seo/approve', { kind: 'template', id: t.handle, field: 'altText' });
  expect(ok.body.field.status).toBe('approved');
});

test('a design that does not parse is never stored', async () => {
  const { call } = setup();
  const t = newTemplate();
  const bad = structuredClone(t) as any;
  bad.preset.sides.top = { text: 'Hi', fontId: bad.preset.sides.top?.fontId ?? 'great-vibes', color: '"><img src=x onerror=alert(1)>' };
  const r = await call('PUT', `/api/admin/templates/${t.handle}`, bad);
  expect(r.status).toBe(422);
  const cat = await call('GET', '/api/admin/catalog');
  expect(JSON.stringify(cat.body.doc)).not.toContain('onerror');
});

test('a draft is flagged when the site changes under it, and shop-by keeps what the site added', () => {
  const live = liveCatalog();
  const t = live.templates[0]!;
  const old = { ...structuredClone(t), intro: 'An older intro' };
  const tax = structuredClone(live.taxonomy);
  const dropped = tax.occasions.pop()!;
  const { doc, changes } = mergeDrafts(live, [
    { kind: 'template', id: t.handle, data: JSON.stringify(t), base: JSON.stringify(old), updated_at: '2026-11-11T10:00:00Z', updated_by: 'Asli' },
    { kind: 'taxonomy', id: 'all', data: JSON.stringify(tax), base: JSON.stringify(live.taxonomy), updated_at: '2026-11-11T09:00:00Z', updated_by: 'Asli' },
  ]);
  expect(changes.find((c) => c.kind === 'template')!.stale).toBe(true);
  expect(changes.find((c) => c.kind === 'taxonomy')!.stale).toBe(false);
  expect(doc.taxonomy.occasions.some((o) => o.key === dropped.key)).toBe(true);
});

test("a design's background size and position are kept", async () => {
  const { call } = setup();
  const t = newTemplate();
  t.preset = { ...t.preset, backgroundFit: { scale: 1.5, x: -0.5, y: 0.25 } };
  const r = await call('PUT', `/api/admin/templates/${t.handle}`, t);
  expect(r.status).toBe(200);
  expect(r.body.template.preset.backgroundFit).toEqual({ scale: 1.5, x: -0.5, y: 0.25 });
});

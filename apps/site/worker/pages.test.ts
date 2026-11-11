import { Database } from 'bun:sqlite';
import { expect, test } from 'bun:test';
import { liveCatalog } from '../src/catalog/doc';
import { checkPage, livePage, newSection, pageFrom, safeHref, type HeroImageSection, type ValuePropsSection } from '../src/catalog/pages';
import { handleAdmin } from './admin';
import type { Env } from './env';

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

const ORIGIN = 'https://s.test';
function setup() {
  const env = { ASSETS: { fetch: async () => new Response('page') } as unknown as Fetcher, ADMIN_PASSWORD: 'pw', ORDERS: fakeD1() } as Env;
  return async (method: string, path: string, body?: unknown) => {
    const res = (await handleAdmin(
      new Request(`${ORIGIN}${path}`, {
        method,
        headers: { authorization: `Basic ${btoa('Asli:pw')}`, ...(method !== 'GET' ? { origin: ORIGIN } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      }),
      env,
    ))!;
    return { status: res.status, body: (await res.json()) as Record<string, any> };
  };
}

test('the live homepage is a Hero Image, then three Value Props, and passes its checks', () => {
  const home = livePage('home');
  expect(home.sections.map((s) => s.type)).toEqual(['hero-image', 'value-props']);
  expect((home.sections[1] as ValuePropsSection).items).toHaveLength(3);
  expect(checkPage(home, new Set())).toEqual([]);
  expect(liveCatalog().pages.map((p) => p.key)).toEqual(['home']);
});

test('only site paths and https links are allowed on buttons', () => {
  for (const ok of ['/collections/all', '/products/mimi-picture-frame/personalize', 'https://www.etsy.com/shop/ButterLu']) expect(safeHref(ok)).toBe(true);
  for (const bad of ['javascript:alert(1)', '//evil.test', 'http://x.test', 'collections/all', '/a b']) expect(safeHref(bad)).toBe(false);
});

test('a page body is cleaned: unknown section types and fields are dropped, icons kept to the list', () => {
  const home = livePage('home');
  const clean = pageFrom(
    {
      key: 'other',
      name: 'Hacked',
      sections: [
        { type: 'script', id: 'x', html: '<script>' },
        { type: 'value-props', id: 'value-props-9', heading: 'Why', items: [{ icon: 'skull', title: 'One', text: 'Two', extra: 1 }] },
      ],
    },
    home,
  );
  expect(clean.key).toBe('home');
  expect(clean.name).toBe(home.name);
  expect(clean.sections).toEqual([{ type: 'value-props', id: 'value-props-9', heading: 'Why', items: [{ icon: 'heart', title: 'One', text: 'Two' }] }]);
});

test('checks catch a missing heading, a bad link, a photo without a description and an unknown photo', () => {
  const hero = newSection('hero-image', []) as HeroImageSection;
  expect(hero.id).toBe('hero-image-1');
  expect(checkPage({ key: 'home', name: 'Homepage', sections: [hero] })).toEqual([]);
  hero.heading = '';
  hero.button.href = 'javascript:alert(1)';
  hero.image = { file: 'home/01.jpg', alt: '' };
  const errors = checkPage({ key: 'home', name: 'Homepage', sections: [hero] }, new Set(['home/02.jpg']));
  expect(errors.join('\n')).toContain('give it a heading');
  expect(errors.join('\n')).toContain('the link must start with');
  expect(errors.join('\n')).toContain('describe the photo');
  expect(errors.join('\n')).toContain('there\'s no photo "home/01.jpg"');
  // The homepage keeps its h1.
  expect(checkPage({ key: 'home', name: 'Homepage', sections: [newSection('value-props', [])] })).toContain("Homepage: keep a Hero Image; its heading is the page's main heading");
});

test('Asli adds, edits and reorders homepage components as a draft, and can undo it', async () => {
  const call = setup();
  const home = livePage('home');
  const props = newSection('value-props', home.sections.map((s) => s.id));
  expect(props.id).toBe('value-props-2');
  (home.sections[0] as HeroImageSection).heading = 'Frames Made for Them';
  const edited = { ...home, sections: [home.sections[0]!, props, home.sections[1]!] };

  const saved = await call('PUT', '/api/admin/pages/home', edited);
  expect(saved.status).toBe(200);
  const cat = await call('GET', '/api/admin/catalog');
  expect(cat.body.doc.pages[0].sections.map((s: { id: string }) => s.id)).toEqual(['hero-image-1', 'value-props-2', 'value-props-1']);
  expect(cat.body.doc.pages[0].sections[0].heading).toBe('Frames Made for Them');
  expect(cat.body.changes).toContainEqual(expect.objectContaining({ kind: 'page', id: 'home', name: 'Homepage', by: 'Asli' }));

  expect((await call('PUT', '/api/admin/pages/home', { sections: [props] })).status).toBe(422);
  expect((await call('PUT', '/api/admin/pages/nope', edited)).status).toBe(404);

  expect((await call('DELETE', '/api/admin/drafts/page/home')).status).toBe(200);
  expect((await call('GET', '/api/admin/catalog')).body.changes).toEqual([]);
});

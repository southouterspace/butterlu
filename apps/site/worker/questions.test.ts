import { Database } from 'bun:sqlite';
import { expect, test } from 'bun:test';
import { liveCatalog } from '../src/catalog/doc';
import { checkPage, checkQuestions, liveQuestions, newSection, pageFrom, questionsFrom, MAX_QUESTIONS } from '../src/catalog/pages';
import { handleAdmin } from './admin';
import type { Env } from './env';

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

test('the store has one shared questions list, and it passes its checks', () => {
  const qs = liveQuestions();
  expect(qs.length).toBeGreaterThan(5);
  expect(checkQuestions(qs)).toEqual([]);
  expect(liveCatalog().questions).toEqual(qs);
  // Categories no longer carry questions of their own.
  expect(liveCatalog().categories.every((c) => !('faq' in c))).toBe(true);
});

test('a questions body is cleaned and checked', () => {
  expect(questionsFrom([['  Q?  ', ' A. '], 'junk', [1]])).toEqual([['Q?', 'A.'], ['', '']]);
  expect(checkQuestions([])).toContain('Questions: keep at least one question');
  expect(checkQuestions([['Q?', '']])).toContain('Question 1: write the answer');
  expect(checkQuestions([['Same?', 'a'], ['same?', 'b']])).toContain('Question 2: the same question is in the list twice');
  expect(checkQuestions(Array.from({ length: MAX_QUESTIONS + 1 }, (_, i) => [`Q${i}?`, 'a'] as const))).toContain(`Questions: ${MAX_QUESTIONS} at most`);
});

test('a Questions component can go on a page; it holds only a heading', () => {
  const s = newSection('questions', []);
  expect(s).toEqual({ type: 'questions', id: 'questions-1', heading: 'Questions' });
  const page = pageFrom({ sections: [{ type: 'hero-image', id: 'hero-image-1', heading: 'Hi', text: '', image: { file: '', alt: '' }, button: { label: 'Shop', href: '/' }, secondary: {} }, { ...s, items: ['dropped'] }] }, { key: 'home', name: 'Homepage', sections: [] });
  expect(page.sections[1]).toEqual(s);
  expect(checkPage(page)).toEqual([]);
});

test('Asli edits the shared questions as a draft, and can undo it', async () => {
  const call = setup();
  const qs = liveQuestions().map(([q, a]) => [q, a]);
  qs.unshift(['Can you rush an order?', 'Yes, for a fee.']);
  expect((await call('PUT', '/api/admin/questions', qs)).status).toBe(200);
  const cat = await call('GET', '/api/admin/catalog');
  expect(cat.body.doc.questions[0]).toEqual(['Can you rush an order?', 'Yes, for a fee.']);
  expect(cat.body.changes).toContainEqual(expect.objectContaining({ kind: 'questions', id: 'all', name: 'Questions', by: 'Asli' }));

  const bad = await call('PUT', '/api/admin/questions', [['No answer?', '']]);
  expect(bad.status).toBe(422);
  expect(bad.body.details).toContain('Question 1: write the answer');

  expect((await call('DELETE', '/api/admin/drafts/questions/all')).status).toBe(200);
  expect((await call('GET', '/api/admin/catalog')).body.changes).toEqual([]);
});

import { describe, expect, test } from 'bun:test';
import type { Env } from './env';
import { handleEvent, isBot, parseClientEvent, track } from './events';

const sink = () => {
  const points: AnalyticsEngineDataPoint[] = [];
  const env = { ASSETS: {} as Fetcher, EVENTS: { writeDataPoint: (p: AnalyticsEngineDataPoint) => void points.push(p) } } as Env;
  return { env, points };
};
const ua = { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1' };
const post = (body: string, headers: Record<string, string> = ua) => new Request('https://shop.test/api/e', { method: 'POST', body, headers });

describe('parseClientEvent', () => {
  test('keeps known fields and drops the rest', () => {
    expect(parseClientEvent({ n: 'add_to_cart', p: 'product', h: 'nana-frame', f: 'abcdef0123456789', d: 'customized', email: 'a@b.c' })).toEqual({
      name: 'add_to_cart',
      page: 'product',
      handle: 'nana-frame',
      fid: 'abcdef0123456789',
      detail: 'customized',
    });
  });
  test('refuses unknown and server-only events', () => {
    expect(parseClientEvent({ n: 'order_paid' })).toBeNull();
    expect(parseClientEvent({ n: 'anything' })).toBeNull();
    expect(parseClientEvent(null)).toBeNull();
  });
  test('drops malformed values instead of storing them', () => {
    expect(parseClientEvent({ n: 'view', p: 'admin', h: 'Bad Handle', f: 'x', v: -1, r: 'https://x.com/path' })).toEqual({ name: 'view' });
  });
});

test('flags crawlers and headless browsers', () => {
  expect(isBot(post('{}', { 'user-agent': 'Googlebot/2.1' }))).toBe(true);
  expect(isBot(post('{}', { 'user-agent': 'Mozilla/5.0 HeadlessChrome/140' }))).toBe(true);
  expect(isBot(post('{}', {}))).toBe(true);
  expect(isBot(post('{}', { 'user-agent': 'Bun/1.4.2' }))).toBe(true);
  expect(isBot(post('{}'))).toBe(false);
});

describe('handleEvent', () => {
  test('writes valid events and answers 204', async () => {
    const { env, points } = sink();
    const res = await handleEvent(post(JSON.stringify([{ n: 'view', p: 'cart' }, { n: 'nope' }])), env);
    expect(res.status).toBe(204);
    expect(points.length).toBe(1);
    expect(points[0]!.blobs?.[0]).toBe('view');
    expect(points[0]!.blobs?.[6]).toBe('human');
  });
  test('refuses oversized and non-JSON bodies', async () => {
    const { env, points } = sink();
    expect((await handleEvent(post('x'.repeat(5000)), env)).status).toBe(413);
    expect((await handleEvent(post('not json'), env)).status).toBe(400);
    expect(points.length).toBe(0);
  });
});

test('track never throws, even when the dataset does', () => {
  const env = { ASSETS: {} as Fetcher, EVENTS: { writeDataPoint: () => { throw new Error('down'); } } } as unknown as Env;
  expect(() => track(env, { name: 'order_paid', value: 3595 })).not.toThrow();
});

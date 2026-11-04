import { describe, expect, test } from 'bun:test';
import type { Env } from './env';
import { serveMedia } from './media';

const file = new Uint8Array(1000).map((_, i) => i % 256);
const env = {
  ASSETS: {
    fetch: async (req: Request) =>
      new URL(req.url).pathname === '/media/a/b.mp4'
        ? new Response(req.method === 'HEAD' ? null : file, { headers: { 'Content-Type': 'video/mp4', 'Content-Length': '1000' } })
        : new Response('not found', { status: 404 }),
  } as unknown as Fetcher,
} as Env;
const get = (range?: string, path = '/media/a/b.mp4') => serveMedia(new Request(`https://shop.test${path}`, { headers: range ? { Range: range } : {} }), env);

describe('serveMedia', () => {
  test('whole file without a Range header, advertising range support', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get('accept-ranges')).toBe('bytes');
    expect((await res.arrayBuffer()).byteLength).toBe(1000);
  });

  test('206 with Content-Range for a byte range', async () => {
    const res = await get('bytes=0-1');
    expect(res.status).toBe(206);
    expect(res.headers.get('content-range')).toBe('bytes 0-1/1000');
    expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([0, 1]);
  });

  test('open-ended and suffix ranges', async () => {
    expect((await get('bytes=990-')).headers.get('content-range')).toBe('bytes 990-999/1000');
    const tail = await get('bytes=-10');
    expect(tail.headers.get('content-range')).toBe('bytes 990-999/1000');
    expect(tail.headers.get('content-length')).toBe('10');
  });

  test('416 for a range past the end', async () => {
    const res = await get('bytes=2000-');
    expect(res.status).toBe(416);
    expect(res.headers.get('content-range')).toBe('bytes */1000');
  });

  test('passes through a missing file', async () => {
    expect((await get(undefined, '/media/nope.mp4')).status).toBe(404);
  });
});

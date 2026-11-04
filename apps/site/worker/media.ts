// /media/*: product videos from static assets, with byte-range support. Safari and
// iOS only play a video whose server answers Range requests with 206 Partial
// Content; static assets answer with the whole file. Files are at most 25 MiB
// (the static assets cap), so slicing in memory is fine.
import type { Env } from './env';

const CACHE = 'public, max-age=604800, stale-while-revalidate=86400';

export async function serveMedia(request: Request, env: Env): Promise<Response> {
  const asset = await env.ASSETS.fetch(new Request(request.url, { method: request.method === 'HEAD' ? 'HEAD' : 'GET' }));
  if (!asset.ok) return asset;
  const headers = new Headers(asset.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', CACHE);
  const range = request.headers.get('Range');
  if (!range || request.method === 'HEAD') return new Response(asset.body, { status: 200, headers });

  const body = new Uint8Array(await asset.arrayBuffer());
  const size = body.byteLength;
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let start = NaN;
  let end = NaN;
  if (m && (m[1] || m[2])) {
    if (m[1]) {
      start = Number(m[1]);
      end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    } else {
      // Suffix range: the last N bytes.
      start = Math.max(0, size - Number(m[2]));
      end = size - 1;
    }
  }
  headers.delete('Content-Length');
  if (!(start <= end && start < size)) {
    headers.set('Content-Range', `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(body.slice(start, end + 1), { status: 206, headers });
}

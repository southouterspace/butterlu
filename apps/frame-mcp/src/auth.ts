import type { Env } from './env';

/**
 * Every /mcp request passes through here before any tool runs. A caller must send
 * `Authorization: Bearer <MCP_TOKEN>`, where MCP_TOKEN is a Worker secret the owner
 * sets (`wrangler secret put MCP_TOKEN` from this directory, or the dashboard).
 * With no secret set the Worker refuses everything: it fails closed, so a deploy
 * that forgot the secret is never open to the public.
 *
 * Rendered PDFs (GET /renders/<uuid>/...) stay outside this check on purpose. Each
 * id is a random UUID returned only to an authorised caller, so the link works as
 * a capability: it can be opened from a chat or an order note without the token.
 */
export function authorizeMcpRequest(request: Request, env: Env): Response | undefined {
  const expected = env.MCP_TOKEN?.trim();
  if (!expected) {
    return Response.json({ error: 'MCP_TOKEN is not set on this Worker, so every request is refused.' }, { status: 503 });
  }
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match || !timingSafeEqual(match[1]!.trim(), expected)) {
    return Response.json(
      { error: 'Unauthorized. Send Authorization: Bearer <MCP_TOKEN>.' },
      { status: 401, headers: { 'www-authenticate': 'Bearer realm="butterlu-frame-mcp"' } },
    );
  }
  return undefined;
}

/** Compares in time that depends only on the expected length, not on where the strings differ. */
export function timingSafeEqual(given: string, expected: string): boolean {
  const enc = new TextEncoder();
  const a = enc.encode(given);
  const b = enc.encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i]!;
  return diff === 0;
}

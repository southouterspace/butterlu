import type { Env } from './env';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const GOOGLE_API_BASE = 'https://www.googleapis.com/drive/v3';

export interface GoogleEndpoints {
  token: string;
  upload: string;
  api: string;
}

/**
 * Google's real endpoints, unless GOOGLE_API_BASE points at a local mock
 * (scripts/mock-google.mjs). Any other override is ignored, so a mistaken
 * value can never send the refresh token anywhere but Google or this machine.
 */
export function googleEndpoints(env: Pick<Env, 'GOOGLE_API_BASE'>): GoogleEndpoints {
  const base = env.GOOGLE_API_BASE?.trim().replace(/\/+$/, '');
  if (base && isLoopback(base)) return { token: `${base}/token`, upload: `${base}/upload/drive/v3`, api: `${base}/drive/v3` };
  return { token: GOOGLE_TOKEN_URL, upload: GOOGLE_UPLOAD_BASE, api: GOOGLE_API_BASE };
}

function isLoopback(base: string): boolean {
  try {
    const url = new URL(base);
    return url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost');
  } catch {
    return false;
  }
}

interface CachedToken {
  key: string;
  token: string;
  expiresAt: number;
}

// One access token per isolate, reused until a minute before it expires. A
// refresh in flight is shared, so the print and proof uploads that start
// together on a cold isolate make one refresh, not two.
let cached: CachedToken | undefined;
let pending: { key: string; promise: Promise<string> } | undefined;

/** Exchanges the owner's refresh token for a short-lived access token. */
export async function accessToken(env: Env, fetcher: typeof fetch = (input, init) => fetch(input, init), now = Date.now()): Promise<string> {
  const key = `${env.GOOGLE_CLIENT_ID}|${env.GOOGLE_REFRESH_TOKEN?.slice(-8)}`;
  if (cached && cached.key === key && cached.expiresAt - 60_000 > now) return cached.token;
  if (pending && pending.key === key) return pending.promise;

  const promise = refresh(env, key, fetcher, now);
  pending = { key, promise };
  try {
    return await promise;
  } finally {
    if (pending?.promise === promise) pending = undefined;
  }
}

async function refresh(env: Env, key: string, fetcher: typeof fetch, now: number): Promise<string> {
  const res = await fetcher(googleEndpoints(env).token, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.GOOGLE_CLIENT_ID ?? '',
      client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: env.GOOGLE_REFRESH_TOKEN ?? '',
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !body.access_token) {
    // invalid_grant means the sign-in was revoked or expired (an OAuth app left
    // in "Testing" drops refresh tokens after 7 days). Only the owner can fix it.
    const reason = body.error === 'invalid_grant' ? 'the Google sign-in has expired or was revoked; rerun scripts/google-setup.mjs' : `${res.status} ${body.error ?? ''} ${body.error_description ?? ''}`.trim();
    throw new GoogleError(`Google token refresh failed: ${reason}`);
  }
  cached = { key, token: body.access_token, expiresAt: now + (body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}

/** Test seam: forget the cached access token. */
export function resetTokenCache() {
  cached = undefined;
  pending = undefined;
}

export class GoogleError extends Error {}

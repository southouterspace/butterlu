// Google sign-in for the admin (docs/13 "Sign-in"). Only the Google accounts listed in
// the ADMIN_EMAILS secret get in. The repo is public, so the addresses and the OAuth
// client secret live only in Worker secrets.
//
// Flow: an admin page without a session shows a "Sign in with Google" page (401).
// /admin/auth/google sends the browser to Google with state, nonce and PKCE held in a
// short signed cookie. /admin/auth/callback trades the code for an ID token directly
// with Google over HTTPS (so its claims can be trusted without checking the JWT
// signature, as Google's docs allow), checks issuer, audience, expiry, nonce and a
// verified email on the list, then sets a signed session cookie. The list is checked
// again on every request, so taking an address off it signs that person out.
import type { Env } from './env';

const SESSION_COOKIE = '__Host-butterlu_admin';
const FLOW_COOKIE = '__Host-butterlu_signin';
const SESSION_SECONDS = 7 * 24 * 3600;
const FLOW_SECONDS = 600;
const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

export const CALLBACK_PATH = '/admin/auth/callback';

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  emails: Set<string>;
  key: string;
}

/** Gmail ignores dots and case in the name part, so "a.b@gmail.com" and "AB@gmail.com" are one account. */
export function canonicalEmail(email: string): string {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at < 1) return e;
  const domain = e.slice(at + 1);
  const local = e.slice(0, at);
  return domain === 'gmail.com' || domain === 'googlemail.com' ? `${local.replace(/\./g, '')}@gmail.com` : e;
}

/**
 * "google" when every Google secret is set, "password" when none is and ADMIN_PASSWORD is,
 * "off" otherwise. A half-set Google sign-in is "off", so the shared password never keeps
 * working by mistake after Justin starts switching.
 */
export function signInMode(env: Env): { mode: 'google'; config: GoogleConfig } | { mode: 'password' } | { mode: 'off'; why?: string } {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const list = env.ADMIN_EMAILS?.trim();
  const any = clientId || clientSecret || list;
  if (!any) return env.ADMIN_PASSWORD?.trim() ? { mode: 'password' } : { mode: 'off' };
  const emails = new Set((list ?? '').split(/[\s,;]+/).filter((e) => e.includes('@')).map(canonicalEmail));
  if (!clientId || !clientSecret || !emails.size) return { mode: 'off', why: 'Google sign-in needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and ADMIN_EMAILS' };
  // ADMIN_SESSION_SECRET is optional; without it the session key comes from the client secret.
  const key = env.ADMIN_SESSION_SECRET?.trim() || `session:${clientSecret}`;
  return { mode: 'google', config: { clientId, clientSecret, emails, key } };
}

// ---------- signed cookies ----------

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));
const random = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function seal(secret: string, payload: Record<string, unknown>): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function unseal<T extends Record<string, unknown>>(secret: string, value: string | undefined, typ: string): Promise<T | null> {
  if (!value) return null;
  const [body, sig, extra] = value.split('.');
  if (!body || !sig || extra !== undefined) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(body))) as T & { typ?: string; exp?: number };
    if (data.typ !== typ || typeof data.exp !== 'number' || data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}

function readCookie(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;

// ---------- pages ----------

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const HEADERS = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'x-frame-options': 'DENY' };

function signInPage(status: number, message: string, next: string, extraHeaders: Record<string, string> = {}): Response {
  const href = `/admin/auth/google?next=${encodeURIComponent(next)}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Sign in · Butterlu admin</title>
<style>:root{color-scheme:light dark;--fg:#1f1a17;--muted:#6b625c;--bg:#faf7f4;--card:#fff;--line:#e7dfd8}
@media (prefers-color-scheme:dark){:root{--fg:#f2ece6;--muted:#b1a79f;--bg:#1b1816;--card:#25211e;--line:#3a332e}}
body{margin:0;font:16px/1.45 system-ui,sans-serif;color:var(--fg);background:var(--bg)}
main{max-width:380px;margin:12vh auto 0;padding:24px;background:var(--card);border:1px solid var(--line);border-radius:14px}
h1{font-size:1.25rem;margin:0 0 8px}p{margin:0 0 16px;color:var(--muted)}
a.btn{display:inline-block;background:var(--fg);color:var(--bg);text-decoration:none;padding:10px 18px;border-radius:99px;font-weight:600}
a.btn:focus-visible{outline:2px solid currentColor;outline-offset:3px}</style></head>
<body><main><h1>Butterlu admin</h1><p>${esc(message)}</p><a class="btn" href="${esc(href)}">Sign in with Google</a></main></body></html>`;
  return new Response(html, { status, headers: { ...HEADERS, ...extraHeaders } });
}

/** Only our own admin pages, so a crafted link can't bounce someone elsewhere after sign-in. */
export function safeNext(next: string | null | undefined): string {
  return next && /^\/admin(\/[A-Za-z0-9._\-/]*)?$/.test(next) && !next.includes('//') && !next.startsWith('/admin/auth') ? next : '/admin/catalog';
}

// ---------- the flow ----------

async function sha256b64url(s: string) {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))));
}

/** The signed-in email for this request, or null. Re-checks the list every time. */
export async function sessionEmail(request: Request, config: GoogleConfig): Promise<string | null> {
  const s = await unseal<{ email: string }>(config.key, readCookie(request, SESSION_COOKIE), 'session');
  return s && config.emails.has(canonicalEmail(s.email)) ? s.email : null;
}

/**
 * Handles /admin/auth/* and sign-out, and answers for anyone not signed in.
 * Returns { email } when the request may go on to the admin, or a Response to send.
 */
export async function googleGate(request: Request, config: GoogleConfig, fetcher: typeof fetch = fetch): Promise<{ email: string } | Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const redirectUri = `${url.origin}${CALLBACK_PATH}`;

  if (path === '/admin/auth/google' && request.method === 'GET') {
    const state = random();
    const nonce = random();
    const verifier = random(48);
    const flow = await seal(config.key, { typ: 'flow', state, nonce, verifier, next: safeNext(url.searchParams.get('next')), exp: Math.floor(Date.now() / 1000) + FLOW_SECONDS });
    const to = new URL(GOOGLE_AUTH);
    to.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email',
      state,
      nonce,
      code_challenge: await sha256b64url(verifier),
      code_challenge_method: 'S256',
      prompt: 'select_account',
    }).toString();
    return new Response(null, { status: 302, headers: { location: to.toString(), 'set-cookie': cookie(FLOW_COOKIE, flow, FLOW_SECONDS), 'cache-control': 'no-store' } });
  }

  if (path === CALLBACK_PATH && request.method === 'GET') {
    const clear = { 'set-cookie': cookie(FLOW_COOKIE, '', 0) };
    const flow = await unseal<{ state: string; nonce: string; verifier: string; next: string }>(config.key, readCookie(request, FLOW_COOKIE), 'flow');
    if (!flow || url.searchParams.get('state') !== flow.state) return signInPage(400, 'That sign-in timed out. Try again.', '/admin/catalog', clear);
    if (url.searchParams.get('error')) return signInPage(401, 'Sign-in was cancelled.', flow.next, clear);
    const code = url.searchParams.get('code');
    if (!code) return signInPage(400, 'Google didn’t finish the sign-in. Try again.', flow.next, clear);

    let claims: Record<string, unknown>;
    try {
      const res = await fetcher(GOOGLE_TOKEN, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: flow.verifier }),
      });
      const token = (await res.json()) as { id_token?: string; error?: string };
      if (!res.ok || !token.id_token) throw new Error(token.error ?? `token ${res.status}`);
      claims = JSON.parse(new TextDecoder().decode(fromB64url(token.id_token.split('.')[1] ?? ''))) as Record<string, unknown>;
    } catch (e) {
      console.error('admin sign-in', e instanceof Error ? e.message : e);
      return signInPage(502, 'Google couldn’t be reached. Try again.', flow.next, clear);
    }

    const now = Date.now() / 1000;
    const email = typeof claims.email === 'string' ? claims.email : '';
    const valid =
      ISSUERS.has(String(claims.iss)) &&
      claims.aud === config.clientId &&
      typeof claims.exp === 'number' &&
      claims.exp > now &&
      claims.nonce === flow.nonce &&
      claims.email_verified === true &&
      !!email;
    if (!valid) return signInPage(401, 'Google’s answer didn’t check out. Try again.', flow.next, clear);
    if (!config.emails.has(canonicalEmail(email))) {
      console.warn('admin sign-in refused for an account not on ADMIN_EMAILS');
      return signInPage(403, 'That Google account isn’t on the list for this admin. Sign in with another one.', flow.next, clear);
    }
    const session = await seal(config.key, { typ: 'session', email, exp: Math.floor(now) + SESSION_SECONDS });
    const headers = new Headers({ location: flow.next, 'cache-control': 'no-store' });
    headers.append('set-cookie', cookie(FLOW_COOKIE, '', 0));
    headers.append('set-cookie', cookie(SESSION_COOKIE, session, SESSION_SECONDS));
    return new Response(null, { status: 303, headers });
  }

  if (path === '/admin/sign-out' && request.method === 'POST') {
    if (request.headers.get('origin') !== url.origin) return new Response('Forbidden', { status: 403 });
    return new Response(null, { status: 303, headers: { location: '/', 'set-cookie': cookie(SESSION_COOKIE, '', 0), 'cache-control': 'no-store' } });
  }

  const email = await sessionEmail(request, config);
  if (email) return { email };
  if (path.startsWith('/api/')) return Response.json({ error: 'Sign in again: your session ended.' }, { status: 401, headers: { 'cache-control': 'no-store' } });
  return signInPage(401, 'Sign in with your Google account.', request.method === 'GET' ? safeNext(path) : '/admin/catalog');
}

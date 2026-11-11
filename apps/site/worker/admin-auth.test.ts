import { expect, test } from 'bun:test';
import { canonicalEmail, adminGate, safeNext, seal, signInMode, unseal } from './admin-auth';
import { handleAdmin } from './admin';
import type { Env } from './env';

const ORIGIN = 'https://s.test';
const GOOGLE = { WORKOS_CLIENT_ID: 'client_test', WORKOS_API_KEY: 'sk_test_key', ADMIN_EMAILS: 'Justin.Example@gmail.com, asli@example.com' };

const config = () => {
  const m = signInMode(GOOGLE as Env);
  if (m.mode !== 'workos') throw new Error('not google');
  return m.config;
};

const cookiesFrom = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0]!)
    .filter((c) => !c.endsWith('='))
    .join('; ');

/** Runs the whole flow against a stand-in WorkOS that answers with this result. */
async function signIn(result: Record<string, unknown>, next = '/admin/orders', status = 200) {
  const c = config();
  const start = (await adminGate(new Request(`${ORIGIN}/admin/auth/google?next=${encodeURIComponent(next)}`), c)) as Response;
  expect(start.status).toBe(302);
  const to = new URL(start.headers.get('location')!);
  expect(to.origin + to.pathname).toBe('https://api.workos.com/user_management/authorize');
  expect(to.searchParams.get('provider')).toBe('GoogleOAuth');
  expect(to.searchParams.get('client_id')).toBe('client_test');
  expect(to.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/admin/auth/callback`);
  expect(to.searchParams.get('code_challenge_method')).toBe('S256');
  const state = to.searchParams.get('state')!;
  let sent: Record<string, string> | undefined;
  const fakeWorkos = (async (u: string, init: RequestInit) => {
    expect(u).toBe('https://api.workos.com/user_management/authenticate');
    sent = JSON.parse(String(init.body));
    return Response.json(result, { status });
  }) as unknown as typeof fetch;
  const back = (await adminGate(
    new Request(`${ORIGIN}/admin/auth/callback?state=${state}&code=abc`, { headers: { cookie: cookiesFrom(start) } }),
    c,
    fakeWorkos,
  )) as Response;
  return { back, sent };
}

const good = { user: { id: 'user_1', email: 'justinexample@gmail.com', email_verified: true }, authentication_method: 'GoogleOAuth' };

test('WorkOS sign-in is on only when all of it is set, and then the password stops working', () => {
  expect(signInMode({ ADMIN_PASSWORD: 'pw' } as Env).mode).toBe('password');
  expect(signInMode({ ...GOOGLE, ADMIN_PASSWORD: 'pw' } as Env).mode).toBe('workos');
  // Half set up fails closed rather than falling back to the password.
  expect(signInMode({ WORKOS_CLIENT_ID: 'x', ADMIN_PASSWORD: 'pw' } as Env).mode).toBe('off');
  expect(signInMode({ ...GOOGLE, ADMIN_EMAILS: ' , ' } as Env).mode).toBe('off');
  expect(signInMode({} as Env).mode).toBe('off');
});

test('Gmail addresses match however the dots and capitals are typed', () => {
  expect(canonicalEmail('Justin.Example@Gmail.com')).toBe('justinexample@gmail.com');
  expect(canonicalEmail('a.b@googlemail.com')).toBe('ab@gmail.com');
  expect(canonicalEmail('A.B@Example.com')).toBe('a.b@example.com');
});

test('after sign-in only our own admin pages are a destination', () => {
  expect(safeNext('/admin/orders')).toBe('/admin/orders');
  for (const bad of ['//evil.test', 'https://evil.test', '/admin//evil.test', '/products', '/admin/auth/google', null]) expect(safeNext(bad)).toBe('/admin/catalog');
});

test('a listed account signs in, gets a session, and lands where it was going', async () => {
  const { back, sent } = await signIn(good);
  expect(back.status).toBe(303);
  expect(back.headers.get('location')).toBe('/admin/orders');
  expect(sent?.code_verifier).toBeTruthy();
  expect(sent?.client_secret).toBe('sk_test_key');
  expect(sent?.grant_type).toBe('authorization_code');
  const set = back.headers.getSetCookie().join('\n');
  expect(set).toContain('__Host-butterlu_admin=');
  expect(set).toMatch(/HttpOnly/);
  expect(set).toMatch(/SameSite=Lax/);
  const session = cookiesFrom(back);
  const gate = await adminGate(new Request(`${ORIGIN}/admin/catalog`, { headers: { cookie: session } }), config());
  expect(gate).toEqual({ email: 'justinexample@gmail.com' });
});

test('an account not on the list, an unverified email, another sign-in method or a WorkOS error gets no session', async () => {
  for (const [result, status] of [
    [{ ...good, user: { ...good.user, email: 'someone@gmail.com' } }, 200],
    [{ ...good, user: { ...good.user, email_verified: false } }, 200],
    [{ ...good, authentication_method: 'Password' }, 200],
    [{ code: 'invalid_grant' }, 400],
  ] as const) {
    const { back } = await signIn(result as Record<string, unknown>, '/admin/orders', status);
    expect([401, 403, 502]).toContain(back.status);
    expect(back.headers.getSetCookie().join('\n')).not.toContain('__Host-butterlu_admin=');
  }
});

test('a callback without our sign-in cookie, or with the wrong state, is refused', async () => {
  const c = config();
  const noCookie = (await adminGate(new Request(`${ORIGIN}/admin/auth/callback?state=x&code=abc`), c)) as Response;
  expect(noCookie.status).toBe(400);
  const start = (await adminGate(new Request(`${ORIGIN}/admin/auth/google`), c)) as Response;
  const wrong = (await adminGate(new Request(`${ORIGIN}/admin/auth/callback?state=other&code=abc`, { headers: { cookie: cookiesFrom(start) } }), c)) as Response;
  expect(wrong.status).toBe(400);
});

test('forged, swapped or expired cookies are not a session, and a removed address is signed out', async () => {
  const c = config();
  const asSession = (v: string) => adminGate(new Request(`${ORIGIN}/admin/catalog`, { headers: { cookie: `__Host-butterlu_admin=${v}` } }), c);
  const exp = Date.now() / 1000 + 600;
  expect(await asSession(await seal('other-key', { typ: 'session', email: 'asli@example.com', exp }))).toBeInstanceOf(Response);
  expect(await asSession(await seal(c.key, { typ: 'flow', email: 'asli@example.com', exp }))).toBeInstanceOf(Response);
  expect(await asSession(await seal(c.key, { typ: 'session', email: 'asli@example.com', exp: 1 }))).toBeInstanceOf(Response);
  const ok = await seal(c.key, { typ: 'session', email: 'asli@example.com', exp });
  expect(await asSession(ok)).toEqual({ email: 'asli@example.com' });
  const off = signInMode({ ...GOOGLE, ADMIN_EMAILS: 'justin.example@gmail.com' } as Env);
  if (off.mode !== 'workos') throw new Error('not google');
  expect(await adminGate(new Request(`${ORIGIN}/admin/catalog`, { headers: { cookie: `__Host-butterlu_admin=${ok}` } }), off.config)).toBeInstanceOf(Response);
  expect(await unseal(c.key, `${ok}.extra`, 'session')).toBeNull();
});

test('without a session the admin shows the Google sign-in, the API says 401, and the password is ignored', async () => {
  const assets = { fetch: async () => new Response('Store admin page') } as unknown as Fetcher;
  const env = { ...GOOGLE, ADMIN_PASSWORD: 'pw', ASSETS: assets, ORDERS: {} as D1Database } as Env;
  const pwd = { authorization: `Basic ${btoa('x:pw')}` };
  const pageRes = (await handleAdmin(new Request(`${ORIGIN}/admin/catalog`, { headers: pwd }), env))!;
  expect(pageRes.status).toBe(401);
  const html = await pageRes.text();
  expect(html).toContain('Sign in with Google');
  expect(html).not.toContain('Store admin');
  expect(pageRes.headers.get('www-authenticate')).toBeNull();
  const apiRes = (await handleAdmin(new Request(`${ORIGIN}/api/admin/catalog`, { headers: pwd }), env))!;
  expect(apiRes.status).toBe(401);
  const out = (await handleAdmin(new Request(`${ORIGIN}/admin/sign-out`, { method: 'POST', headers: { origin: ORIGIN } }), env))!;
  expect(out.status).toBe(303);
  expect(out.headers.get('set-cookie')).toContain('Max-Age=0');
  const crossSite = (await handleAdmin(new Request(`${ORIGIN}/admin/sign-out`, { method: 'POST', headers: { origin: 'https://evil.test' } }), env))!;
  expect(crossSite.status).toBe(403);
});

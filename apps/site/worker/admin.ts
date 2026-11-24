// Asli's back office (docs/07 "Admin", docs/10, docs/13). /admin/catalog is the admin
// page (designs, categories, shop-by lists, pages, questions, orders), a static page
// served only after sign-in. /api/admin/* is its JSON API: the orders here
// (GET /api/admin/orders, POST /api/admin/orders/<session> for status, tracking and a
// note) and the catalog in catalog-admin.ts. /admin/orders redirects into the page.
//
// Sign-in: WorkOS AuthKit with Google, for the accounts in ADMIN_EMAILS only
// (admin-auth.ts), once WORKOS_CLIENT_ID, WORKOS_API_KEY and ADMIN_EMAILS are set. Until then the older
// HTTP Basic sign-in with ADMIN_PASSWORD (any user name). Fail closed: with neither,
// with WorkOS half set up, or without the ORDERS database, /admin answers 404.
import { adminGate, signInMode } from './admin-auth';
import { handleCatalogAdmin } from './catalog-admin';
import type { Env } from './env';
import { listOrders, ORDER_STATUSES, parseOrderUpdate, updateOrder, type LineRow, type OrderRow } from './orders';

const NOT_FOUND = () => new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });

function safeEqual(a: string, b: string): boolean {
  // Compare fixed-length digests, so the length of the password doesn't leak either.
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function digest(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The user name typed at sign-in, for the edit log. Only meaningful after `authorized`. */
export function signedInName(request: Request): string {
  const m = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(request.headers.get('authorization') ?? '');
  if (!m) return 'admin';
  try {
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(m[1]!), (c) => c.charCodeAt(0)));
    const name = decoded.slice(0, Math.max(0, decoded.indexOf(':'))).trim().replace(/[^\p{L}\p{N} ._@-]/gu, '').slice(0, 40);
    return name || 'admin';
  } catch {
    return 'admin';
  }
}

/** True when the request carries Basic credentials whose password is ADMIN_PASSWORD. */
export async function authorized(request: Request, password: string): Promise<boolean> {
  const header = request.headers.get('authorization') ?? '';
  const m = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(header);
  if (!m) return false;
  let decoded: string;
  try {
    // Browsers send the credentials as UTF-8 (the realm asks for it); atob alone gives Latin-1.
    decoded = new TextDecoder().decode(Uint8Array.from(atob(m[1]!), (c) => c.charCodeAt(0)));
  } catch {
    return false;
  }
  const given = decoded.slice(decoded.indexOf(':') + 1);
  return safeEqual(await digest(given), await digest(password));
}

function addressLines(json: string | null): string[] {
  if (!json) return [];
  try {
    const a = JSON.parse(json) as Record<string, string>;
    return [a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(', '), a.country !== 'US' ? a.country : undefined].filter(
      (x): x is string => !!x,
    );
  } catch {
    return [];
  }
}

function designErrors(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/** One order as the admin page reads it (src/admin/app.ts AdminOrder). */
export function orderJson(o: OrderRow, lines: LineRow[]) {
  return {
    id: o.session_id,
    createdAt: o.created_at,
    livemode: !!o.livemode,
    paymentStatus: o.payment_status,
    status: o.status,
    amountTotal: o.amount_total,
    currency: o.currency,
    email: o.email,
    name: o.name,
    phone: o.phone,
    shipName: o.ship_name,
    shipAddress: addressLines(o.ship_address),
    marketingOptIn: !!o.marketing_opt_in,
    trackingNumber: o.tracking_number,
    carrier: o.carrier,
    shippedAt: o.shipped_at,
    note: o.note,
    lines: lines.map((l) => ({ name: l.name, handle: l.handle, quantity: l.quantity, amountTotal: l.amount_total, summary: l.summary, errors: designErrors(l.design_errors) })),
  };
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });

/** GET /api/admin/orders and POST /api/admin/orders/<session>. Null for other paths. */
async function handleOrdersApi(request: Request, db: D1Database): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === '/api/admin/orders' && request.method === 'GET') {
    const orders = await listOrders(db);
    return json({ orders: orders.map(({ order, lines }) => orderJson(order, lines)), statuses: ORDER_STATUSES });
  }
  const m = /^\/api\/admin\/orders\/(cs_[A-Za-z0-9_]{1,200})$/.exec(url.pathname);
  if (!m) return null;
  if (request.method !== 'POST') return json({ error: 'not found' }, 404);
  // Browsers resend Basic credentials to any site that posts here, so only accept our own pages.
  // (The Google session cookie is SameSite=Lax, which blocks that too.)
  if (request.headers.get('origin') !== url.origin) return json({ error: 'forbidden' }, 403);
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json')) return json({ error: 'send JSON' }, 400);
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 8 * 1024) return json({ error: 'too large' }, 400);
    body = JSON.parse(text);
  } catch {
    return json({ error: 'not JSON' }, 400);
  }
  const update = parseOrderUpdate(body);
  if (!update) return json({ error: 'Pick a status from the list.' }, 400);
  if (!(await updateOrder(db, m[1]!, update))) return json({ error: 'That order was not found.' }, 404);
  return json({ ok: true });
}

const isAdminPath = (p: string) => p === '/admin' || p.startsWith('/admin/') || p === '/api/admin' || p.startsWith('/api/admin/');

/** /admin, /admin/* and /api/admin/*. Returns null for paths it doesn't own. */
export async function handleAdmin(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (!isAdminPath(url.pathname)) return null;
  const db = env.ORDERS;
  const auth = signInMode(env);
  if (auth.mode === 'off' && auth.why) console.warn(`admin is off: ${auth.why}`);
  if (auth.mode === 'off' || !db) return NOT_FOUND();
  let who: string;
  if (auth.mode === 'workos') {
    const gate = await adminGate(request, auth.config);
    if (gate instanceof Response) return gate;
    who = gate.email;
  } else {
    if (!(await authorized(request, env.ADMIN_PASSWORD!.trim()))) {
      return new Response('Sign in to the Butterlu admin.', {
        status: 401,
        headers: { 'www-authenticate': 'Basic realm="Butterlu admin", charset="UTF-8"', 'cache-control': 'no-store' },
      });
    }
    who = signedInName(request);
  }

  if (url.pathname.startsWith('/api/admin/')) {
    let orders: Response | null;
    try {
      orders = await handleOrdersApi(request, db);
    } catch (e) {
      console.error('admin orders', e instanceof Error ? e.message : e);
      return json({ error: 'The orders database didn’t answer. Try again in a minute.' }, 500);
    }
    return orders ?? handleCatalogAdmin(request, env, db, who);
  }

  if (url.pathname === '/admin' || url.pathname === '/admin/') return Response.redirect(new URL('/admin/catalog', url).toString(), 303);

  if ((url.pathname === '/admin/catalog' || url.pathname === '/admin/catalog.html') && request.method === 'GET') {
    // The editor is a static page; only the sign-in above lets it out.
    const res = await env.ASSETS.fetch(new Request(new URL('/admin/catalog', url), { headers: request.headers }));
    const headers = new Headers(res.headers);
    headers.set('cache-control', 'no-store');
    headers.set('x-robots-tag', 'noindex, nofollow');
    headers.set('x-frame-options', 'DENY');
    return new Response(res.body, { status: res.status, headers });
  }

  // Orders live in the admin page now. The old address still works.
  if (url.pathname === '/admin/orders' && request.method === 'GET') return Response.redirect(new URL('/admin/catalog#/orders', url).toString(), 303);
  return NOT_FOUND();
}

// Private order list for Asli (docs/07 "Admin", docs/10). GET /admin/orders lists
// recent orders with each frame's design; POST /admin/orders/<session> updates
// status, tracking and a note.
//
// Sign-in: HTTP Basic with the ADMIN_PASSWORD secret (any user name). Fail closed:
// without the secret, or without the ORDERS database, /admin answers 404.
// docs/07 plans Cloudflare Access instead; that needs a domain on the account,
// so it waits for butterlu.com.
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

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

const when = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chicago' }).format(new Date(iso));

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

function lineHtml(l: LineRow): string {
  const errors = l.design_errors ? (JSON.parse(l.design_errors) as string[]) : [];
  return `<li><strong>${esc(l.quantity)} × ${esc(l.name ?? l.handle ?? 'Frame')}</strong>
    <div>${esc(l.summary ?? 'Design could not be read')}</div>
    ${errors.length ? `<div class="warn">Check by hand: ${esc(errors.join('; '))}</div>` : ''}</li>`;
}

function orderHtml(o: OrderRow, lines: LineRow[]): string {
  const ship = addressLines(o.ship_address);
  const held = o.payment_status !== 'paid' && o.payment_status !== 'no_payment_required';
  const options = ORDER_STATUSES.map((s) => `<option value="${s}"${s === o.status ? ' selected' : ''}>${s}</option>`).join('');
  return `<article class="order status-${esc(o.status)}">
  <header>
    <h2>${esc(o.ship_name ?? o.name ?? 'No name')} <span class="pill">${esc(o.status)}</span>${o.livemode ? '' : ' <span class="pill test">test</span>'}</h2>
    <p>${esc(when(o.created_at))} · ${esc(money(o.amount_total, o.currency))}${o.payment_status !== 'paid' ? ` · <span class="warn">payment ${esc(o.payment_status)}</span>` : ''}</p>
  </header>
  <ul class="lines">${lines.map(lineHtml).join('')}</ul>
  <div class="cols">
    <div><h3>Ship to</h3><p>${[o.ship_name, ...ship].filter(Boolean).map(esc).join('<br>') || 'No address'}</p></div>
    <div><h3>Customer</h3><p>${[o.name, o.email, o.phone].filter(Boolean).map(esc).join('<br>') || 'None given'}</p></div>
  </div>
  ${held ? `<p class="warn"><strong>Hold: payment is ${esc(o.payment_status)}.</strong> Don't make this frame until the payment clears.</p>` : ''}
  <form method="post" action="/admin/orders/${encodeURIComponent(o.session_id)}">
    <label>Status <select name="status">${options}</select></label>
    <label>Carrier <input name="carrier" value="${esc(o.carrier)}" maxlength="30" placeholder="USPS"></label>
    <label>Tracking <input name="tracking_number" value="${esc(o.tracking_number)}" maxlength="60"></label>
    <label class="wide">Note <textarea name="note" maxlength="1000" rows="2">${esc(o.note)}</textarea></label>
    <button type="submit">Save</button>
  </form>
  <p class="ref">Stripe ${esc(o.session_id)}</p>
</article>`;
}

function page(body: string): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Orders · Butterlu</title>
<style>
:root{color-scheme:light dark;--fg:#1f1a17;--muted:#6b625c;--bg:#faf7f4;--card:#fff;--line:#e7dfd8;--warn:#a2410f;--accent:#7a8f6a}
@media (prefers-color-scheme:dark){:root{--fg:#f2ece6;--muted:#b1a79f;--bg:#1b1816;--card:#25211e;--line:#3a332e;--warn:#f0a070;--accent:#a9c09a}}
*{box-sizing:border-box}body{margin:0;font:16px/1.45 system-ui,sans-serif;color:var(--fg);background:var(--bg)}
main{max-width:860px;margin:0 auto;padding:16px}h1{font-size:1.4rem;margin:8px 0 16px}
.order{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:0 0 16px}
.order h2{font-size:1.1rem;margin:0}.order header p{margin:4px 0 8px;color:var(--muted)}
.pill{font-size:.75rem;font-weight:600;padding:2px 8px;border-radius:99px;background:var(--line);vertical-align:middle}
.pill.test{background:transparent;border:1px dashed var(--muted);color:var(--muted)}
.status-new .pill:first-of-type{background:var(--accent);color:#fff}
.lines{padding-left:18px;margin:8px 0}.lines li{margin:0 0 6px}.warn{color:var(--warn)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}.cols h3{font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin:8px 0 2px}.cols p{margin:0}
form{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:end;margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}
label{display:flex;flex-direction:column;font-size:.8rem;color:var(--muted);gap:2px}label.wide{flex:1 1 100%}
input,select,textarea,button{font:inherit;color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px 8px}
button{background:var(--fg);color:var(--bg);border:0;padding:8px 16px;cursor:pointer}
.ref{font-size:.75rem;color:var(--muted);margin:8px 0 0;word-break:break-all}
@media (max-width:560px){.cols{grid-template-columns:1fr}}
</style></head><body><main>${body}</main></body></html>`;
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'x-frame-options': 'DENY' },
  });
}

/** /admin and /admin/*. Returns null for paths it doesn't own. */
export async function handleAdmin(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== '/admin' && !url.pathname.startsWith('/admin/')) return null;
  const password = env.ADMIN_PASSWORD?.trim();
  const db = env.ORDERS;
  if (!password || !db) return NOT_FOUND();
  if (!(await authorized(request, password))) {
    return new Response('Sign in to see orders.', {
      status: 401,
      headers: { 'www-authenticate': 'Basic realm="Butterlu orders", charset="UTF-8"', 'cache-control': 'no-store' },
    });
  }

  if (url.pathname === '/admin' || url.pathname === '/admin/') return Response.redirect(new URL('/admin/orders', url).toString(), 303);

  if (url.pathname === '/admin/orders' && request.method === 'GET') {
    const orders = await listOrders(db);
    const saved = url.searchParams.get('saved') ? '<p role="status">Saved.</p>' : '';
    const list = orders.length ? orders.map(({ order, lines }) => orderHtml(order, lines)).join('') : '<p>No orders yet.</p>';
    return page(`<h1>Orders</h1>${saved}${list}`);
  }

  const m = /^\/admin\/orders\/(cs_[A-Za-z0-9_]{1,200})$/.exec(url.pathname);
  if (m && request.method === 'POST') {
    // Browsers resend Basic credentials to any site that posts here, so only accept our own pages.
    if (request.headers.get('origin') !== url.origin) return new Response('Forbidden', { status: 403 });
    const update = parseOrderUpdate(await request.formData());
    if (!update) return new Response('Bad request', { status: 400 });
    if (!(await updateOrder(db, m[1]!, update))) return NOT_FOUND();
    return Response.redirect(new URL('/admin/orders?saved=1', url).toString(), 303);
  }
  return NOT_FOUND();
}

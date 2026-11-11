// POST /api/checkout. The cart lives in the browser, so nothing in the request is
// trusted: each line is priced from the catalog and its design re-checked with the
// same rules the print file is made from. The design rides to Stripe as line-item
// product metadata, where the webhook reads it back.
import { describeDesign, designToMetadata, parseDesign } from '@butterlu/frame/design';
import type { FrameSpec } from '@butterlu/frame';
import { CURRENCY, PRODUCTS } from '../src/catalog/products';
import { currentHandle } from '../src/catalog/retired';
import type { Env } from './env';
import { track, validFid } from './events';

export const MAX_LINES = 20;
export const MAX_QUANTITY = 10;

export interface CheckedLine {
  handle: string;
  name: string;
  quantity: number;
  unitAmount: number;
  design: FrameSpec;
}

export type CartResult = { ok: true; lines: CheckedLine[] } | { ok: false; errors: string[] };

const byHandle = new Map(PRODUCTS.map((p) => [p.handle, p]));

export function checkCart(body: unknown): CartResult {
  const items = (body as { items?: unknown } | null)?.items;
  if (!Array.isArray(items) || items.length === 0) return { ok: false, errors: ['the cart is empty'] };
  if (items.length > MAX_LINES) return { ok: false, errors: [`at most ${MAX_LINES} different frames per order`] };
  const errors: string[] = [];
  const lines: CheckedLine[] = [];
  items.forEach((raw, i) => {
    const item = (raw ?? {}) as { handle?: unknown; quantity?: unknown; design?: unknown };
    const product = typeof item.handle === 'string' ? byHandle.get(currentHandle(item.handle)) : undefined;
    if (!product) return void errors.push(`line ${i + 1}: unknown product`);
    const quantity = item.quantity;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return void errors.push(`line ${i + 1}: quantity must be 1 to ${MAX_QUANTITY}`);
    }
    const design = parseDesign(item.design);
    if (!design.ok) return void errors.push(...design.errors.map((e) => `line ${i + 1}: ${e}`));
    lines.push({ handle: product.handle, name: product.name, quantity, unitAmount: product.priceCents, design: design.spec });
  });
  return errors.length ? { ok: false, errors } : { ok: true, lines };
}

export type KeyCheck = { ok: true; mode: 'test' | 'live' } | { ok: false; status: number; error: string };

export function checkKey(env: Env): KeyCheck {
  const key = env.STRIPE_SECRET_KEY?.trim();
  if (!key) return { ok: false, status: 503, error: 'Checkout is not switched on yet. Your cart is saved, so please check back soon.' };
  const live = /^(sk|rk)_live_/.test(key);
  if (live && env.STRIPE_ALLOW_LIVE !== 'true') {
    return { ok: false, status: 503, error: 'Checkout is in test mode only right now. Your cart is saved, so please check back soon.' };
  }
  if (!live && !/^(sk|rk)_test_/.test(key)) return { ok: false, status: 503, error: 'Checkout is not set up correctly yet.' };
  return { ok: true, mode: live ? 'live' : 'test' };
}

export interface SessionOptions {
  /** Funnel id from the browser, echoed back on the Session as client_reference_id. */
  fid?: string;
  /** Unix seconds when the unpaid Session expires and counts as abandoned. */
  expiresAt?: number;
  /** Show Stripe's promotion code field (owner's call, off by default). */
  promoCodes?: boolean;
}

export const DEFAULT_EXPIRES_HOURS = 2;

/** CHECKOUT_EXPIRES_HOURS, clamped to what Stripe allows (30 minutes to 24 hours). */
export function expiresAt(env: Env, nowSeconds = Math.floor(Date.now() / 1000)): number {
  const hours = Number(env.CHECKOUT_EXPIRES_HOURS ?? DEFAULT_EXPIRES_HOURS);
  const h = Number.isFinite(hours) ? hours : DEFAULT_EXPIRES_HOURS;
  // A minute inside each of Stripe's limits so clock skew never trips them.
  return nowSeconds + Math.min(86340, Math.max(1860, Math.round(h * 3600)));
}

/** Stripe's form encoding for a Checkout Session, as ordered key/value pairs. */
export function sessionParams(lines: CheckedLine[], origin: string, opts: SessionOptions = {}): URLSearchParams {
  const p = new URLSearchParams();
  p.set('mode', 'payment');
  if (opts.fid) {
    p.set('client_reference_id', opts.fid);
    p.set('metadata[fid]', opts.fid);
  }
  if (opts.expiresAt) p.set('expires_at', String(opts.expiresAt));
  // Abandoned checkout recovery (docs/11). Stripe shows the opt-in box to US
  // shoppers only, and returns the email on expiry only to those who ticked it.
  p.set('consent_collection[promotions]', 'auto');
  p.set('after_expiration[recovery][enabled]', 'true');
  p.set('after_expiration[recovery][allow_promotion_codes]', opts.promoCodes ? 'true' : 'false');
  if (opts.promoCodes) p.set('allow_promotion_codes', 'true');
  // Trust copy beside the pay button: when it ships and how to fix a typo (Baymard: delivery and trust).
  p.set('custom_text[submit][message]', "Made to order and shipped within 3 to 5 business days. Spot a typo? Reply to your receipt and we'll fix it before we print.");
  p.set('success_url', `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`);
  p.set('cancel_url', `${origin}/cart`);
  p.set('billing_address_collection', 'auto');
  p.set('shipping_address_collection[allowed_countries][0]', 'US');
  const rate = 'shipping_options[0][shipping_rate_data]';
  p.set(`${rate}[type]`, 'fixed_amount');
  p.set(`${rate}[display_name]`, 'Free shipping');
  p.set(`${rate}[fixed_amount][amount]`, '0');
  p.set(`${rate}[fixed_amount][currency]`, CURRENCY);
  p.set(`${rate}[delivery_estimate][minimum][unit]`, 'business_day');
  p.set(`${rate}[delivery_estimate][minimum][value]`, '5');
  p.set(`${rate}[delivery_estimate][maximum][unit]`, 'business_day');
  p.set(`${rate}[delivery_estimate][maximum][value]`, '10');
  p.set('metadata[source]', 'butterlu-site');
  lines.forEach((l, i) => {
    const li = `line_items[${i}]`;
    p.set(`${li}[quantity]`, String(l.quantity));
    p.set(`${li}[price_data][currency]`, CURRENCY);
    p.set(`${li}[price_data][unit_amount]`, String(l.unitAmount));
    p.set(`${li}[price_data][product_data][name]`, l.name);
    p.set(`${li}[price_data][product_data][description]`, describeDesign(l.design));
    p.set(`${li}[price_data][product_data][metadata][handle]`, l.handle);
    for (const [k, v] of Object.entries(designToMetadata(l.design))) p.set(`${li}[price_data][product_data][metadata][${k}]`, v);
  });
  return p;
}

export async function createCheckout(request: Request, env: Env, fetcher: typeof fetch = fetch): Promise<Response> {
  const body = await request.json().catch(() => null);
  const rawFid = (body as { fid?: unknown } | null)?.fid;
  const fid = validFid(rawFid) ? rawFid : undefined;
  const key = checkKey(env);
  if (!key.ok) {
    track(env, { name: 'checkout_refused', page: 'cart', fid, detail: 'checkout_off' });
    return Response.json({ error: key.error }, { status: key.status });
  }
  const cart = checkCart(body);
  if (!cart.ok) {
    track(env, { name: 'checkout_refused', page: 'cart', fid, detail: 'cart_invalid' });
    return Response.json({ error: 'Something in your cart needs a fix.', details: cart.errors }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const res = await fetcher('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY!.trim()}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: sessionParams(cart.lines, origin, { fid, expiresAt: expiresAt(env), promoCodes: env.CHECKOUT_PROMO_CODES === 'true' }),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; id?: string; error?: { message?: string } };
  if (!res.ok || !data.url) {
    console.error('stripe checkout session failed', res.status, data.error?.message);
    track(env, { name: 'checkout_refused', page: 'cart', fid, detail: 'stripe_error' });
    return Response.json({ error: 'We could not start checkout. Please try again in a moment.' }, { status: 502 });
  }
  const amount = cart.lines.reduce((s, l) => s + l.unitAmount * l.quantity, 0);
  track(env, { name: 'checkout_created', page: 'cart', fid, value: amount, detail: key.mode });
  return Response.json({ url: data.url, id: data.id, mode: key.mode });
}

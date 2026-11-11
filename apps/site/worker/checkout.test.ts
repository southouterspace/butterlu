import { describe, expect, test } from 'bun:test';
import { PRODUCTS } from '../src/catalog/products';
import { checkCart, checkKey, createCheckout, expiresAt, sessionParams } from './checkout';
import type { Env } from './env';

const product = PRODUCTS[0]!;
const item = { handle: product.handle, quantity: 2, design: product.preset };
const env = (key?: string, extra: Partial<Env> = {}) => ({ ASSETS: {} as Fetcher, STRIPE_SECRET_KEY: key, ...extra }) as Env;
const post = (body: unknown) => new Request('https://shop.test/api/checkout', { method: 'POST', body: JSON.stringify(body) });

describe('checkCart', () => {
  test('prices from the catalog, not the request', () => {
    const r = checkCart({ items: [{ ...item, priceCents: 1 }] });
    expect(r.ok && r.lines[0]!.unitAmount).toBe(product.priceCents);
  });
  test('rejects unknown products, bad quantities and bad designs', () => {
    const r = checkCart({
      items: [
        { ...item, handle: 'nope' },
        { ...item, quantity: 11 },
        { ...item, design: { ...product.preset, backgroundId: 'not-a-background' } },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBe(3);
  });
  test('rejects an empty cart', () => expect(checkCart({ items: [] }).ok).toBe(false));
  test('a cart saved under a merged-away frame checks out as the frame that replaced it', () => {
    const r = checkCart({ items: [{ ...item, handle: 'rounded-picture-frame' }] });
    expect(r.ok && r.lines[0]!.handle).toBe('personalized-picture-frame');
  });
});

describe('checkKey', () => {
  test('no key: checkout off', () => expect(checkKey(env()).ok).toBe(false));
  test('test key: on', () => expect(checkKey(env('sk_test_abc'))).toEqual({ ok: true, mode: 'test' }));
  test('live key refused unless the owner allows it', () => {
    expect(checkKey(env('sk_live_abc')).ok).toBe(false);
    expect(checkKey(env('rk_live_abc')).ok).toBe(false);
    expect(checkKey(env('sk_live_abc', { STRIPE_ALLOW_LIVE: 'true' }))).toEqual({ ok: true, mode: 'live' });
  });
});

test('session params carry the design as product metadata and free US shipping', () => {
  const r = checkCart({ items: [item] });
  if (!r.ok) throw new Error('cart');
  const p = sessionParams(r.lines, 'https://shop.test');
  expect(p.get('mode')).toBe('payment');
  expect(p.get('line_items[0][quantity]')).toBe('2');
  expect(p.get('line_items[0][price_data][unit_amount]')).toBe(String(product.priceCents));
  expect(p.get('line_items[0][price_data][product_data][metadata][frame_shape]')).toBe(product.preset.shape);
  expect(p.get('line_items[0][price_data][product_data][metadata][handle]')).toBe(product.handle);
  expect(p.get('shipping_address_collection[allowed_countries][0]')).toBe('US');
  expect(p.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]')).toBe('0');
  expect(p.get('success_url')).toBe('https://shop.test/checkout/success?session_id={CHECKOUT_SESSION_ID}');
});

test('session params turn on abandoned checkout recovery and carry the funnel id', () => {
  const r = checkCart({ items: [item] });
  if (!r.ok) throw new Error('cart');
  const p = sessionParams(r.lines, 'https://shop.test', { fid: 'abcdef0123456789', expiresAt: 1_800_007_200 });
  expect(p.get('client_reference_id')).toBe('abcdef0123456789');
  expect(p.get('expires_at')).toBe('1800007200');
  expect(p.get('consent_collection[promotions]')).toBe('auto');
  expect(p.get('after_expiration[recovery][enabled]')).toBe('true');
  expect(p.get('after_expiration[recovery][allow_promotion_codes]')).toBe('false');
  expect(p.has('allow_promotion_codes')).toBe(false);
  expect(sessionParams(r.lines, 'https://shop.test', { promoCodes: true }).get('allow_promotion_codes')).toBe('true');
});

test('expiry defaults to 2 hours and stays inside Stripe limits', () => {
  const now = 1_800_000_000;
  expect(expiresAt(env(), now)).toBe(now + 7200);
  expect(expiresAt(env(undefined, { CHECKOUT_EXPIRES_HOURS: '0.1' }), now)).toBe(now + 1860);
  expect(expiresAt(env(undefined, { CHECKOUT_EXPIRES_HOURS: '0.5001' }), now)).toBe(now + 1860);
  expect(expiresAt(env(undefined, { CHECKOUT_EXPIRES_HOURS: '48' }), now)).toBe(now + 86400 - 60);
  expect(expiresAt(env(undefined, { CHECKOUT_EXPIRES_HOURS: 'soon' }), now)).toBe(now + 7200);
});

describe('createCheckout', () => {
  test('503 without a key, before calling Stripe', async () => {
    let called = false;
    const res = await createCheckout(post({ items: [item] }), env(), (async () => ((called = true), new Response())) as unknown as typeof fetch);
    expect(res.status).toBe(503);
    expect(called).toBe(false);
  });
  test('400 for a bad cart', async () => {
    const res = await createCheckout(post({ items: [{ ...item, handle: 'nope' }] }), env('sk_test_abc'));
    expect(res.status).toBe(400);
  });
  test('returns the Stripe URL', async () => {
    let sent: RequestInit | undefined;
    const fake = (async (_url: string, init: RequestInit) => {
      sent = init;
      return Response.json({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    }) as unknown as typeof fetch;
    const res = await createCheckout(post({ items: [item] }), env('sk_test_abc'), fake);
    expect(await res.json()).toEqual({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1', mode: 'test' });
    expect((sent?.headers as Record<string, string>).authorization).toBe('Bearer sk_test_abc');
  });
});

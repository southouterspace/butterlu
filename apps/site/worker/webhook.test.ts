import { expect, test } from 'bun:test';
import { designToMetadata } from '@butterlu/frame/design';
import { PRODUCTS } from '../src/catalog/products';
import type { Env } from './env';
import { handleWebhook, signatureFor, verifySignature } from './webhook';

const secret = 'whsec_test';
const now = 1_800_000_000;

test('accepts a valid signature and rejects tampering, wrong secrets and old timestamps', async () => {
  const sig = await signatureFor(secret, String(now), '{"a":1}');
  expect(await verifySignature(`t=${now},v1=${sig}`, '{"a":1}', secret, now)).toBe(true);
  expect(await verifySignature(`t=${now},v1=${sig}`, '{"a":2}', secret, now)).toBe(false);
  expect(await verifySignature(`t=${now},v1=${sig}`, '{"a":1}', 'whsec_other', now)).toBe(false);
  expect(await verifySignature(`t=${now},v1=${sig}`, '{"a":1}', secret, now + 600)).toBe(false);
  expect(await verifySignature(null, '{"a":1}', secret, now)).toBe(false);
});

test('a paid session decodes each line back to its design', async () => {
  const product = PRODUCTS[0]!;
  const payload = JSON.stringify({ type: 'checkout.session.completed', livemode: false, data: { object: { id: 'cs_test_1' } } });
  const t = Math.floor(Date.now() / 1000);
  const req = new Request('https://shop.test/api/stripe/webhook', {
    method: 'POST',
    body: payload,
    headers: { 'stripe-signature': `t=${t},v1=${await signatureFor(secret, String(t), payload)}` },
  });
  const fake = (async () =>
    Response.json({
      data: [{ quantity: 1, amount_total: product.priceCents, price: { product: { name: product.name, metadata: { handle: product.handle, ...designToMetadata(product.preset) } } } }],
    })) as unknown as typeof fetch;
  const env = { ASSETS: {} as Fetcher, STRIPE_SECRET_KEY: 'sk_test_abc', STRIPE_WEBHOOK_SECRET: secret } as Env;
  const res = await handleWebhook(req, env, fake);
  expect(await res.json()).toEqual({ received: true, lines: 1 });
});

test('a bad signature is a 400', async () => {
  const req = new Request('https://shop.test/api/stripe/webhook', { method: 'POST', body: '{}', headers: { 'stripe-signature': 't=1,v1=00' } });
  const res = await handleWebhook(req, { ASSETS: {} as Fetcher, STRIPE_WEBHOOK_SECRET: secret } as Env);
  expect(res.status).toBe(400);
});

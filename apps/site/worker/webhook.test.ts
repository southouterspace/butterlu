import { expect, test } from 'bun:test';
import { designToMetadata } from '@butterlu/frame/design';
import { PRODUCTS } from '../src/catalog/products';
import type { Env } from './env';
import { handleWebhook, recoveryDecision, signatureFor, verifySignature } from './webhook';

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

const signed = async (event: object) => {
  const payload = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  return new Request('https://shop.test/api/stripe/webhook', {
    method: 'POST',
    body: payload,
    headers: { 'stripe-signature': `t=${t},v1=${await signatureFor(secret, String(t), payload)}` },
  });
};

test('recovery needs a link, consent and an email, and can be switched off', () => {
  const env = { ASSETS: {} as Fetcher } as Env;
  const ok = { after_expiration: { recovery: { url: 'https://buy.stripe.com/r/x' } }, consent: { promotions: 'opt_in' }, customer_details: { email: 'a@b.c' } };
  expect(recoveryDecision(ok, env)).toEqual({ send: true, reason: 'eligible' });
  expect(recoveryDecision({ ...ok, consent: { promotions: 'opt_out' } }, env).reason).toBe('no_consent');
  expect(recoveryDecision({ ...ok, customer_details: null }, env).reason).toBe('no_email');
  expect(recoveryDecision({ ...ok, after_expiration: null }, env).reason).toBe('no_recovery_link');
  expect(recoveryDecision(ok, { ...env, RECOVERY_EMAILS: 'off' }).reason).toBe('recovery_off');
});

test('an expired session is recorded, never emailed, and Stripe is not called', async () => {
  let called = false;
  const fake = (async () => ((called = true), new Response())) as unknown as typeof fetch;
  const env = { ASSETS: {} as Fetcher, STRIPE_SECRET_KEY: 'sk_test_abc', STRIPE_WEBHOOK_SECRET: secret } as Env;
  const req = await signed({
    type: 'checkout.session.expired',
    livemode: false,
    data: { object: { id: 'cs_test_2', consent: { promotions: 'opt_in' }, customer_details: { email: 'a@b.c' }, after_expiration: { recovery: { url: 'https://buy.stripe.com/r/x' } } } },
  });
  expect(await (await handleWebhook(req, env, fake)).json()).toEqual({ received: true, recovery: 'eligible' });
  expect(called).toBe(false);
});

function fakeDb(fail = false) {
  const calls: { sql: string; args: unknown[] }[] = [];
  const db = {
    prepare: (sql: string) => ({ bind: (...args: unknown[]) => ({ sql, args }) }),
    batch: async (stmts: { sql: string; args: unknown[] }[]) => {
      if (fail) throw new Error('down');
      calls.push(...stmts);
      return stmts.map(() => ({ meta: { changes: 1 } }));
    },
  };
  return { db: db as unknown as D1Database, calls };
}

async function paidRequest() {
  const payload = JSON.stringify({ type: 'checkout.session.completed', livemode: false, data: { object: { id: 'cs_test_9', payment_status: 'paid', amount_total: 3795 } } });
  const t = Math.floor(Date.now() / 1000);
  return new Request('https://shop.test/api/stripe/webhook', {
    method: 'POST',
    body: payload,
    headers: { 'stripe-signature': `t=${t},v1=${await signatureFor(secret, String(t), payload)}` },
  });
}

const oneLine = (async () => Response.json({ data: [{ quantity: 1, amount_total: 3795, price: { product: { name: 'Frame', metadata: {} } } }] })) as unknown as typeof fetch;

test('a paid order is saved once per session, and a failed save asks Stripe to retry', async () => {
  const ok = fakeDb();
  const env = { ASSETS: {} as Fetcher, STRIPE_SECRET_KEY: 'sk_test_abc', STRIPE_WEBHOOK_SECRET: secret, ORDERS: ok.db } as Env;
  expect((await handleWebhook(await paidRequest(), env, oneLine)).status).toBe(200);
  expect(ok.calls.map((c) => c.sql.split(' (')[0])).toEqual(['INSERT OR IGNORE INTO orders', 'INSERT OR IGNORE INTO order_lines']);
  expect(ok.calls[0]!.args[0]).toBe('cs_test_9');

  const down = fakeDb(true);
  const res = await handleWebhook(await paidRequest(), { ...env, ORDERS: down.db }, oneLine);
  expect(res.status).toBe(500);
});

test('a bank debit that settles later marks the saved order paid', async () => {
  const payload = JSON.stringify({ type: 'checkout.session.async_payment_succeeded', livemode: false, data: { object: { id: 'cs_test_9' } } });
  const t = Math.floor(Date.now() / 1000);
  const req = new Request('https://shop.test/api/stripe/webhook', {
    method: 'POST',
    body: payload,
    headers: { 'stripe-signature': `t=${t},v1=${await signatureFor(secret, String(t), payload)}` },
  });
  const runs: unknown[][] = [];
  const db = { prepare: () => ({ bind: (...a: unknown[]) => ({ run: async () => { runs.push(a); return { meta: { changes: 1 } }; } }) }) } as unknown as D1Database;
  const res = await handleWebhook(req, { ASSETS: {} as Fetcher, STRIPE_WEBHOOK_SECRET: secret, ORDERS: db } as Env);
  expect(await res.json()).toEqual({ received: true, payment: 'paid' });
  expect(runs).toEqual([['paid', 'cs_test_9']]);
});

import { expect, test } from 'bun:test';
import type { Env } from './env';
import { authorized, handleAdmin } from './admin';
import { orderRows, parseOrderUpdate } from './orders';

const session = {
  id: 'cs_test_1',
  livemode: false,
  payment_status: 'paid',
  amount_total: 3795,
  currency: 'usd',
  client_reference_id: 'abcdef1234567890',
  consent: { promotions: 'opt_in' },
  customer_details: { email: 'a@example.com', name: 'Ada', phone: null },
  collected_information: { shipping_details: { name: 'Ada L', address: { line1: '1 Main', city: 'Spring', state: 'TX', postal_code: '77373', country: 'US' } } },
};

test('a paid session becomes one order row and one row per line', () => {
  const rows = orderRows(session, [
    { handle: 'h', name: 'Frame', quantity: 1, amountTotal: 3795, design: null, summary: null, errors: ['top: bad font'] },
  ], new Date('2026-11-08T00:00:00Z'));
  expect(rows.order).toMatchObject({
    session_id: 'cs_test_1',
    status: 'new',
    created_at: '2026-11-08T00:00:00.000Z',
    email: 'a@example.com',
    ship_name: 'Ada L',
    marketing_opt_in: 1,
    fid: 'abcdef1234567890',
  });
  expect(JSON.parse(rows.order.ship_address!)).toEqual({ line1: '1 Main', city: 'Spring', state: 'TX', postal_code: '77373', country: 'US' });
  expect(rows.lines).toEqual([
    { session_id: 'cs_test_1', line_no: 1, handle: 'h', name: 'Frame', quantity: 1, amount_total: 3795, design: null, summary: null, design_errors: '["top: bad font"]' },
  ]);
});

test('older sessions keep the address in shipping_details', () => {
  const { collected_information: _, ...old } = session;
  const rows = orderRows({ ...old, shipping_details: { name: 'Old', address: { line1: '2 Elm' } } }, []);
  expect(rows.order.ship_name).toBe('Old');
});

test('the admin form only takes known statuses and trims its fields', () => {
  const ok = new FormData();
  ok.set('status', 'shipped');
  ok.set('tracking_number', '  9400 1  ');
  ok.set('carrier', '');
  expect(parseOrderUpdate(ok)).toEqual({ status: 'shipped', tracking_number: '9400 1', carrier: null, note: null });
  const bad = new FormData();
  bad.set('status', 'deleted');
  expect(parseOrderUpdate(bad)).toBeNull();
});

const basic = (user: string, pass: string) => ({ authorization: `Basic ${btoa(`${user}:${pass}`)}` });

test('only the admin password opens the order list', async () => {
  expect(await authorized(new Request('https://s.test/admin', { headers: basic('asli', 'right horse') }), 'right horse')).toBe(true);
  expect(await authorized(new Request('https://s.test/admin', { headers: basic('asli', 'wrong') }), 'right horse')).toBe(false);
  expect(await authorized(new Request('https://s.test/admin'), 'right horse')).toBe(false);
});

test('/admin is a 404 until the password and database exist, then asks for a sign-in', async () => {
  const req = () => new Request('https://s.test/admin/orders');
  const base = { ASSETS: {} as Fetcher } as Env;
  expect((await handleAdmin(req(), base))!.status).toBe(404);
  expect((await handleAdmin(req(), { ...base, ADMIN_PASSWORD: 'pw' }))!.status).toBe(404);
  const res = (await handleAdmin(req(), { ...base, ADMIN_PASSWORD: 'pw', ORDERS: {} as D1Database }))!;
  expect(res.status).toBe(401);
  expect(res.headers.get('www-authenticate')).toContain('Basic');
  expect(await handleAdmin(new Request('https://s.test/about'), base)).toBeNull();
});

test('a saved change from another site is refused', async () => {
  const env = { ASSETS: {} as Fetcher, ADMIN_PASSWORD: 'pw', ORDERS: {} as D1Database } as Env;
  const req = new Request('https://s.test/admin/orders/cs_test_1', {
    method: 'POST',
    headers: { ...basic('a', 'pw'), origin: 'https://evil.test' },
    body: new URLSearchParams({ status: 'shipped' }),
  });
  expect((await handleAdmin(req, env))!.status).toBe(403);
});

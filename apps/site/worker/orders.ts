// Orders in D1 (docs/10, migrations/0001_orders.sql). The Stripe webhook is the
// only writer of new orders; the admin page only changes status, tracking and notes.
import type { FrameSpec } from '@butterlu/frame';
import type { Env } from './env';

export const ORDER_STATUSES = ['new', 'proofing', 'printing', 'shipped', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

interface Address {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

/** The parts of a completed Checkout Session an order keeps. */
export interface PaidSession {
  id: string;
  livemode?: boolean;
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  client_reference_id?: string | null;
  recovered_from?: string | null;
  consent?: { promotions?: string | null } | null;
  customer_details?: { email?: string | null; name?: string | null; phone?: string | null; address?: Address | null } | null;
  /** Current API versions. */
  collected_information?: { shipping_details?: { name?: string | null; address?: Address | null } | null } | null;
  /** Older API versions. */
  shipping_details?: { name?: string | null; address?: Address | null } | null;
}

export interface OrderLine {
  handle: string | null;
  name: string | null;
  quantity: number;
  amountTotal: number;
  design: FrameSpec | null;
  summary: string | null;
  errors: string[];
}

export interface OrderRow {
  session_id: string;
  created_at: string;
  livemode: number;
  payment_status: string;
  status: OrderStatus;
  amount_total: number;
  currency: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  ship_name: string | null;
  ship_address: string | null;
  marketing_opt_in: number;
  recovered_from: string | null;
  fid: string | null;
  tracking_number: string | null;
  carrier: string | null;
  shipped_at: string | null;
  note: string | null;
}

export interface LineRow {
  session_id: string;
  line_no: number;
  handle: string | null;
  name: string | null;
  quantity: number;
  amount_total: number;
  design: string | null;
  summary: string | null;
  design_errors: string | null;
}

const ADDRESS_KEYS = ['line1', 'line2', 'city', 'state', 'postal_code', 'country'] as const;

function addressJson(a: Address | null | undefined): string | null {
  if (!a) return null;
  const out: Record<string, string> = {};
  for (const k of ADDRESS_KEYS) if (a[k]) out[k] = a[k]!;
  return Object.keys(out).length ? JSON.stringify(out) : null;
}

/** Builds the rows for one paid session. Pure, so the shape is unit-tested. */
export function orderRows(session: PaidSession, lines: OrderLine[], now = new Date()): { order: OrderRow; lines: LineRow[] } {
  const ship = session.collected_information?.shipping_details ?? session.shipping_details ?? null;
  const fid = session.client_reference_id && /^[A-Za-z0-9_-]{8,64}$/.test(session.client_reference_id) ? session.client_reference_id : null;
  return {
    order: {
      session_id: session.id,
      created_at: now.toISOString(),
      livemode: session.livemode ? 1 : 0,
      payment_status: session.payment_status ?? 'unknown',
      status: 'new',
      amount_total: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      email: session.customer_details?.email ?? null,
      name: session.customer_details?.name ?? null,
      phone: session.customer_details?.phone ?? null,
      ship_name: ship?.name ?? null,
      ship_address: addressJson(ship?.address),
      marketing_opt_in: session.consent?.promotions === 'opt_in' ? 1 : 0,
      recovered_from: session.recovered_from ?? null,
      fid,
      tracking_number: null,
      carrier: null,
      shipped_at: null,
      note: null,
    },
    lines: lines.map((l, i) => ({
      session_id: session.id,
      line_no: i + 1,
      handle: l.handle,
      name: l.name,
      quantity: l.quantity,
      amount_total: l.amountTotal,
      design: l.design ? JSON.stringify(l.design) : null,
      summary: l.summary,
      design_errors: l.errors.length ? JSON.stringify(l.errors) : null,
    })),
  };
}

const ORDER_COLS = [
  'session_id', 'created_at', 'livemode', 'payment_status', 'status', 'amount_total', 'currency', 'email', 'name', 'phone',
  'ship_name', 'ship_address', 'marketing_opt_in', 'recovered_from', 'fid', 'tracking_number', 'carrier', 'shipped_at', 'note',
] as const;
const LINE_COLS = ['session_id', 'line_no', 'handle', 'name', 'quantity', 'amount_total', 'design', 'summary', 'design_errors'] as const;

const insert = (table: string, cols: readonly string[]) =>
  `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;

/**
 * Saves an order once. Idempotent on the session id: Stripe retries deliveries,
 * and a second delivery changes nothing. Returns false when it was already saved.
 */
export async function saveOrder(db: D1Database, rows: { order: OrderRow; lines: LineRow[] }): Promise<boolean> {
  const o = rows.order;
  const results = await db.batch([
    db.prepare(insert('orders', ORDER_COLS)).bind(...ORDER_COLS.map((c) => o[c])),
    ...rows.lines.map((l) => db.prepare(insert('order_lines', LINE_COLS)).bind(...LINE_COLS.map((c) => l[c]))),
  ]);
  return (results[0]?.meta.changes ?? 0) > 0;
}

export async function listOrders(db: D1Database, limit = 100): Promise<{ order: OrderRow; lines: LineRow[] }[]> {
  const { results: orders } = await db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?').bind(limit).all<OrderRow>();
  if (!orders.length) return [];
  const { results: lines } = await db
    .prepare(
      'SELECT l.* FROM order_lines l JOIN (SELECT session_id FROM orders ORDER BY created_at DESC LIMIT ?) o USING (session_id) ORDER BY l.session_id, l.line_no',
    )
    .bind(limit)
    .all<LineRow>();
  return orders.map((order) => ({ order, lines: lines.filter((l) => l.session_id === order.session_id) }));
}

export interface OrderUpdate {
  status: OrderStatus;
  tracking_number: string | null;
  carrier: string | null;
  note: string | null;
}

/** Reads the admin form. Returns null when it isn't valid. */
export function parseOrderUpdate(form: FormData): OrderUpdate | null {
  const status = String(form.get('status') ?? '');
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return null;
  const text = (key: string, max: number) => {
    const v = String(form.get(key) ?? '').trim();
    return v ? v.slice(0, max) : null;
  };
  return { status: status as OrderStatus, tracking_number: text('tracking_number', 60), carrier: text('carrier', 30), note: text('note', 1000) };
}

export async function updateOrder(db: D1Database, sessionId: string, u: OrderUpdate, now = new Date()): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE orders SET status = ?, tracking_number = ?, carrier = ?, note = ?,
         shipped_at = CASE WHEN ? = 'shipped' THEN COALESCE(shipped_at, ?) ELSE shipped_at END
       WHERE session_id = ?`,
    )
    .bind(u.status, u.tracking_number, u.carrier, u.note, u.status, now.toISOString(), sessionId)
    .run();
  return res.meta.changes > 0;
}

/** A delayed payment (bank debit) settled or failed: checkout.session.async_payment_*. */
export async function setPaymentStatus(db: D1Database, sessionId: string, paymentStatus: string): Promise<void> {
  await db.prepare('UPDATE orders SET payment_status = ? WHERE session_id = ?').bind(paymentStatus, sessionId).run();
}

export const ordersStore = (env: Env): D1Database | undefined => env.ORDERS;

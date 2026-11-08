// POST /api/stripe/webhook. Verifies Stripe's signature, then turns each paid line
// back into the FrameSpec the frame MCP prints from, and saves the order to D1
// (orders.ts) for the private order list. docs/10 has the next steps (proof
// review, print files).
import { describeDesign, designFromMetadata } from '@butterlu/frame/design';
import type { Env } from './env';
import { track, validFid } from './events';
import { orderRows, saveOrder, setPaymentStatus, type PaidSession } from './orders';

export const TOLERANCE_SECONDS = 300;

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signatureFor(secret: string, timestamp: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
}

export async function verifySignature(header: string | null, payload: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(',').map((s) => s.trim().split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const v1s = parts.filter(([k]) => k === 'v1').map(([, v]) => v ?? '');
  if (!t || !/^\d+$/.test(t) || v1s.length === 0) return false;
  if (Math.abs(nowSeconds - Number(t)) > TOLERANCE_SECONDS) return false;
  const expected = await signatureFor(secret, t, payload);
  return v1s.some((v) => safeEqual(v, expected));
}

/** The parts of a Checkout Session the funnel reads. */
export interface SessionLike {
  id?: string;
  livemode?: boolean;
  client_reference_id?: string | null;
  amount_total?: number | null;
  payment_status?: string | null;
  recovered_from?: string | null;
  customer_details?: { email?: string | null } | null;
  consent?: { promotions?: string | null } | null;
  after_expiration?: { recovery?: { enabled?: boolean; url?: string | null } | null } | null;
}

export type RecoveryDecision = { send: true; reason: 'eligible' } | { send: false; reason: 'recovery_off' | 'no_recovery_link' | 'no_consent' | 'no_email' };

/**
 * Whether an expired Checkout Session may get an abandoned checkout email
 * (docs/11). Consent comes first: Stripe only returns the email of shoppers who
 * ticked the box. Frequency caps and the send delay need the D1 table, so even an
 * "eligible" session is only recorded until the owner picks an email provider.
 */
export function recoveryDecision(session: SessionLike, env: Env): RecoveryDecision {
  if ((env.RECOVERY_EMAILS ?? 'log') === 'off') return { send: false, reason: 'recovery_off' };
  if (!session.after_expiration?.recovery?.url) return { send: false, reason: 'no_recovery_link' };
  if (session.consent?.promotions !== 'opt_in') return { send: false, reason: 'no_consent' };
  if (!session.customer_details?.email) return { send: false, reason: 'no_email' };
  return { send: true, reason: 'eligible' };
}

const fidOf = (s: SessionLike) => (validFid(s.client_reference_id) ? s.client_reference_id : undefined);

interface LineItem {
  quantity: number;
  amount_total: number;
  price?: { product?: { name?: string; metadata?: Record<string, string> } | string };
}

export async function handleWebhook(request: Request, env: Env, fetcher: typeof fetch = fetch): Promise<Response> {
  const secret = env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return Response.json({ error: 'webhook not configured' }, { status: 503 });
  const payload = await request.text();
  if (!(await verifySignature(request.headers.get('stripe-signature'), payload, secret))) {
    return Response.json({ error: 'bad signature' }, { status: 400 });
  }
  const event = JSON.parse(payload) as { type?: string; livemode?: boolean; data?: { object?: SessionLike } };
  const HANDLED = ['checkout.session.completed', 'checkout.session.expired', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed'];
  if (!HANDLED.includes(event.type ?? '')) return Response.json({ received: true });
  if (event.livemode && env.STRIPE_ALLOW_LIVE !== 'true') return Response.json({ received: true, ignored: 'live event while in test mode' });
  const session = event.data?.object ?? {};

  if (event.type === 'checkout.session.async_payment_succeeded' || event.type === 'checkout.session.async_payment_failed') {
    // A bank debit settled or failed after checkout. The order was saved unpaid and held.
    if (!session.id || !env.ORDERS) return Response.json({ received: true });
    const status = event.type.endsWith('succeeded') ? 'paid' : 'failed';
    try {
      await setPaymentStatus(env.ORDERS, session.id, status);
    } catch (err) {
      console.error('payment status not saved', session.id, err);
      return Response.json({ error: 'cannot save the payment status' }, { status: 500 });
    }
    if (status === 'paid') {
      track(env, { name: 'order_paid', page: 'success', fid: fidOf(session), value: session.amount_total ?? 0, detail: 'settled_later' });
    }
    return Response.json({ received: true, payment: status });
  }

  if (event.type === 'checkout.session.expired') {
    // Abandoned checkout. Record the decision only: no email address, no recovery link.
    const decision = recoveryDecision(session, env);
    track(env, { name: 'checkout_expired', fid: fidOf(session), value: session.amount_total ?? 0, detail: decision.reason });
    return Response.json({ received: true, recovery: decision.reason });
  }

  const id = session.id;
  const key = env.STRIPE_SECRET_KEY?.trim();
  if (!id || !key) return Response.json({ error: 'cannot read the order' }, { status: 500 });
  const res = await fetcher(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}/line_items?limit=100&expand[]=data.price.product`, {
    headers: { authorization: `Bearer ${key}` },
  });
  if (!res.ok) return Response.json({ error: 'cannot read the order' }, { status: 502 }); // Stripe retries.
  const { data = [] } = (await res.json()) as { data?: LineItem[] };
  const lines = data.map((li) => {
    const product = typeof li.price?.product === 'object' ? li.price.product : undefined;
    const design = designFromMetadata(product?.metadata ?? {});
    return {
      handle: product?.metadata?.handle ?? null,
      name: product?.name ?? null,
      quantity: li.quantity,
      amountTotal: li.amount_total,
      design: design.ok ? design.spec : null,
      summary: design.ok ? describeDesign(design.spec) : null,
      errors: design.ok ? [] : design.errors,
    };
  });
  console.log('order paid', JSON.stringify({ session: id, lines: lines.map(({ handle, quantity, summary, errors }) => ({ handle, quantity, summary, errors })) }));
  if (env.ORDERS) {
    // A failed save answers 500 so Stripe retries: an order must never be lost.
    // Saving is idempotent on the session id, so a retry never duplicates it.
    try {
      await saveOrder(env.ORDERS, orderRows({ ...(session as PaidSession), id }, lines));
    } catch (err) {
      console.error('order not saved', id, err);
      return Response.json({ error: 'cannot save the order' }, { status: 500 });
    }
  }
  // Recorded once the order is read, so a retried delivery that failed above isn't counted.
  // Async methods (bank debits) complete unpaid; those count when they settle (docs/11).
  if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
    track(env, {
      name: 'order_paid',
      page: 'success',
      fid: fidOf(session),
      value: session.amount_total ?? 0,
      detail: session.recovered_from ? 'recovered' : session.consent?.promotions === 'opt_in' ? 'opted_in' : 'direct',
    });
  }
  return Response.json({ received: true, lines: lines.length });
}

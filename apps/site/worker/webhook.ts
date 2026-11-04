// POST /api/stripe/webhook. Verifies Stripe's signature, then turns each paid line
// back into the FrameSpec the frame MCP prints from. For now it logs the order;
// docs/10 has the next step (D1 order table, proof review, print files).
import { describeDesign, designFromMetadata } from '@butterlu/frame/design';
import type { Env } from './env';

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
  const event = JSON.parse(payload) as { type?: string; livemode?: boolean; data?: { object?: { id?: string } } };
  if (event.type !== 'checkout.session.completed') return Response.json({ received: true });
  if (event.livemode && env.STRIPE_ALLOW_LIVE !== 'true') return Response.json({ received: true, ignored: 'live event while in test mode' });

  const id = event.data?.object?.id;
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
      quantity: li.quantity,
      design: design.ok ? design.spec : null,
      summary: design.ok ? describeDesign(design.spec) : null,
      errors: design.ok ? [] : design.errors,
    };
  });
  console.log('order paid', JSON.stringify({ session: id, lines }));
  return Response.json({ received: true, lines: lines.length });
}

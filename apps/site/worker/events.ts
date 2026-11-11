// Funnel events (docs/11). The browser beacons a few named steps to POST /api/e;
// the Worker adds its own server-side steps (checkout created, paid, expired).
// Every event is anonymous: a per-tab funnel id, the page type and a product
// handle. No cookies, no email, no IP, no full URLs.
//
// Each event is logged as one JSON line (Workers Logs, observability is on) and,
// when the EVENTS Analytics Engine binding exists, written there too so the
// funnel report can query it with SQL.
import type { Env } from './env';

/** Steps the browser may send. Anything else is dropped. */
export const CLIENT_EVENTS = ['view', 'personalize_click', 'customize', 'add_to_cart', 'checkout_click', 'checkout_error'] as const;
/** Steps only the Worker records. */
export const SERVER_EVENTS = ['checkout_created', 'checkout_refused', 'order_paid', 'checkout_expired'] as const;
export type EventName = (typeof CLIENT_EVENTS)[number] | (typeof SERVER_EVENTS)[number];

export const PAGE_TYPES = ['home', 'collection', 'product', 'personalize', 'cart', 'success', 'content', 'not_found', 'other'] as const;

export interface FunnelEvent {
  name: EventName;
  /** Page type, from PAGE_TYPES. */
  page?: string;
  /** Product or collection handle. */
  handle?: string;
  /** Per-tab funnel id (sessionStorage), so steps of one visit join up. */
  fid?: string;
  /** One number per event: cents for money, a count otherwise. */
  value?: number;
  /** Short detail: an error reason, the Stripe mode, a recovery decision. */
  detail?: string;
  /** Referrer host on a landing view, e.g. "google.com". */
  ref?: string;
}

const FID = /^[A-Za-z0-9_-]{8,64}$/;
const HANDLE = /^[a-z0-9-]{1,80}$/;
const DETAIL = /^[a-z0-9_.:-]{1,60}$/;
const HOST = /^[a-z0-9.-]{1,80}$/;
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|python|curl|wget|bun\/|node|undici|playwright/i;

export const validFid = (v: unknown): v is string => typeof v === 'string' && FID.test(v);

/** Checks a browser event. Returns null for anything not on the list or malformed. */
export function parseClientEvent(raw: unknown): FunnelEvent | null {
  const e = (raw ?? {}) as Record<string, unknown>;
  if (!(CLIENT_EVENTS as readonly unknown[]).includes(e.n)) return null;
  const out: FunnelEvent = { name: e.n as EventName };
  if ((PAGE_TYPES as readonly unknown[]).includes(e.p)) out.page = e.p as string;
  if (typeof e.h === 'string' && HANDLE.test(e.h)) out.handle = e.h;
  if (validFid(e.f)) out.fid = e.f;
  if (typeof e.v === 'number' && Number.isFinite(e.v) && e.v >= 0 && e.v < 1e7) out.value = Math.round(e.v);
  if (typeof e.d === 'string' && DETAIL.test(e.d)) out.detail = e.d;
  if (typeof e.r === 'string' && HOST.test(e.r)) out.ref = e.r;
  return out;
}

export function isBot(request: Request): boolean {
  const ua = request.headers.get('user-agent') ?? '';
  return !ua || BOT_UA.test(ua);
}

/** Records one event. Never throws: measurement must not break checkout. */
/** `who` is "human" or "bot" for browser events, "server" for the Worker's own. */
export function track(env: Env, event: FunnelEvent, who: 'human' | 'bot' | 'server' = 'server'): void {
  try {
    console.log(JSON.stringify({ funnel: event.name, who, ...event, name: undefined }));
    env.EVENTS?.writeDataPoint({
      indexes: [event.name],
      // Column order is the funnel report's contract (docs/11 section 2): do not reorder.
      blobs: [event.name, event.page ?? '', event.handle ?? '', event.fid ?? '', event.detail ?? '', event.ref ?? '', who],
      doubles: [event.value ?? 0],
    });
  } catch (err) {
    console.error('funnel event not recorded', err);
  }
}

/** POST /api/e. Accepts one event or a small batch; always answers 204. */
export async function handleEvent(request: Request, env: Env): Promise<Response> {
  if (Number(request.headers.get('content-length') ?? 0) > 4096) return new Response(null, { status: 413 });
  const text = await request.text().catch(() => '');
  if (text.length > 4096) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const bot = isBot(request);
  for (const raw of (Array.isArray(body) ? body : [body]).slice(0, 10)) {
    const event = parseClientEvent(raw);
    if (event) track(env, event, bot ? 'bot' : 'human');
  }
  return new Response(null, { status: 204 });
}

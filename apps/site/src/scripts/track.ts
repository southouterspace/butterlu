// Funnel beacons (docs/11). Anonymous by design: a random per-tab id kept in
// sessionStorage (gone when the tab closes), the page type and a product handle.
// No cookies, no third-party script. Shoppers with Global Privacy Control on send nothing.
type Props = { v?: number; d?: string; r?: string };

const KEY = 'butterlu.fid';
const optedOut = () => (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

/** The visit's funnel id, or undefined when storage is blocked or the shopper opted out. */
export function funnelId(): string | undefined {
  if (optedOut()) return undefined;
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) sessionStorage.setItem(KEY, (id = crypto.randomUUID().replaceAll('-', '')));
    return id;
  } catch {
    return undefined;
  }
}

export function track(name: string, props: Props = {}) {
  if (optedOut()) return;
  const { pageType, handle } = document.body.dataset;
  const body = JSON.stringify({ n: name, f: funnelId(), p: pageType, h: handle, ...props });
  try {
    if (navigator.sendBeacon?.('/api/e', new Blob([body], { type: 'application/json' }))) return;
  } catch {
    // Fall through to fetch.
  }
  void fetch('/api/e', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
}

/** The referring site on a landing view, e.g. "google.com"; nothing for internal clicks. */
export function referrerHost(): string | undefined {
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : '';
    // Coming back from Stripe Checkout (success or cancel) is not a referral.
    if (!host || host === location.hostname || /(^|\.)stripe\.com$/.test(host)) return undefined;
    return host.replace(/^www\./, '').toLowerCase();
  } catch {
    return undefined;
  }
}

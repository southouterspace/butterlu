// The cart lives in the browser (docs/07: no sessions, no KV). The checkout Worker
// re-checks every line against the catalog and the design rules, so nothing here
// is trusted for price or content.
import type { FrameSpec } from '@butterlu/frame';
import { designKey } from '@butterlu/frame/design';
import { currentHandle } from '../catalog/retired';

export interface CartLine {
  handle: string;
  quantity: number;
  design: FrameSpec;
  key: string;
}

const STORAGE_KEY = 'butterlu.cart.v1';
const EVENT = 'butterlu:cart';
export const MAX_QUANTITY = 10;

function read(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    // A line saved under a merged-away product carries on as the product that replaced it.
    // Two old lines can become the same line; they merge, as adding it twice would.
    const lines: CartLine[] = [];
    for (const l of raw as CartLine[]) {
      if (!l || typeof l.handle !== 'string' || !l.design) continue;
      const handle = currentHandle(l.handle);
      const line = handle === l.handle ? l : { ...l, handle, key: `${handle}|${designKey(l.design)}` };
      const same = lines.find((x) => x.key === line.key);
      if (same) same.quantity = Math.min(MAX_QUANTITY, same.quantity + line.quantity);
      else lines.push({ ...line });
    }
    return lines;
  } catch {
    return [];
  }
}

function write(lines: CartLine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Private mode or full storage: the cart lasts for this page only.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export const cartLines = read;
export const cartCount = () => read().reduce((n, l) => n + l.quantity, 0);

export function addToCart(handle: string, design: FrameSpec, quantity = 1) {
  const key = `${handle}|${designKey(design)}`;
  const lines = read();
  const existing = lines.find((l) => l.key === key);
  if (existing) existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + quantity);
  else lines.push({ handle, quantity: Math.min(MAX_QUANTITY, quantity), design, key });
  write(lines);
}

export function setQuantity(key: string, quantity: number) {
  const lines = read()
    .map((l) => (l.key === key ? { ...l, quantity: Math.max(0, Math.min(MAX_QUANTITY, Math.floor(quantity))) } : l))
    .filter((l) => l.quantity > 0);
  write(lines);
}

export const removeLine = (key: string) => setQuantity(key, 0);
export const clearCart = () => write([]);

export function onCartChange(fn: () => void) {
  window.addEventListener(EVENT, fn);
  // Another tab changed the cart.
  window.addEventListener('storage', (e) => e.key === STORAGE_KEY && fn());
}

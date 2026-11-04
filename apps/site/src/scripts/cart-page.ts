import { describeDesign } from '@butterlu/frame/design';
import { frameSvg } from '../lib/frame-svg';
import { cartLines, clearCart, onCartChange, removeLine, setQuantity } from './cart';
import { fontsReady, placementsInBrowser } from './measure';

type Catalog = Record<string, { name: string; priceCents: number }>;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function mountCart(root: HTMLElement) {
  const catalog = JSON.parse(root.dataset.catalog ?? '{}') as Catalog;
  const list = root.querySelector<HTMLElement>('[data-lines]')!;
  const empty = root.querySelector<HTMLElement>('[data-empty]')!;
  const summary = root.querySelector<HTMLElement>('[data-summary]')!;
  const subtotal = root.querySelector<HTMLElement>('[data-subtotal]')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  const checkout = root.querySelector<HTMLButtonElement>('[data-checkout]')!;

  function render() {
    // Drop lines whose product is gone from the catalog.
    const lines = cartLines().filter((l) => catalog[l.handle]);
    empty.hidden = lines.length > 0;
    summary.hidden = lines.length === 0;
    list.innerHTML = lines
      .map((l, i) => {
        const p = catalog[l.handle]!;
        const svg = frameSvg(l.design, placementsInBrowser(l.design), { idPrefix: `line-${i}`, photoHint: false });
        return `<li class="line" data-key="${esc(l.key)}">
          <a href="/products/${esc(l.handle)}" aria-hidden="true" tabindex="-1">${svg}</a>
          <div><h2>${esc(p.name)}</h2><p class="desc">${esc(describeDesign(l.design))}</p><p>${money(p.priceCents)}</p></div>
          <div class="line-actions">
            <label>Qty <input type="number" min="0" max="10" value="${l.quantity}" data-qty aria-label="Quantity of ${esc(p.name)}"></label>
            <button type="button" data-remove>Remove</button>
          </div></li>`;
      })
      .join('');
    subtotal.textContent = money(lines.reduce((s, l) => s + catalog[l.handle]!.priceCents * l.quantity, 0));
  }

  list.addEventListener('change', (e) => {
    const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-qty]');
    const key = input?.closest<HTMLElement>('[data-key]')?.dataset.key;
    if (input && key) setQuantity(key, Number(input.value));
  });
  list.addEventListener('click', (e) => {
    const key = (e.target as HTMLElement).closest('[data-remove]') && (e.target as HTMLElement).closest<HTMLElement>('[data-key]')?.dataset.key;
    if (key) removeLine(key);
  });

  checkout.addEventListener('click', async () => {
    checkout.disabled = true;
    status.textContent = 'Taking you to secure checkout…';
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: cartLines().map((l) => ({ handle: l.handle, quantity: l.quantity, design: l.design })) }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      status.textContent = data.error ?? 'Checkout is not available right now. Please try again in a moment.';
    } catch {
      status.textContent = 'We could not reach checkout. Check your connection and try again.';
    }
    checkout.disabled = false;
  });

  render();
  onCartChange(render);
  void fontsReady().then(render);
  // Exposed for the order-complete page.
  (window as unknown as { butterluClearCart?: () => void }).butterluClearCart = clearCart;
}

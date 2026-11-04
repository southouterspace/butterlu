import { describeDesign } from '@butterlu/frame/design';
import { frameSvg } from '../lib/frame-svg';
import { MAX_QUANTITY, cartLines, clearCart, onCartChange, removeLine, setQuantity } from './cart';
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
    // Re-rendering replaces the list, so keep keyboard focus on the quantity being changed.
    const focusedKey = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-key]')?.dataset.key;
    const focusedQty = (document.activeElement as HTMLElement | null)?.matches('[data-qty]');
    // Drop lines whose product is gone from the catalog.
    const lines = cartLines().filter((l) => catalog[l.handle]);
    empty.hidden = lines.length > 0;
    summary.hidden = lines.length === 0;
    list.innerHTML = lines
      .map((l, i) => {
        const p = catalog[l.handle]!;
        const svg = frameSvg(l.design, placementsInBrowser(l.design), { idPrefix: `line-${i}`, photoHint: false });
        const qty = Array.from({ length: MAX_QUANTITY }, (_, n) => n + 1)
          .map((n) => `<option value="${n}"${n === l.quantity ? ' selected' : ''}>${n}</option>`)
          .join('');
        return `<li class="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 rounded-4xl bg-card p-3 shadow-sm ring-1 ring-foreground/5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:p-4" data-key="${esc(l.key)}">
          <a class="block self-start rounded-3xl bg-muted p-2" href="/products/${esc(l.handle)}" aria-hidden="true" tabindex="-1">${svg}</a>
          <div class="flex min-w-0 flex-col gap-1">
            <h2 class="text-base leading-snug font-medium tracking-normal">${esc(p.name)}</h2>
            <p class="text-sm break-words text-muted-foreground">${esc(describeDesign(l.design))}</p>
            <div class="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
              <label class="flex items-center gap-2 text-sm">Qty
                <select class="select-chevron h-9 appearance-none rounded-3xl border border-transparent bg-input/50 pr-8 pl-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring md:text-sm" data-qty aria-label="Quantity of ${esc(p.name)}">${qty}</select>
              </label>
              <span class="font-medium">${money(p.priceCents * l.quantity)}</span>
            </div>
            <button type="button" class="self-start py-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground" data-remove>Remove</button>
          </div></li>`;
      })
      .join('');
    if (focusedKey && focusedQty) {
      for (const li of list.querySelectorAll<HTMLElement>('[data-key]')) if (li.dataset.key === focusedKey) li.querySelector<HTMLElement>('[data-qty]')?.focus();
    }
    subtotal.textContent = money(lines.reduce((s, l) => s + catalog[l.handle]!.priceCents * l.quantity, 0));
  }

  list.addEventListener('change', (e) => {
    const input = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-qty]');
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

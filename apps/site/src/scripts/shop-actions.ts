// The two ways into a design from a card or its product page (docs/11): add it to
// the cart exactly as shown, or open the editor. One listener each for the whole
// page; an ES module runs once, however many components import it.
import type { FrameSpec } from '@butterlu/frame';
import { addToCart, cartLines } from './cart';
import { toast } from './toast';
import { track } from './track';

document.addEventListener('click', (e) => {
  const target = e.target as Element | null;
  const add = target?.closest<HTMLButtonElement>('[data-add-as-shown]');
  if (add) {
    const spec = JSON.parse(add.dataset.spec ?? 'null') as FrameSpec | null;
    if (!spec) return;
    const handle = add.dataset.addAsShown!;
    const count = () => cartLines().filter((l) => l.handle === handle).reduce((sum, l) => sum + l.quantity, 0);
    const before = count();
    // The checkout Worker re-checks every line.
    addToCart(handle, spec, 1);
    track('add_to_cart', { d: add.dataset.from === 'product' ? 'as_shown' : add.dataset.from === 'home' ? 'as_shown_home' : 'as_shown_card', h: handle });
    const n = count();
    toast(n === before ? `Your cart already has the most we make at once (${n})` : `Added to your cart${n > 1 ? ` (${n} of these)` : ''}`, {
      description: add.dataset.name,
      action: { label: 'View Cart', href: '/cart' },
      returnFocus: add,
    });
    return;
  }
  // A beacon survives the page change, so the link needs no delay.
  const open = target?.closest<HTMLAnchorElement>('[data-personalize]');
  if (open) track('personalize_click', { d: open.dataset.personalize, h: open.dataset.handle });
});

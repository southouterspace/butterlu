// A shadcn (Sonner-style) toast with no framework: one toast at a time in the layout's
// region, an optional action link, gone after a few seconds. Hovering or focusing it
// holds it, so nobody loses it mid-read. The words go to a separate polite status line,
// so screen readers hear the message and not the buttons.
const SHOW_MS = 5000;
let timer = 0;

export function toast(
  title: string,
  opts: { description?: string; action?: { label: string; href: string }; returnFocus?: HTMLElement | null } = {},
) {
  const region = document.querySelector<HTMLElement>('[data-toaster]');
  const status = document.querySelector<HTMLElement>('[data-toast-status]');
  if (!region) return;
  clearTimeout(timer);
  region.replaceChildren();
  // Cleared first, so the same words twice in a row are announced again.
  if (status) {
    status.textContent = '';
    requestAnimationFrame(() => (status.textContent = [title, opts.description].filter(Boolean).join('. ')));
  }
  const item = document.createElement('div');
  item.className = 'toast';
  const text = document.createElement('div');
  text.className = 'grid min-w-0 flex-1 gap-0.5';
  const t = document.createElement('p');
  t.className = 'font-medium';
  t.textContent = title;
  text.append(t);
  if (opts.description) {
    const d = document.createElement('p');
    d.className = 'truncate text-muted-foreground';
    d.textContent = opts.description;
    text.append(d);
  }
  item.append(text);
  if (opts.action) {
    const a = document.createElement('a');
    a.href = opts.action.href;
    a.className = 'toast-action';
    a.textContent = opts.action.label;
    item.append(a);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  item.append(close);
  region.append(item);
  requestAnimationFrame(() => item.setAttribute('data-open', ''));

  let hovered = false;
  let focused = false;
  const dismiss = () => {
    clearTimeout(timer);
    // Never strand keyboard focus on a toast that is going away.
    if (item.contains(document.activeElement)) (opts.returnFocus ?? document.getElementById('main'))?.focus();
    item.removeAttribute('data-open');
    setTimeout(() => item.remove(), 200);
  };
  const start = () => {
    clearTimeout(timer);
    if (!hovered && !focused) timer = window.setTimeout(dismiss, SHOW_MS);
  };
  close.addEventListener('click', dismiss);
  item.addEventListener('pointerenter', () => ((hovered = true), clearTimeout(timer)));
  item.addEventListener('pointerleave', () => ((hovered = false), start()));
  item.addEventListener('focusin', () => ((focused = true), clearTimeout(timer)));
  item.addEventListener('focusout', (e) => {
    if (item.contains(e.relatedTarget as Node | null)) return;
    focused = false;
    start();
  });
  start();
}

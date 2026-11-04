// Live customizer on the product page. Reads the form into a FrameSpec, checks it
// with the shared design rules, fits the text with the shared layout rules, and
// redraws the preview. The spec it adds to the cart is what the frame MCP prints.
import { FONTS, type FrameSpec, type HexColor, SIDES, type Side, backgroundById } from '@butterlu/frame';
import { SIDE_LABEL, TEXT_COLORS, parseDesign } from '@butterlu/frame/design';
import { frameSvg } from '../lib/frame-svg';
import { addToCart } from './cart';
import { track } from './track';
import { fontsReady, placementsInBrowser } from './measure';

interface Config {
  handle: string;
  preset: FrameSpec;
}

export function mountCustomizer(root: HTMLElement) {
  const config = JSON.parse(root.dataset.customizer ?? '{}') as Config;
  const form = root.querySelector<HTMLFormElement>('[data-form]')!;
  const preview = root.querySelector<HTMLElement>('[data-preview]')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  const addButton = root.querySelector<HTMLButtonElement>('[data-add]')!;
  const backgroundNames = root.querySelectorAll<HTMLElement>('[data-background-name]');
  const backgroundThumb = root.querySelector<HTMLImageElement>('[data-bg-thumb]');
  const picker = root.querySelector<HTMLDialogElement>('[data-bg-picker]');
  const moreSummary = root.querySelector<HTMLElement>('[data-more-summary]');
  const resetButton = root.querySelector<HTMLButtonElement>('[data-reset]');
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | RadioNodeList | null;
  const value = (name: string) => {
    const f = field(name);
    return f && 'value' in f ? f.value : '';
  };

  function readSpec(): FrameSpec | { errors: string[] } {
    const color = value('color');
    const sides: Partial<Record<Side, unknown>> = {};
    for (const side of SIDES) {
      const text = value(`text-${side}`);
      if (text.trim() === '') continue;
      const preset = config.preset.sides[side];
      sides[side] = {
        text,
        fontId: value(`font-${side}`),
        ...(preset?.rotation !== undefined ? { rotation: preset.rotation } : {}),
        ...(color !== 'auto' ? { color: color as HexColor } : {}),
      };
    }
    const r = parseDesign({ shape: value('shape'), backgroundId: value('background'), sides });
    return r.ok ? r.spec : { errors: r.errors };
  }

  let current: FrameSpec | null = config.preset;

  const fontName = (id: string) => FONTS.find((f) => f.id === id)?.name.replace(/ (Bold|SemiBold)$/, '') ?? id;
  // What the form holds, and what it holds for the preset. The baseline comes from the
  // preset, not the page's first state, because a browser can restore edits on reload.
  const snapshot = () => JSON.stringify(Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v)]).sort()));
  const p0 = config.preset;
  const original = JSON.stringify(
    Object.fromEntries(
      [
        ['shape', p0.shape],
        ['background', p0.backgroundId],
        ['color', Object.values(p0.sides).find((s) => s?.color)?.color ?? 'auto'],
        ...SIDES.flatMap((side) => [
          [`text-${side}`, p0.sides[side]?.text ?? ''],
          [`font-${side}`, p0.sides[side]?.fontId ?? 'playfair-display-bold'],
        ]),
      ].sort(),
    ),
  );

  // The little things that echo the choices: background name and thumb, the
  // collapsed "Fonts and color" line, and "Start over" only once something changed.
  function syncChrome() {
    const bg = backgroundById(value('background'));
    for (const el of backgroundNames) el.textContent = bg?.name ?? '';
    if (backgroundThumb && bg) backgroundThumb.src = `/backgrounds/thumb/${bg.id}.webp`;
    if (moreSummary) {
      const fonts = [...new Set(SIDES.filter((s) => value(`text-${s}`).trim()).map((s) => fontName(value(`font-${s}`))))];
      const color = value('color');
      const colorName = color === 'auto' ? 'Best for the background' : (TEXT_COLORS.find((c) => c.hex === color)?.name ?? color);
      moreSummary.textContent = [fonts.join(', '), colorName].filter(Boolean).join(' · ');
    }
    // Only sides with words get a font choice; an empty side has nothing to style.
    for (const row of root.querySelectorAll<HTMLElement>('[data-font-row]')) row.hidden = !value(`text-${row.dataset.fontRow}`).trim();
    if (resetButton) resetButton.hidden = snapshot() === original;
  }

  function render() {
    const spec = readSpec();
    for (const el of root.querySelectorAll<HTMLElement>('[data-warn]')) el.textContent = '';
    syncChrome();
    if ('errors' in spec) {
      current = null;
      addButton.disabled = true;
      status.textContent = spec.errors.includes('give text for at least one side')
        ? 'Add words to at least one side.'
        : `Check your design: ${spec.errors.join('; ')}`;
      return;
    }
    current = spec;
    addButton.disabled = false;
    if (status.dataset.kind !== 'added') status.textContent = '';
    const placements = placementsInBrowser(spec);
    preview.innerHTML = frameSvg(spec, placements, { idPrefix: 'pdp', label: 'Preview of your frame' });
    for (const p of placements) {
      for (const w of p.warnings) {
        const el = root.querySelector<HTMLElement>(`[data-warn="${p.side}"]`);
        if (el) el.textContent = `${SIDE_LABEL[p.side]} is long, so it prints small (${w.sizePt.toFixed(0)} pt). Shorter words will print larger.`;
      }
    }
  }

  function reset() {
    const p = config.preset;
    (field('shape') as RadioNodeList).value = p.shape;
    (field('background') as RadioNodeList).value = p.backgroundId;
    for (const side of SIDES) {
      (field(`text-${side}`) as HTMLInputElement).value = p.sides[side]?.text ?? '';
      (field(`font-${side}`) as HTMLSelectElement).value = p.sides[side]?.fontId ?? 'playfair-display-bold';
    }
    (field('color') as HTMLSelectElement).value = Object.values(p.sides).find((s) => s?.color)?.color ?? 'auto';
    status.dataset.kind = '';
    render();
    // The button hides itself now, so put focus somewhere useful and say what happened.
    (field('text-top') as HTMLInputElement).focus();
    status.textContent = 'Back to our design.';
  }

  // Enter (the phone keyboard's "Done") closes the keyboard; it never adds to the cart.
  form.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (e.key === 'Enter' && t instanceof HTMLInputElement && t.type === 'text') {
      e.preventDefault();
      t.blur();
    }
  });

  let customized = false;
  form.addEventListener('input', () => {
    if (!customized) track('customize');
    customized = true;
    status.dataset.kind = '';
    render();
  });
  resetButton?.addEventListener('click', reset);

  // Background sheet (phones). From md up the same element shows inline and these
  // never run, because the open button is hidden there.
  if (picker) {
    root.querySelector('[data-bg-open]')?.addEventListener('click', () => {
      picker.showModal();
      // Focus the current choice, not the first swatch, so a key press doesn't change it.
      const checked = picker.querySelector<HTMLInputElement>('input[name="background"]:checked');
      checked?.focus({ preventScroll: true });
      const scroller = picker.querySelector<HTMLElement>('[data-bg-scroll]');
      const label = checked?.closest('label');
      if (scroller && label) scroller.scrollTop = label.offsetTop - scroller.offsetTop - scroller.clientHeight / 2 + label.clientHeight / 2;
    });
    // Rotating a phone past md shows the picker inline; don't leave a modal behind.
    matchMedia('(min-width: 48rem)').addEventListener('change', (e) => {
      if (e.matches && picker.open) picker.close();
    });
    root.querySelector('[data-bg-done]')?.addEventListener('click', () => picker.close());
    // A tap on the scrim (the dialog box itself, outside its content) closes it.
    picker.addEventListener('click', (e) => {
      if (e.target !== picker) return;
      const r = picker.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) picker.close();
    });
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    render();
    if (!current) return;
    // Quantity is set in the cart; adding here is one tap.
    addToCart(config.handle, current, 1);
    track('add_to_cart', { d: snapshot() === original ? 'as_designed' : 'customized' });
    status.dataset.kind = 'added';
    status.innerHTML = `Added to your cart. <a href="/cart">View cart and check out</a>`;
  });

  // The server drew the preset with the print renderer's metrics; redraw once the
  // fonts are in so later edits and the first frame agree.
  void fontsReady().then(render);
}

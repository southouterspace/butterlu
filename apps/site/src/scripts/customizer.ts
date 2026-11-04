// Live customizer on the product page. Reads the form into a FrameSpec, checks it
// with the shared design rules, fits the text with the shared layout rules, and
// redraws the preview. The spec it adds to the cart is what the frame MCP prints.
import { BACKGROUNDS, type FrameSpec, type HexColor, SIDES, type Side, backgroundById } from '@butterlu/frame';
import { SIDE_LABEL, parseDesign } from '@butterlu/frame/design';
import { frameSvg } from '../lib/frame-svg';
import { addToCart } from './cart';
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
  const backgroundName = root.querySelector<HTMLElement>('[data-background-name]')!;
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

  function render() {
    const spec = readSpec();
    for (const el of root.querySelectorAll<HTMLElement>('[data-warn]')) el.textContent = '';
    backgroundName.textContent = backgroundById(value('background'))?.name ?? '';
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
    render();
  }

  form.addEventListener('input', () => {
    status.dataset.kind = '';
    render();
  });
  root.querySelector('[data-reset]')?.addEventListener('click', reset);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    render();
    if (!current) return;
    const quantity = Math.max(1, Math.min(10, Number.parseInt(value('quantity'), 10) || 1));
    addToCart(config.handle, current, quantity);
    status.dataset.kind = 'added';
    status.innerHTML = `Added to your cart. <a href="/cart">View cart and check out</a>`;
  });

  // The server drew the preset with the print renderer's metrics; redraw once the
  // fonts are in so later edits and the first frame agree.
  void fontsReady().then(render);
  // Warm the cache for the full-size backgrounds a shopper is likely to try.
  for (const b of BACKGROUNDS.slice(0, 6)) new Image().src = `/backgrounds/${b.id}.webp`;
}

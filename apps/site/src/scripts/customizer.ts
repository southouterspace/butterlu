// Live customizer on the product page. Reads the form into a FrameSpec, checks it
// with the shared design rules, fits the text with the shared layout rules, and
// redraws the preview. The spec it adds to the cart is what the print file is made from.
import {
  BACKGROUND_SCALE,
  type BackgroundFit,
  DEFAULT_BACKGROUND_FIT,
  FONTS,
  type FrameSpec,
  type HexColor,
  SIDES,
  type Side,
  backgroundById,
  backgroundRect,
  backgroundSlack,
} from '@butterlu/frame';
import { SIDE_LABEL, TEXT_COLORS, describeFit, parseDesign, parseFit } from '@butterlu/frame/design';
import { backgroundAttrs, backgroundUrl, frameSvg } from '../lib/frame-svg';
import { loadNow, whenIdle } from './idle';
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
    const backgroundFit = { scale: Number(value('bg-scale')) / 100, x: Number(value('bg-x')) / 100, y: Number(value('bg-y')) / 100 };
    const r = parseDesign({ shape: value('shape'), backgroundId: value('background'), sides, backgroundFit });
    return r.ok ? r.spec : { errors: r.errors };
  }

  let current: FrameSpec | null = config.preset;

  const fontName = (id: string) => FONTS.find((f) => f.id === id)?.name.replace(/ (Bold|SemiBold)$/, '') ?? id;
  // What the form holds, and what it holds for the preset. The baseline comes from the
  // preset, not the page's first state, because a browser can restore edits on reload.
  // Background size and position are compared as the fit they print, not as raw
  // slider values: a sideways nudge at 100% changes nothing.
  const snapshot = () =>
    JSON.stringify(Object.fromEntries([...new FormData(form).entries()].filter(([k]) => !k.startsWith('bg-')).map(([k, v]) => [k, String(v)]).sort()));
  const p0 = config.preset;
  // The fit is read on its own, so the sliders keep working while the words are
  // invalid (every side empty), and both sides of a comparison go through one parser.
  const fitOf = (raw: unknown, shape: string) => parseFit(raw, shape as FrameSpec['shape']) ?? DEFAULT_BACKGROUND_FIT;
  const sameFit = (a: BackgroundFit, b: BackgroundFit) => a.scale === b.scale && a.x === b.x && a.y === b.y;
  const presetFit = fitOf(p0.backgroundFit, p0.shape);
  const currentFit = () => fitOf({ scale: Number(value('bg-scale')) / 100, x: Number(value('bg-x')) / 100, y: Number(value('bg-y')) / 100 }, value('shape'));
  const asDesigned = (fit = currentFit()) => snapshot() === original && sameFit(fit, presetFit);
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
    const fit = currentFit();
    syncFit(fit);
    if (resetButton) resetButton.hidden = asDesigned(fit);
  }

  // Background size and position: the value each slider speaks, the filled part of
  // its track, the collapsed summary line, and whether an axis has room to move.
  const fitSummary = root.querySelector<HTMLElement>('[data-fit-summary]');
  const fitReset = root.querySelector<HTMLButtonElement>('[data-fit-reset]');
  const scaleOut = root.querySelector<HTMLOutputElement>('[data-fit-out="scale"]');
  const fitInput = (name: 'bg-scale' | 'bg-x' | 'bg-y') => field(name) as HTMLInputElement | null;
  const toward = (v: number, lo: string, hi: string) => (v === 0 ? 'Centered' : `${Math.abs(v)} percent toward the ${v < 0 ? lo : hi}`);
  function syncFit(fit: BackgroundFit) {
    const scale = fitInput('bg-scale');
    if (!scale) return;
    const hints: string[] = [];
    const shape = value('shape') as FrameSpec['shape'];
    const slack = backgroundSlack(shape, Number(scale.value) / 100);
    for (const [name, axis, lo, hi] of [
      ['bg-x', 'x', 'left', 'right'],
      ['bg-y', 'y', 'top', 'bottom'],
    ] as const) {
      const input = fitInput(name);
      if (!input) continue;
      const stuck = slack[axis] < 1e-6;
      // Focus stays put if the slider in hand is the one turning off. A slider with
      // no room goes back to the middle, which is where the print has it.
      if (input.disabled !== stuck) input.disabled = stuck;
      if (stuck) input.value = '0';
      const hint = root.querySelector<HTMLElement>(`[data-fit-hint="${axis}"]`);
      if (hint) {
        hint.hidden = !stuck;
        // A disabled slider can't take focus, so the size slider carries its hint.
        if (stuck) hints.push(hint.id);
      }
      const v = Number(input.value);
      input.setAttribute('aria-valuetext', stuck ? 'Centered' : toward(v, lo, hi));
      input.style.setProperty('--fill', `${(v + 100) / 2}%`);
    }
    const pct = Number(scale.value);
    scale.setAttribute('aria-valuetext', `${pct} percent`);
    const span = (BACKGROUND_SCALE.max - BACKGROUND_SCALE.min) * 100;
    scale.style.setProperty('--fill', `${((pct - BACKGROUND_SCALE.min * 100) / span) * 100}%`);
    if (hints.length) scale.setAttribute('aria-describedby', hints.join(' '));
    else scale.removeAttribute('aria-describedby');
    if (scaleOut) scaleOut.textContent = `${pct}%`;
    if (fitSummary) {
      const d = describeFit(fit);
      fitSummary.textContent = d.charAt(0).toUpperCase() + d.slice(1);
    }
    if (fitReset) fitReset.hidden = sameFit(fit, presetFit);
  }
  const setFit = (f: BackgroundFit) => {
    fitInput('bg-scale')!.value = String(Math.round(f.scale * 100));
    fitInput('bg-x')!.value = String(Math.round(f.x * 100));
    fitInput('bg-y')!.value = String(Math.round(f.y * 100));
  };

  // Dragging a slider fires many input events. Only the background moves, so move
  // the preview's image in place, once per frame, instead of redrawing the frame.
  let fitFrame = 0;
  function moveBackground() {
    fitFrame = 0;
    const image = preview.querySelector<SVGImageElement>('[data-bg-image]');
    if (!image) return render();
    const spec = readSpec();
    // With invalid words the cart stays off (render said why), but the background still moves.
    if (!('errors' in spec)) current = spec;
    const rect = backgroundRect(value('shape') as FrameSpec['shape'], currentFit());
    for (const [k, v] of Object.entries(backgroundAttrs(rect))) image.setAttribute(k, v);
    syncChrome();
  }

  // Backgrounds: the preview keeps showing the last decoded background until the
  // chosen one is ready, so it never flashes blank. Hovering, pressing or focusing
  // a swatch starts the download early.
  const ready = new Set<string>([config.preset.backgroundId]);
  const loading = new Set<string>();
  let shownBackground: string = config.preset.backgroundId;
  let wantedBackground = shownBackground;
  function warm(id: string) {
    if (!id || ready.has(id) || loading.has(id)) return;
    loading.add(id);
    const img = new Image();
    img.src = backgroundUrl(id);
    img.decode().then(
      () => {
        loading.delete(id);
        ready.add(id);
        if (id === wantedBackground) render();
      },
      () => {
        // Failed: don't mark it ready (a later press retries), but stop holding the
        // old background; the preview's own <image> tries the chosen one.
        loading.delete(id);
        if (id === wantedBackground) {
          shownBackground = id;
          render();
        }
      },
    );
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
    wantedBackground = spec.backgroundId;
    if (ready.has(spec.backgroundId)) shownBackground = spec.backgroundId;
    else if (shownBackground !== spec.backgroundId) warm(spec.backgroundId);
    preview.setAttribute('aria-busy', String(shownBackground !== spec.backgroundId));
    preview.innerHTML = frameSvg({ ...spec, backgroundId: shownBackground as typeof spec.backgroundId }, placements, { idPrefix: 'pdp', label: 'Preview of your frame' });
    for (const p of placements) {
      for (const w of p.warnings) {
        const el = root.querySelector<HTMLElement>(`[data-warn="${p.side}"]`);
        if (el) el.textContent = `${SIDE_LABEL[p.side]} is long, so it prints small (${w.sizePt.toFixed(0)} pt). Shorter words will print larger.`;
      }
    }
  }

  function reset() {
    const p = config.preset;
    clearIdeaUndo();
    (field('shape') as RadioNodeList).value = p.shape;
    (field('background') as RadioNodeList).value = p.backgroundId;
    for (const side of SIDES) {
      (field(`text-${side}`) as HTMLInputElement).value = p.sides[side]?.text ?? '';
      (field(`font-${side}`) as HTMLSelectElement).value = p.sides[side]?.fontId ?? 'playfair-display-bold';
    }
    (field('color') as HTMLSelectElement).value = Object.values(p.sides).find((s) => s?.color)?.color ?? 'auto';
    if (fitInput('bg-scale')) setFit(presetFit);
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
  let clearIdeaUndo = () => {};
  form.addEventListener('input', (e) => {
    if (!customized) track('customize');
    customized = true;
    status.dataset.kind = '';
    if ((e.target as HTMLInputElement | null)?.name?.startsWith('bg-')) {
      fitFrame ||= requestAnimationFrame(moveBackground);
      return;
    }
    render();
  });
  resetButton?.addEventListener('click', reset);
  // Smaller and Bigger step the size slider for anyone who'd rather not drag it.
  root.querySelectorAll<HTMLButtonElement>('[data-fit-step]').forEach((b) =>
    b.addEventListener('click', () => {
      const scale = fitInput('bg-scale');
      if (!scale) return;
      const next = Math.min(Number(scale.max), Math.max(Number(scale.min), Number(scale.value) + Number(b.dataset.fitStep)));
      if (String(next) === scale.value) {
        status.textContent = `The background is already at its ${next >= Number(scale.max) ? 'biggest' : 'smallest'}.`;
        return;
      }
      scale.value = String(next);
      scale.dispatchEvent(new Event('input', { bubbles: true }));
      // A slider speaks its own value; a button press needs saying.
      status.textContent = `Background size ${next}%.`;
    }),
  );
  fitReset?.addEventListener('click', () => {
    setFit(presetFit);
    status.dataset.kind = '';
    render();
    // The button hides itself, so hand focus to the size slider and say what happened.
    fitInput('bg-scale')?.focus();
    status.textContent = 'Background size and position reset.';
  });

  // A wording idea fills every side it names and clears the rest; fonts stay as chosen.
  // The words it replaced come back with Undo until the shopper types again.
  const ideasBox = root.querySelector<HTMLElement>('[data-ideas]');
  const undoIdea = root.querySelector<HTMLButtonElement>('[data-idea-undo]');
  let beforeIdea: Partial<Record<Side, string>> | null = null;
  const setTexts = (texts: Partial<Record<Side, string>>) => {
    for (const side of SIDES) (field(`text-${side}`) as HTMLInputElement).value = texts[side] ?? '';
  };
  if (ideasBox) ideasBox.hidden = false;
  clearIdeaUndo = () => {
    beforeIdea = null;
    if (undoIdea) undoIdea.hidden = true;
  };
  ideasBox?.addEventListener('click', (e) => {
    const button = (e.target as Element | null)?.closest<HTMLButtonElement>('[data-idea]');
    if (!button) return;
    beforeIdea ??= Object.fromEntries(SIDES.map((side) => [side, value(`text-${side}`)]));
    setTexts(JSON.parse(button.dataset.idea ?? '{}') as Partial<Record<Side, string>>);
    if (!customized) track('customize');
    customized = true;
    status.dataset.kind = '';
    render();
    if (undoIdea) undoIdea.hidden = false;
    status.textContent = 'Wording idea added. Edit any line to make it yours.';
  });
  undoIdea?.addEventListener('click', () => {
    if (beforeIdea) setTexts(beforeIdea);
    beforeIdea = null;
    undoIdea.hidden = true;
    status.dataset.kind = '';
    render();
    status.textContent = 'Your words are back.';
    (field('text-top') as HTMLInputElement).focus();
  });
  // Typing makes the current words the shopper's own, so there's nothing to undo.
  form.addEventListener('input', () => {
    beforeIdea = null;
    if (undoIdea) undoIdea.hidden = true;
  });

  const swatchValue = (e: Event) =>
    (e.target as Element | null)?.closest('label')?.querySelector<HTMLInputElement>('input[name="background"]')?.value ?? '';
  // Pressing or focusing a swatch warms its full image at once. A mouse resting on
  // one for 200 ms does too; merely sweeping across the grid downloads nothing.
  for (const type of ['pointerdown', 'focusin']) form.addEventListener(type, (e) => warm(swatchValue(e)));
  let hoverTimer = 0;
  form.addEventListener('pointerover', (e) => {
    if ((e as PointerEvent).pointerType !== 'mouse') return;
    clearTimeout(hoverTimer);
    const id = swatchValue(e);
    if (id) hoverTimer = window.setTimeout(() => warm(id), 200);
  });
  form.addEventListener('pointerout', () => clearTimeout(hoverTimer));
  // The sheet's swatches are lazy; queue them once the page is idle so it opens painted.
  if (picker) whenIdle(() => loadNow(picker));

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
    track('add_to_cart', { d: asDesigned() ? 'as_designed' : 'customized' });
    status.dataset.kind = 'added';
    status.innerHTML = `Added to your cart. <a href="/cart">View cart and check out</a>`;
  });

  // The server drew the preset with the print renderer's metrics; redraw once the
  // fonts are in so later edits and the first frame agree.
  void fontsReady().then(render);
}

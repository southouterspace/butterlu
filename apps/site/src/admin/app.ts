// Store admin (docs/13): Asli's editor for ready-made designs ("templates"), category
// pages, the shop-by lists, page components (the homepage's Hero Image, Value Props) and the
// shared questions, with Claude-drafted SEO she approves. Talks to
// /api/admin/* (worker/catalog-admin.ts). Every edit saves as a draft over the live
// catalog; nothing here changes the store until a publish.
//
// Plain DOM, no framework: every value from the server goes in with textContent or
// an attribute, never as HTML.
import { BACKGROUND_SCALE, SHAPE_IDS, SIDES, type FrameSpec, type Side } from '@butterlu/frame';
import { SEO_LABELS, SEO_LIMITS, TITLE_SUFFIX, checkTemplate, slugify, toLabel, type SeoKey } from '../catalog/check';
import type { CatalogDoc, CategoryDoc, SeoField, TemplateDoc } from '../catalog/doc';
import {
  LIMITS,
  MAX_QUESTIONS,
  MAX_SECTIONS,
  MAX_VALUE_PROPS,
  SECTION_TYPES,
  VALUE_PROP_ICONS,
  newSection,
  type HeroImageSection,
  type PageDoc,
  type QuestionDoc,
  type SectionDoc,
  type SectionType,
  type ValuePropIcon,
  type ValuePropsSection,
} from '../catalog/pages';
import { ILLUSTRATIONS } from '../catalog/illustrations';
import { backgroundUrl, frameSvg } from '../lib/frame-svg';
import { fontsReady, placementsInBrowser } from '../scripts/measure';

interface CatalogResponse {
  doc: CatalogDoc;
  liveHandles: { templates: string[]; categories: string[] };
  changes: { kind: string; id: string; name: string; isNew: boolean; stale: boolean; at: string; by: string | null }[];
  check: { errors: string[]; warnings: string[] };
  setup: { claude: boolean; publish: boolean; signIn?: 'workos' | 'password' | 'off' };
  backgrounds: { id: string; name: string; defaultTextColor: string }[];
  fonts: { id: string; name: string }[];
  textColors: { name: string; hex: string }[];
  me: string;
}

// Same lists as catalog/doc.ts, kept here so the page doesn't bundle the whole catalog.
const TEMPLATE_SEO = ['seoTitle', 'seoDescription', 'altText', 'feedTitle', 'feedDescription'] as const satisfies readonly SeoKey[];
const CATEGORY_SEO = ['seoTitle', 'seoDescription'] as const satisfies readonly SeoKey[];
const SHAPE_LABEL: Record<string, string> = { scalloped: 'Scalloped', 'rounded-rectangle': 'Rounded' };
const SIDE_LABEL: Record<Side, string> = { top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left' };
const STALE = 'The site has changed this since your edits were started. Check it over, or use Undo my edits to start again from what the site shows.';
const STATUS_LABEL: Record<string, string> = { live: 'Live', draft: 'Draft', hidden: 'Hidden' };

let data: CatalogResponse;
const root = document.getElementById('admin')!;

// ---------- small DOM helpers ----------

type Attrs = Record<string, string | number | boolean | undefined | ((e: Event) => void)>;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: (Node | string | null | undefined | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v);
    else if (k === 'class') el.className = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids) if (kid !== null && kid !== undefined && kid !== false) el.append(kid);
  return el;
}

let uid = 0;
const id = (p: string) => `${p}-${++uid}`;

function field(label: string, control: HTMLElement, hint?: string): HTMLElement {
  const cid = control.id || id('f');
  control.id = cid;
  return h('div', { class: 'field' }, h('label', { for: cid }, label), control, hint ? h('p', { class: 'hint' }, hint) : null);
}

function input(value: string, attrs: Attrs = {}): HTMLInputElement {
  const el = h('input', { type: 'text', ...attrs });
  el.value = value;
  return el;
}

/** A label input: Title Case and "&" for "and" are applied when she leaves the field (Justin's rule). */
function labelInput(value: string, attrs: Attrs = {}, onFix?: (v: string) => void): HTMLInputElement {
  const el = input(value, attrs);
  el.addEventListener('change', () => {
    const fixed = toLabel(el.value);
    if (fixed !== el.value) el.value = fixed;
    onFix?.(fixed);
  });
  return el;
}

function textarea(value: string, attrs: Attrs = {}): HTMLTextAreaElement {
  const el = h('textarea', { rows: 3, ...attrs });
  el.value = value;
  return el;
}

function select(options: { value: string; label: string }[], value: string, attrs: Attrs = {}): HTMLSelectElement {
  const el = h('select', attrs, ...options.map((o) => h('option', { value: o.value }, o.label)));
  el.value = value;
  return el;
}

function toast(text: string, tone: 'ok' | 'bad' = 'ok') {
  const el = document.getElementById('toast')!;
  el.textContent = text;
  el.dataset.tone = tone;
  el.hidden = false;
  clearTimeout((el as unknown as { t?: number }).t);
  (el as unknown as { t?: number }).t = window.setTimeout(() => (el.hidden = true), 5000);
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(init.headers ?? {}) },
    credentials: 'same-origin',
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; details?: string[] };
  // A session that ended: reload, which shows the sign-in page. Unsaved edits on the
  // form are lost, which is why the session lasts a week.
  if (res.status === 401 && data?.setup.signIn === 'workos') location.reload();
  if (!res.ok) throw new Error([body.error ?? `Error ${res.status}`, ...(body.details ?? [])].join('\n'));
  return body as T;
}

async function reload() {
  data = await api<CatalogResponse>('/catalog');
}

// ---------- frame preview ----------

let previewN = 0;
function preview(spec: FrameSpec, label?: string, size: 'card' | 'full' = 'card'): HTMLElement {
  const box = h('div', { class: 'preview' });
  try {
    box.innerHTML = frameSvg(spec, placementsInBrowser(spec), { idPrefix: `p${++previewN}`, label, photoHint: size === 'full', size });
  } catch {
    box.append(h('p', { class: 'hint' }, 'Add some words to see the frame.'));
  }
  return box;
}

const blankSpec = (): FrameSpec => ({
  shape: SHAPE_IDS[0]!,
  backgroundId: data.backgrounds[0]!.id as FrameSpec['backgroundId'],
  sides: { top: { text: 'Your words here', fontId: data.fonts[0]!.id } },
});

// ---------- SEO fields ----------

function badge(f: SeoField): HTMLElement {
  if (f.status === 'approved') return h('span', { class: 'badge ok' }, f.source === 'site' ? 'On the site' : `Approved${f.by ? ` by ${f.by}` : ''}`);
  if (f.status === 'draft') return h('span', { class: 'badge warn' }, "Claude's draft, not approved");
  return h('span', { class: 'badge' }, 'Empty');
}

/**
 * One SEO field: the text, a live count against the limit, "Draft with Claude", and
 * Approve for a draft. `get()` returns the field as it should be saved.
 */
function seoEditor(kind: 'template' | 'category', key: SeoKey, start: SeoField, itemNow: () => Record<string, unknown>, save: () => Promise<boolean>) {
  let state: SeoField = { ...start };
  const limit = SEO_LIMITS[key];
  const area = key === 'seoTitle' || key === 'feedTitle' ? input(state.value, { maxlength: limit + 40 }) : textarea(state.value, { rows: key === 'feedDescription' ? 5 : 3 });
  const count = h('span', { class: 'count', 'aria-live': 'polite' });
  const status = h('span', {});
  const options = h('div', { class: 'options' });
  const draftBtn = h('button', { type: 'button', class: 'btn' }, 'Draft with Claude');
  const approveBtn = h('button', { type: 'button', class: 'btn primary' }, 'Approve');

  const paint = () => {
    const n = area.value.length;
    count.textContent = `${n} / ${limit}`;
    count.classList.toggle('over', n > limit);
    status.replaceChildren(badge(state));
    approveBtn.hidden = state.status !== 'draft';
  };
  // Claude's words stay a draft until Approve; rewording them makes them hers. The server
  // decides the same way from Claude's saved options, so this only keeps the badge honest.
  const squash = (v: string) => v.replace(/\s+/g, ' ').trim();
  let picked = start.status === 'draft' ? start.value : '';
  area.addEventListener('input', () => {
    const v = area.value;
    if (!v.trim()) state = { value: '', status: 'empty' };
    else if (picked && squash(v) === squash(picked)) state = { value: v, status: 'draft', source: 'claude' };
    else state = { value: v, status: 'approved', source: 'hand' };
    paint();
  });

  if (!data.setup.claude) {
    draftBtn.disabled = true;
    draftBtn.title = 'Claude drafts switch on once an API key is added to the site.';
  }
  draftBtn.addEventListener('click', async () => {
    draftBtn.disabled = true;
    draftBtn.textContent = 'Claude is writing…';
    options.replaceChildren();
    try {
      const item = itemNow();
      const res = await api<{ options: string[] }>('/seo/draft', { method: 'POST', body: JSON.stringify({ kind, id: item.handle, field: key, item }) });
      options.append(
        h('p', { class: 'hint' }, 'Pick one to put it in the field. It stays a draft until you approve it.'),
        ...res.options.map((o) =>
          h(
            'button',
            {
              type: 'button',
              class: 'option',
              onclick: () => {
                area.value = o;
                state = { value: o, status: 'draft', source: 'claude' };
                picked = o;
                options.replaceChildren();
                paint();
              },
            },
            h('span', {}, o),
            h('span', { class: 'count' }, `${o.length} / ${limit}`),
          ),
        ),
      );
    } catch (e) {
      options.append(h('p', { class: 'error' }, (e as Error).message));
    } finally {
      draftBtn.disabled = !data.setup.claude;
      draftBtn.textContent = 'Draft with Claude';
    }
  });
  approveBtn.addEventListener('click', async () => {
    approveBtn.disabled = true;
    try {
      if (!(await save())) return;
      const item = itemNow();
      const res = await api<{ field: SeoField }>('/seo/approve', { method: 'POST', body: JSON.stringify({ kind, id: item.handle, field: key }) });
      state = res.field;
      picked = '';
      paint();
      toast(`${SEO_LABELS[key]} approved.`);
    } catch (e) {
      toast((e as Error).message, 'bad');
    } finally {
      approveBtn.disabled = false;
    }
  });

  paint();
  const el = h(
    'div',
    { class: 'seo-field' },
    h('div', { class: 'seo-head' }, h('label', { for: area.id || (area.id = id('seo')) }, SEO_LABELS[key]), status, count),
    area,
    h('div', { class: 'row' }, draftBtn, approveBtn),
    options,
  );
  return { el, get: () => ({ ...state, value: area.value.trim() }), area };
}

function searchPreview(title: () => string, desc: () => string, path: () => string): HTMLElement {
  const t = h('p', { class: 'serp-title' });
  const u = h('p', { class: 'serp-url' });
  const d = h('p', { class: 'serp-desc' });
  const paint = () => {
    t.textContent = `${title() || 'No search title yet'}${TITLE_SUFFIX}`;
    u.textContent = `butterlu.com${path()}`;
    d.textContent = desc() || 'No search description yet.';
  };
  paint();
  const box = h('div', { class: 'serp', 'aria-label': 'How it could look in Google' }, h('p', { class: 'hint' }, 'In Google, roughly'), u, t, d);
  (box as unknown as { paint: () => void }).paint = paint;
  return box;
}

// ---------- templates ----------

const filters = { q: '', for: '', occasion: '', status: '' };

function recipientOptions() {
  return [
    { value: '', label: 'Choose…' },
    ...data.doc.taxonomy.groups.flatMap((g) => g.children.map((r) => ({ value: r.key, label: `${g.label}: ${r.label}` }))),
  ];
}

function templateList() {
  const { templates, taxonomy } = data.doc;
  const q = filters.q.trim().toLowerCase();
  const shown = templates.filter(
    (t) =>
      (!q || t.name.toLowerCase().includes(q) || t.handle.includes(q)) &&
      (!filters.for || t.for === filters.for || taxonomy.groups.find((g) => g.key === filters.for)?.children.some((c) => c.key === t.for)) &&
      (!filters.occasion || t.occasions.includes(filters.occasion)) &&
      (!filters.status || t.status === filters.status),
  );
  const changed = new Set(data.changes.filter((c) => c.kind === 'template').map((c) => c.id));
  const grid = h(
    'ul',
    { class: 'grid' },
    ...shown.map((t) =>
      h(
        'li',
        {},
        h(
          'button',
          { type: 'button', class: 'card', onclick: () => openTemplate(t.handle) },
          preview(t.preset),
          h('span', { class: 'card-name' }, t.name || t.handle),
          h(
            'span',
            { class: 'row' },
            h('span', { class: `badge ${t.status === 'live' ? 'ok' : ''}` }, STATUS_LABEL[t.status] ?? t.status),
            changed.has(t.handle) ? h('span', { class: 'badge warn' }, 'Edited') : null,
            Object.values(t.seo).some((f) => f.status === 'draft') ? h('span', { class: 'badge warn' }, 'SEO to approve') : null,
          ),
        ),
      ),
    ),
  );

  const forFilter = select(
    [{ value: '', label: 'Anyone' }, ...taxonomy.groups.flatMap((g) => [{ value: g.key, label: g.label }, ...g.children.map((r) => ({ value: r.key, label: `  ${r.label}` }))])],
    filters.for,
    { onchange: (e) => ((filters.for = (e.target as HTMLSelectElement).value), render()) },
  );
  const occFilter = select([{ value: '', label: 'Any occasion' }, ...taxonomy.occasions.map((o) => ({ value: o.key, label: o.label }))], filters.occasion, {
    onchange: (e) => ((filters.occasion = (e.target as HTMLSelectElement).value), render()),
  });
  const statusFilter = select([{ value: '', label: 'Any status' }, ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))], filters.status, {
    onchange: (e) => ((filters.status = (e.target as HTMLSelectElement).value), render()),
  });
  const search = input(filters.q, { type: 'search', placeholder: 'Search by name' });
  search.addEventListener('input', () => {
    filters.q = search.value;
    const pos = search.selectionStart;
    render();
    const again = root.querySelector<HTMLInputElement>('input[type=search]');
    again?.focus();
    if (again && pos !== null) again.setSelectionRange(pos, pos);
  });

  return h(
    'section',
    {},
    h('div', { class: 'toolbar' }, h('h1', {}, 'Ready-made designs'), h('button', { type: 'button', class: 'btn primary', onclick: () => openTemplate(null) }, 'New design')),
    h('div', { class: 'filters' }, field('Search', search), field("Who it's for", forFilter), field('Occasion', occFilter), field('Status', statusFilter)),
    h('p', { class: 'hint' }, `${shown.length} of ${templates.length} designs`),
    grid,
  );
}

function openTemplate(handle: string | null) {
  location.hash = handle ? `#/designs/${handle}` : '#/designs/new';
}

function templateEditor(handle: string | null): HTMLElement {
  const existing = handle ? data.doc.templates.find((t) => t.handle === handle) : undefined;
  if (handle && !existing) return h('p', {}, 'That design was not found. ', h('a', { href: '#/designs' }, 'Back to designs'));
  const isNew = !existing;
  const isLive = existing ? data.liveHandles.templates.includes(existing.handle) : false;
  const t: TemplateDoc = existing
    ? structuredClone(existing)
    : {
        handle: '',
        name: '',
        status: 'draft',
        hasPage: false,
        preset: blankSpec(),
        for: '',
        occasions: [],
        collections: [],
        readyAsShown: true,
        intro: '',
        goodFor: [],
        ideas: [],
        seo: Object.fromEntries(TEMPLATE_SEO.map((k) => [k, { value: '', status: 'empty' }])) as TemplateDoc['seo'],
      };

  const previewBox = h('div', { class: 'big-preview' });
  const issues = h('div', { class: 'issues', 'aria-live': 'polite' });
  const repaint = () => {
    previewBox.replaceChildren(preview(t.preset, `Preview of ${t.name || 'this design'}`, 'full'));
    const r = checkTemplate(collect(), data.doc);
    issues.replaceChildren(
      ...(r.errors.length ? [h('p', { class: 'error' }, t.status === 'live' ? 'Fix before it can go live:' : 'Needed before it can go live:'), h('ul', {}, ...r.errors.map((e) => h('li', {}, e)))] : []),
      ...(r.warnings.length ? [h('ul', { class: 'hint' }, ...r.warnings.map((w) => h('li', {}, w)))] : []),
    );
  };

  // Basics
  const name = labelInput(t.name, { maxlength: 80, required: true }, (v) => ((t.name = v), repaint()));
  const handleIn = input(t.handle, { maxlength: 80, pattern: '[a-z0-9-]+', disabled: !isNew });
  let handleTouched = !isNew;
  handleIn.addEventListener('input', () => (handleTouched = true));
  name.addEventListener('input', () => {
    t.name = name.value;
    if (!handleTouched) handleIn.value = slugify(name.value);
    repaint();
  });
  const status = select(Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })), t.status, {
    onchange: () => ((t.status = status.value as TemplateDoc['status']), repaint()),
  });
  const ready = h('input', { type: 'checkbox', checked: t.readyAsShown, onchange: () => (t.readyAsShown = ready.checked) });

  // Design
  const shape = select(SHAPE_IDS.map((s) => ({ value: s, label: SHAPE_LABEL[s] ?? s })), t.preset.shape, {
    onchange: () => ((t.preset.shape = shape.value as FrameSpec['shape']), repaint()),
  });
  const bgGrid = h(
    'div',
    { class: 'swatches', role: 'radiogroup', 'aria-label': 'Background' },
    ...data.backgrounds.map((b) => {
      const r = h('input', {
        type: 'radio',
        name: 'bg',
        value: b.id,
        checked: t.preset.backgroundId === b.id,
        onchange: () => {
          t.preset.backgroundId = b.id as FrameSpec['backgroundId'];
          repaint();
        },
      });
      return h('label', { class: 'swatch', title: b.name }, r, h('img', { src: backgroundUrl(b.id, 'card'), alt: '', loading: 'lazy', width: 64, height: 48 }), h('span', {}, b.name));
    }),
  );
  // Background size and position (packages/frame backgroundFit): 100% fills the frame;
  // larger zooms in, and the position sliders pick which part of the pattern shows.
  const fit = () => t.preset.backgroundFit ?? { scale: 1, x: 0, y: 0 };
  const range = (min: number, max: number, step: number, value: number, label: string, text: (v: number) => string) => {
    const r = h('input', { type: 'range', min, max, step, 'aria-label': label });
    r.value = String(value);
    r.setAttribute('aria-valuetext', text(value));
    return r;
  };
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const side = (v: number, lo: string, hi: string) => (Math.abs(v) < 0.01 ? 'centred' : `${Math.round(Math.abs(v) * 100)}% toward the ${v < 0 ? lo : hi}`);
  const scaleIn = range(BACKGROUND_SCALE.min, BACKGROUND_SCALE.max, BACKGROUND_SCALE.step, fit().scale, 'Background size', pct);
  const xIn = range(-1, 1, 0.05, fit().x, 'Background position, left to right', (v) => side(v, 'left', 'right'));
  const yIn = range(-1, 1, 0.05, fit().y, 'Background position, top to bottom', (v) => side(v, 'top', 'bottom'));
  const scaleOut = h('output', {});
  const posBox = h('div', { class: 'row' }, field('Left and right', xIn), field('Up and down', yIn));
  const syncFit = () => {
    const f = { scale: Number(scaleIn.value), x: Number(xIn.value), y: Number(yIn.value) };
    if (f.scale <= 1.001) f.x = f.y = 0;
    if (f.scale <= 1.001 && !f.x && !f.y) delete t.preset.backgroundFit;
    else t.preset.backgroundFit = f;
    scaleOut.textContent = pct(f.scale);
    scaleIn.setAttribute('aria-valuetext', pct(f.scale));
    xIn.setAttribute('aria-valuetext', side(f.x, 'left', 'right'));
    yIn.setAttribute('aria-valuetext', side(f.y, 'top', 'bottom'));
    posBox.hidden = f.scale <= 1.001;
    repaint();
  };
  for (const r of [scaleIn, xIn, yIn]) r.addEventListener('input', syncFit);
  const resetFit = h('button', { type: 'button', class: 'btn', onclick: () => ((scaleIn.value = '1'), (xIn.value = '0'), (yIn.value = '0'), syncFit()) }, 'Reset');
  scaleOut.textContent = pct(fit().scale);
  posBox.hidden = fit().scale <= 1.001;
  const fitBox = h('fieldset', { class: 'side' }, h('legend', {}, 'Background size and position'), h('div', { class: 'row' }, field('Size', scaleIn), scaleOut, resetFit), posBox);

  const sides = h(
    'div',
    { class: 'sides' },
    ...SIDES.map((side) => {
      const s = t.preset.sides[side];
      const text = input(s?.text ?? '', { maxlength: 60, placeholder: `${SIDE_LABEL[side]} words` });
      const font = select(data.fonts.map((f) => ({ value: f.id, label: f.name })), s?.fontId ?? data.fonts[0]!.id);
      const color = select([{ value: '', label: 'Background default' }, ...data.textColors.map((c) => ({ value: c.hex, label: c.name }))], s?.color ?? '');
      const rot = select(
        [
          { value: '', label: 'Default' },
          { value: '0', label: 'Upright' },
          { value: '90', label: 'Turned left' },
          { value: '-90', label: 'Turned right' },
          { value: '180', label: 'Upside down' },
        ],
        s?.rotation === undefined ? '' : String(s.rotation),
      );
      const sync = () => {
        if (!text.value.trim()) delete t.preset.sides[side];
        else
          t.preset.sides[side] = {
            text: text.value,
            fontId: font.value,
            ...(color.value ? { color: color.value as `#${string}` } : {}),
            ...(rot.value ? { rotation: Number(rot.value) as 0 | 90 | -90 | 180 } : {}),
          };
        repaint();
      };
      for (const c of [text, font, color, rot]) c.addEventListener(c === text ? 'input' : 'change', sync);
      return h('fieldset', { class: 'side' }, h('legend', {}, SIDE_LABEL[side]), field('Words', text), h('div', { class: 'row' }, field('Font', font), field('Colour', color), field('Turn', rot)));
    }),
  );

  // Filing
  const forSel = select(recipientOptions(), t.for, { onchange: () => ((t.for = forSel.value), repaint()) });
  const checks = (items: { value: string; label: string }[], chosen: string[], onChange: (v: string[]) => void, label: string) => {
    const box = h('fieldset', { class: 'checks' }, h('legend', {}, label));
    for (const it of items) {
      const c = h('input', { type: 'checkbox', value: it.value, checked: chosen.includes(it.value) });
      c.addEventListener('change', () => {
        onChange([...box.querySelectorAll<HTMLInputElement>('input:checked')].map((x) => x.value));
        repaint();
      });
      box.append(h('label', {}, c, ' ', it.label));
    }
    return box;
  };
  const occBox = checks(data.doc.taxonomy.occasions.map((o) => ({ value: o.key, label: o.label })), t.occasions, (v) => (t.occasions = v), 'Occasions');
  const catBox = checks(data.doc.categories.map((c) => ({ value: c.handle, label: c.name })), t.collections, (v) => (t.collections = v), 'Category pages it shows on');

  // Page copy
  const intro = textarea(t.intro, { maxlength: 400, rows: 3 });
  intro.addEventListener('input', () => (t.intro = intro.value));
  const goodFor = textarea(t.goodFor.join('\n'), { rows: 3 });
  goodFor.addEventListener('input', () => (t.goodFor = goodFor.value.split('\n').map((s) => s.trim()).filter(Boolean)));

  // Wording ideas
  const ideasBox = h('div', { class: 'ideas' });
  const paintIdeas = () => {
    ideasBox.replaceChildren(
      ...t.ideas.map((idea, i) =>
        h(
          'fieldset',
          { class: 'idea' },
          h('legend', {}, `Idea ${i + 1}`),
          ...(['top', 'bottom', 'left', 'right'] as const).map((side) => {
            const c = input(idea[side] ?? '', { maxlength: 60, placeholder: SIDE_LABEL[side] });
            c.addEventListener('input', () => {
              if (c.value.trim()) idea[side] = c.value;
              else delete idea[side];
            });
            return field(SIDE_LABEL[side], c);
          }),
          h(
            'div',
            { class: 'row' },
            h('button', { type: 'button', class: 'btn', onclick: () => ((t.preset.sides = Object.fromEntries(Object.entries(idea).filter(([, text]) => text?.trim()).map(([s, text]) => [s, { ...t.preset.sides[s as Side], text: text!, fontId: t.preset.sides[s as Side]?.fontId ?? data.fonts[0]!.id }])) as FrameSpec['sides']), repaint()) }, 'Try on the frame'),
            h('button', { type: 'button', class: 'btn', onclick: () => (t.ideas.splice(i, 1), paintIdeas()) }, 'Remove'),
          ),
        ),
      ),
      h('button', { type: 'button', class: 'btn', onclick: () => (t.ideas.push({ top: '' }), paintIdeas()) }, 'Add a wording idea'),
    );
  };
  paintIdeas();

  // SEO
  const itemNow = () => collect() as unknown as Record<string, unknown>;
  const seoFields = TEMPLATE_SEO.filter((k) => t.hasPage || !['seoTitle', 'seoDescription'].includes(k)).map((k) => [k, seoEditor('template', k, t.seo[k], itemNow, () => doSave(true))] as const);
  const serp = t.hasPage
    ? searchPreview(
        () => seoFields.find(([k]) => k === 'seoTitle')?.[1].area.value ?? '',
        () => seoFields.find(([k]) => k === 'seoDescription')?.[1].area.value ?? '',
        () => `/products/${t.handle}`,
      )
    : null;
  if (serp) for (const [, f] of seoFields) f.area.addEventListener('input', () => (serp as unknown as { paint: () => void }).paint());

  function collect(): TemplateDoc {
    const seo = { ...t.seo };
    for (const [k, f] of seoFields) seo[k] = f.get();
    return { ...t, name: toLabel(name.value), handle: isNew ? handleIn.value.trim() : t.handle, intro: intro.value.trim(), seo };
  }

  const saveBtn = h('button', { type: 'button', class: 'btn primary' }, isNew ? 'Save design' : 'Save changes');
  async function doSave(quiet = false): Promise<boolean> {
    const doc = collect();
    if (!doc.handle) {
      toast('Give it a name first.', 'bad');
      return false;
    }
    saveBtn.disabled = true;
    try {
      await api(`/templates/${encodeURIComponent(doc.handle)}`, { method: 'PUT', body: JSON.stringify(doc) });
      await reload();
      if (!quiet) toast(doc.status === 'live' ? 'Saved. It goes on the site with the next publish.' : 'Saved as a draft.');
      if (isNew) location.hash = `#/designs/${doc.handle}`;
      return true;
    } catch (e) {
      toast((e as Error).message, 'bad');
      return false;
    } finally {
      saveBtn.disabled = false;
    }
  }
  saveBtn.addEventListener('click', () => void doSave());

  const changed = existing && data.changes.some((c) => c.kind === 'template' && c.id === existing.handle);
  const staleNote = existing && data.changes.some((c) => c.kind === 'template' && c.id === existing.handle && c.stale) ? h('p', { class: 'error' }, STALE) : null;
  const discardBtn = changed
    ? h(
        'button',
        {
          type: 'button',
          class: 'btn',
          onclick: async () => {
            if (!confirm(isLive ? 'Throw away your edits and go back to what the site shows?' : 'Delete this unpublished design?')) return;
            await api(`/drafts/template/${encodeURIComponent(existing!.handle)}`, { method: 'DELETE' });
            await reload();
            location.hash = isLive ? `#/designs/${existing!.handle}` : '#/designs';
            render();
          },
        },
        isLive ? 'Undo my edits' : 'Delete draft',
      )
    : null;

  repaint();
  return h(
    'section',
    { class: 'editor' },
    h('p', {}, h('a', { href: '#/designs' }, '← All designs')),
    staleNote,
    h('div', { class: 'toolbar' }, h('h1', {}, isNew ? 'New design' : t.name), h('div', { class: 'row' }, discardBtn, saveBtn)),
    h(
      'div',
      { class: 'two' },
      h('div', { class: 'sticky' }, previewBox, issues),
      h(
        'div',
        {},
        h(
          'fieldset',
          { class: 'card-box' },
          h('legend', {}, 'Basics'),
          field('Name', name),
          field('Web address name', handleIn, isNew ? 'Made from the name; letters, numbers and dashes.' : 'Fixed once a design exists.'),
          h('div', { class: 'row' }, field('Status', status, 'Live designs show in the store after a publish.')),
          h('label', { class: 'inline' }, ready, ' Can be bought as shown in one tap'),
        ),
        h('fieldset', { class: 'card-box' }, h('legend', {}, 'Design'), field('Frame shape', shape), h('p', { class: 'label' }, 'Background'), bgGrid, fitBox, sides),
        h('fieldset', { class: 'card-box' }, h('legend', {}, 'Where it goes'), field("Who it's for", forSel), occBox, catBox),
        h(
          'fieldset',
          { class: 'card-box' },
          h('legend', {}, 'Words on the page'),
          field('Intro', intro, 'A sentence or two above the editor. Short, and no need to say it is personalized or ships free.'),
          field('Good for', goodFor, 'One per line, for example "Her birthday".'),
          h('p', { class: 'label' }, 'Wording ideas shoppers can load'),
          ideasBox,
        ),
        h(
          'fieldset',
          { class: 'card-box' },
          h('legend', {}, 'Search and Shopping'),
          data.setup.claude ? null : h('p', { class: 'hint' }, 'Claude drafts switch on once an Anthropic API key is added to the site. You can write these by hand meanwhile.'),
          serp,
          ...seoFields.map(([, f]) => f.el),
        ),
      ),
    ),
  );
}

// ---------- categories ----------

function categoryList() {
  const changed = new Set(data.changes.filter((c) => c.kind === 'category').map((c) => c.id));
  return h(
    'section',
    {},
    h('div', { class: 'toolbar' }, h('h1', {}, 'Category pages')),
    h('p', { class: 'hint' }, 'Each category is a page in the store. Designs are filed onto them from each design.'),
    h(
      'ul',
      { class: 'list' },
      ...data.doc.categories.map((c) =>
        h(
          'li',
          {},
          h('a', { href: `#/categories/${c.handle}` }, c.name),
          h('span', { class: 'hint' }, ` ${c.order.length} designs`),
          changed.has(c.handle) ? h('span', { class: 'badge warn' }, 'Edited') : null,
          Object.values(c.seo).some((f) => f.status === 'draft') ? h('span', { class: 'badge warn' }, 'SEO to approve') : null,
        ),
      ),
    ),
  );
}

function categoryEditor(handle: string): HTMLElement {
  const existing = data.doc.categories.find((c) => c.handle === handle);
  if (!existing) return h('p', {}, 'That category was not found. ', h('a', { href: '#/categories' }, 'Back'));
  const c: CategoryDoc = structuredClone(existing);
  const byHandle = new Map(data.doc.templates.map((t) => [t.handle, t]));

  const name = labelInput(c.name, { maxlength: 80 });
  const intro = textarea(c.intro, { maxlength: 400 });
  const body = textarea(c.body.join('\n\n'), { rows: 10 });
  const words = h('p', { class: 'hint' });
  const countWords = () => (words.textContent = `${body.value.split(/\s+/).filter(Boolean).length} words.`);
  body.addEventListener('input', countWords);
  countWords();

  const orderBox = h('ol', { class: 'order' });
  const paintOrder = () =>
    orderBox.replaceChildren(
      ...c.order.map((hdl, i) => {
        const t = byHandle.get(hdl);
        const move = (d: number) => {
          const j = i + d;
          if (j < 0 || j >= c.order.length) return;
          [c.order[i], c.order[j]] = [c.order[j]!, c.order[i]!];
          paintOrder();
          (orderBox.children[j]?.querySelector(d < 0 ? 'button' : 'button:last-of-type') as HTMLButtonElement | null)?.focus();
        };
        return h(
          'li',
          {},
          t ? preview(t.preset) : null,
          h('span', {}, t?.name ?? hdl, t && t.status !== 'live' ? ` (${STATUS_LABEL[t.status]})` : ''),
          h('button', { type: 'button', class: 'btn', 'aria-label': `Move ${t?.name ?? hdl} up`, disabled: i === 0, onclick: () => move(-1) }, '↑'),
          h('button', { type: 'button', class: 'btn', 'aria-label': `Move ${t?.name ?? hdl} down`, disabled: i === c.order.length - 1, onclick: () => move(1) }, '↓'),
        );
      }),
    );
  paintOrder();

  const related = h('fieldset', { class: 'checks' }, h('legend', {}, 'Links to other categories'));
  for (const o of data.doc.categories) {
    if (o.handle === c.handle) continue;
    const box = h('input', { type: 'checkbox', value: o.handle, checked: c.related.includes(o.handle) });
    box.addEventListener('change', () => (c.related = [...related.querySelectorAll<HTMLInputElement>('input:checked')].map((x) => x.value)));
    related.append(h('label', {}, box, ' ', o.name));
  }

  const collect = (): CategoryDoc => {
    const seo = { ...c.seo };
    for (const [k, f] of seoFields) seo[k] = f.get();
    return { ...c, name: toLabel(name.value), intro: intro.value.trim(), body: body.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean), seo };
  };
  const saveBtn = h('button', { type: 'button', class: 'btn primary' }, 'Save changes');
  async function doSave(quiet = false) {
    saveBtn.disabled = true;
    try {
      await api(`/categories/${c.handle}`, { method: 'PUT', body: JSON.stringify(collect()) });
      await reload();
      if (!quiet) toast('Saved. It goes on the site with the next publish.');
      return true;
    } catch (e) {
      toast((e as Error).message, 'bad');
      return false;
    } finally {
      saveBtn.disabled = false;
    }
  }
  saveBtn.addEventListener('click', () => void doSave());
  const seoFields = CATEGORY_SEO.map((k) => [k, seoEditor('category', k, c.seo[k], () => collect() as unknown as Record<string, unknown>, () => doSave(true))] as const);
  const serp = searchPreview(
    () => seoFields[0]![1].area.value,
    () => seoFields[1]![1].area.value,
    () => `/collections/${c.handle}`,
  );
  for (const [, f] of seoFields) f.area.addEventListener('input', () => (serp as unknown as { paint: () => void }).paint());

  const changed = data.changes.some((x) => x.kind === 'category' && x.id === c.handle);
  const staleNote = data.changes.some((x) => x.kind === 'category' && x.id === c.handle && x.stale) ? h('p', { class: 'error' }, STALE) : null;
  return h(
    'section',
    { class: 'editor' },
    h('p', {}, h('a', { href: '#/categories' }, '← All categories')),
    staleNote,
    h(
      'div',
      { class: 'toolbar' },
      h('h1', {}, c.name),
      h(
        'div',
        { class: 'row' },
        changed
          ? h(
              'button',
              {
                type: 'button',
                class: 'btn',
                onclick: async () => {
                  if (!confirm('Throw away your edits and go back to what the site shows?')) return;
                  await api(`/drafts/category/${c.handle}`, { method: 'DELETE' });
                  await reload();
                  render();
                },
              },
              'Undo my edits',
            )
          : null,
        saveBtn,
      ),
    ),
    h('fieldset', { class: 'card-box' }, h('legend', {}, 'Page'), field('Name', name), field('Intro', intro, 'A sentence or two above the designs. Short, and no need to restate the obvious.'), field('Words below the designs', body), words),
    h('fieldset', { class: 'card-box' }, h('legend', {}, 'Order of designs'), h('p', { class: 'hint' }, 'To add or remove a design here, open the design and change its category pages.'), orderBox),
    h('p', { class: 'hint' }, 'The questions under the words are the store’s shared ones. ', h('a', { href: '#/questions' }, 'Edit them under Questions'), '.'),
    h('fieldset', { class: 'card-box' }, related),
    h('fieldset', { class: 'card-box' }, h('legend', {}, 'Search'), serp, ...seoFields.map(([, f]) => f.el)),
  );
}

// ---------- shop-by lists ----------

let drawingUrls: Record<string, string> | undefined;
/** The card drawing for a group or occasion: a picker from src/catalog/illustrations.ts and a preview. */
function drawingPicker(item: { illustration?: string }): HTMLElement {
  drawingUrls ??= JSON.parse(document.getElementById('illustration-urls')?.textContent ?? '{}') as Record<string, string>;
  const preview = h('img', { class: 'drawing', alt: '', width: 48, height: 48 }) as HTMLImageElement;
  const show = () => {
    const url = item.illustration ? drawingUrls![item.illustration] : undefined;
    preview.hidden = !url;
    if (url) preview.src = url;
  };
  const pick = select([{ value: '', label: 'No drawing' }, ...ILLUSTRATIONS.map((i) => ({ value: i.key, label: i.name }))], item.illustration ?? '', {
    onchange: () => {
      // "" keeps "no drawing" as her choice, so the site's default doesn't come back.
      item.illustration = pick.value;
      show();
    },
  });
  show();
  return h('span', { class: 'row' }, field('Drawing on its card', pick), preview);
}

function shopBy(): HTMLElement {
  const tax = structuredClone(data.doc.taxonomy);
  // Every label follows the rule, including ones she doesn't touch, so a save goes through.
  const fixLabels = () => {
    for (const g of tax.groups) {
      g.label = toLabel(g.label);
      for (const c of g.children) c.label = toLabel(c.label);
    }
    for (const o of tax.occasions) o.label = toLabel(o.label);
  };
  fixLabels();
  const box = h('div', {});
  const catOptions = (blank: boolean) => [...(blank ? [{ value: '', label: 'Store search, no page of its own' }] : []), ...data.doc.categories.map((c) => ({ value: c.handle, label: c.name }))];
  const moveIn = <T>(arr: T[], i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    paint();
  };
  const ups = <T>(arr: T[], i: number, label: string) =>
    h(
      'span',
      { class: 'row' },
      h('button', { type: 'button', class: 'btn', 'aria-label': `Move ${label} up`, disabled: i === 0, onclick: () => moveIn(arr, i, -1) }, '↑'),
      h('button', { type: 'button', class: 'btn', 'aria-label': `Move ${label} down`, disabled: i === arr.length - 1, onclick: () => moveIn(arr, i, 1) }, '↓'),
    );
  const paint = () =>
    box.replaceChildren(
      h(
        'fieldset',
        { class: 'card-box' },
        h('legend', {}, "Who it's for"),
        ...tax.groups.map((g, gi) => {
          const label = labelInput(g.label, { maxlength: 60 }, (v) => (g.label = v));
          const menus = h('input', { type: 'checkbox', checked: g.inMenus, onchange: () => (g.inMenus = menus.checked) });
          const page = select(catOptions(false), g.collection, { onchange: () => (g.collection = page.value) });
          return h(
            'fieldset',
            { class: 'idea' },
            h('legend', {}, g.label),
            h('div', { class: 'row' }, field('Group name', label), field('Opens the page', page), drawingPicker(g), ups(tax.groups, gi, g.label)),
            h('label', { class: 'inline' }, menus, ' Show in the menus'),
            h(
              'ul',
              { class: 'list' },
              ...g.children.map((r, ri) => {
                const rl = labelInput(r.label, { maxlength: 60 }, (v) => (r.label = v));
                return h('li', { class: 'row' }, field(`Name ${ri + 1}`, rl), ups(g.children, ri, r.label));
              }),
            ),
            h(
              'button',
              {
                type: 'button',
                class: 'btn',
                onclick: () => {
                  const raw = prompt(`Add someone to ${g.label} (for example "Godmother"):`)?.trim();
                  const n = raw ? toLabel(raw) : '';
                  if (!n) return;
                  const key = slugify(n);
                  if (!key || tax.groups.some((x) => x.key === key || x.children.some((c) => c.key === key))) return toast('That name is already in the list.', 'bad');
                  g.children.push({ key, label: n });
                  paint();
                },
              },
              'Add a person',
            ),
          );
        }),
      ),
      h(
        'fieldset',
        { class: 'card-box' },
        h('legend', {}, 'Occasions'),
        h(
          'ul',
          { class: 'list' },
          ...tax.occasions.map((o, oi) => {
            const ol = labelInput(o.label, { maxlength: 60 }, (v) => (o.label = v));
            const page = select(catOptions(true), o.collection ?? '', { onchange: () => (page.value ? (o.collection = page.value) : delete o.collection) });
            return h('li', { class: 'row' }, field('Name', ol), field('Opens', page), drawingPicker(o), ups(tax.occasions, oi, o.label));
          }),
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn',
            onclick: () => {
              const raw = prompt('New occasion (for example "Baptisms & Christenings"):')?.trim();
              const n = raw ? toLabel(raw) : '';
              if (!n) return;
              const key = slugify(n);
              if (!key || tax.occasions.some((o) => o.key === key)) return toast('That occasion is already in the list.', 'bad');
              tax.occasions.push({ key, label: n });
              paint();
            },
          },
          'Add an occasion',
        ),
      ),
    );
  paint();
  const save = h(
    'button',
    {
      type: 'button',
      class: 'btn primary',
      onclick: async () => {
        try {
          fixLabels();
          await api('/taxonomy', { method: 'PUT', body: JSON.stringify(tax) });
          await reload();
          toast('Saved. The menus change with the next publish.');
          render();
        } catch (e) {
          toast((e as Error).message, 'bad');
        }
      },
    },
    'Save changes',
  );
  return h(
    'section',
    { class: 'editor' },
    h('div', { class: 'toolbar' }, h('h1', {}, 'Shop by'), save),
    h('p', { class: 'hint' }, 'The two lists in the store menus and filters, and the cards on the homepage. Designs are tagged from each design. Names are Title Case with "&" for "and"; that is applied when you leave a field.'),
    box,
  );
}

// ---------- pages (page components) ----------

const ICON_LABEL: Record<ValuePropIcon, string> = {
  heart: 'Heart', 'pen-line': 'Pen', gift: 'Gift', truck: 'Truck', clock: 'Clock', check: 'Check mark', frame: 'Frame', image: 'Picture', 'shopping-bag': 'Shopping bag',
};

/** The photos the build has (src/assets/media/), listed into the page at build time. */
function photoFiles(): string[] {
  try {
    return JSON.parse(document.getElementById('photo-files')?.textContent ?? '[]') as string[];
  } catch {
    return [];
  }
}

function pageList(): HTMLElement {
  const changed = new Set(data.changes.filter((c) => c.kind === 'page').map((c) => c.id));
  return h(
    'section',
    {},
    h('div', { class: 'toolbar' }, h('h1', {}, 'Pages')),
    h('p', { class: 'hint' }, 'Pages built from components you add, edit and put in order.'),
    h(
      'ul',
      { class: 'list' },
      ...data.doc.pages.map((p) =>
        h('li', {}, h('a', { href: `#/pages/${p.key}` }, p.name), h('span', { class: 'hint' }, ` ${p.sections.length} components`), changed.has(p.key) ? h('span', { class: 'badge warn' }, 'Edited') : null),
      ),
    ),
  );
}

function pageEditor(key: string): HTMLElement {
  const existing = data.doc.pages.find((p) => p.key === key);
  if (!existing) return h('p', {}, 'That page was not found. ', h('a', { href: '#/pages' }, 'Back'));
  const page: PageDoc = structuredClone(existing);
  const photos = photoFiles();
  const box = h('div', {});

  const text = (value: string, max: number, set: (v: string) => void, attrs: Attrs = {}) => {
    const el = input(value, { maxlength: max, ...attrs });
    el.addEventListener('input', () => set(el.value));
    return el;
  };
  const area = (value: string, max: number, set: (v: string) => void) => {
    const el = textarea(value, { maxlength: max, rows: 2 });
    el.addEventListener('input', () => set(el.value));
    return el;
  };
  const move = <T>(arr: T[], i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    paint();
  };
  const label = (s: SectionDoc) => SECTION_TYPES.find((t) => t.type === s.type)?.label ?? s.type;

  function heroFields(s: HeroImageSection): HTMLElement[] {
    const pick = select([{ value: '', label: 'No photo yet (shows the image placeholder)' }, ...photos.map((f) => ({ value: f, label: f }))], s.image.file, {
      onchange: () => {
        s.image.file = pick.value;
        paint();
      },
    });
    return [
      field('Heading', text(s.heading, LIMITS.heading, (v) => (s.heading = v)), 'The first Hero Image heading is the page’s main heading.'),
      field('Text', area(s.text, LIMITS.text, (v) => (s.text = v))),
      field('Photo', pick, photos.length ? undefined : 'No photos are on the site yet. Until one is, the store shows an image placeholder here.'),
      s.image.file ? field('Describe the photo', text(s.image.alt, LIMITS.alt, (v) => (s.image.alt = v)), 'For people who can’t see it, for example "Grandma frame on a mantel".') : null,
      h(
        'div',
        { class: 'row' },
        field('Button', text(s.button.label, LIMITS.buttonLabel, (v) => (s.button.label = v))),
        field('Button opens', text(s.button.href, LIMITS.href, (v) => (s.button.href = v), { placeholder: '/collections/all' })),
      ),
      h(
        'div',
        { class: 'row' },
        field('Second button (optional)', text(s.secondary.label, LIMITS.buttonLabel, (v) => (s.secondary.label = v))),
        field('Second button opens', text(s.secondary.href, LIMITS.href, (v) => (s.secondary.href = v), { placeholder: '/products/…' })),
      ),
    ].filter((x): x is HTMLElement => !!x);
  }

  function propsFields(s: ValuePropsSection): HTMLElement[] {
    return [
      field('Heading (optional)', text(s.heading, LIMITS.heading, (v) => (s.heading = v))),
      h(
        'ul',
        { class: 'list' },
        ...s.items.map((it, i) => {
          const icon = select(VALUE_PROP_ICONS.map((v) => ({ value: v, label: ICON_LABEL[v] })), it.icon, { onchange: () => (it.icon = icon.value as ValuePropIcon) });
          return h(
            'li',
            { class: 'row' },
            field('Icon', icon),
            field(`Title ${i + 1}`, text(it.title, LIMITS.propTitle, (v) => (it.title = v))),
            field('Text', text(it.text, LIMITS.propText, (v) => (it.text = v))),
            h(
              'span',
              { class: 'row' },
              h('button', { type: 'button', class: 'btn', 'aria-label': `Move ${it.title || `value prop ${i + 1}`} left`, disabled: i === 0, onclick: () => move(s.items, i, -1) }, '←'),
              h('button', { type: 'button', class: 'btn', 'aria-label': `Move ${it.title || `value prop ${i + 1}`} right`, disabled: i === s.items.length - 1, onclick: () => move(s.items, i, 1) }, '→'),
              h('button', { type: 'button', class: 'btn', onclick: () => (s.items.splice(i, 1), paint()) }, 'Remove'),
            ),
          );
        }),
      ),
      s.items.length < MAX_VALUE_PROPS
        ? h('button', { type: 'button', class: 'btn', onclick: () => (s.items.push({ icon: 'check', title: '', text: '' }), paint()) }, 'Add a value prop')
        : h('p', { class: 'hint' }, `${MAX_VALUE_PROPS} at most.`),
      h('p', { class: 'hint' }, 'Three show side by side on a computer and stack on a phone.'),
    ];
  }

  const addType = select(SECTION_TYPES.map((t) => ({ value: t.type, label: t.label })), SECTION_TYPES[0]!.type);
  const addHint = h('p', { class: 'hint' }, SECTION_TYPES[0]!.hint);
  addType.addEventListener('change', () => (addHint.textContent = SECTION_TYPES.find((t) => t.type === addType.value)?.hint ?? ''));

  function paint() {
    box.replaceChildren(
      ...page.sections.map((s, i) =>
        h(
          'fieldset',
          { class: 'card-box', 'data-section': s.type },
          h('legend', {}, `${i + 1}. ${label(s)}`),
          h(
            'div',
            { class: 'row', style: 'justify-content:flex-end;margin-bottom:8px' },
            h('button', { type: 'button', class: 'btn', 'aria-label': `Move ${label(s)} ${i + 1} up`, disabled: i === 0, onclick: () => move(page.sections, i, -1) }, '↑'),
            h('button', { type: 'button', class: 'btn', 'aria-label': `Move ${label(s)} ${i + 1} down`, disabled: i === page.sections.length - 1, onclick: () => move(page.sections, i, 1) }, '↓'),
            h(
              'button',
              {
                type: 'button',
                class: 'btn',
                onclick: () => {
                  if (!confirm(`Remove this ${label(s)}?`)) return;
                  page.sections.splice(i, 1);
                  paint();
                },
              },
              'Remove',
            ),
          ),
          ...(s.type === 'hero-image'
            ? heroFields(s)
            : s.type === 'questions'
              ? [
                  field('Heading (optional)', text(s.heading, LIMITS.heading, (v) => (s.heading = v))),
                  h('p', { class: 'hint' }, `Shows the store’s ${data.doc.questions.length} shared questions. `, h('a', { href: '#/questions' }, 'Edit them under Questions'), '.'),
                ]
              : propsFields(s)),
        ),
      ),
      page.sections.length < MAX_SECTIONS
        ? h(
            'fieldset',
            { class: 'card-box' },
            h('legend', {}, 'Add a component'),
            h(
              'div',
              { class: 'row' },
              field('Component', addType),
              h(
                'button',
                {
                  type: 'button',
                  class: 'btn',
                  onclick: () => {
                    page.sections.push(newSection(addType.value as SectionType, page.sections.map((x) => x.id)));
                    paint();
                    box.lastElementChild?.previousElementSibling?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  },
                },
                'Add',
              ),
            ),
            addHint,
          )
        : h('p', { class: 'hint' }, `${MAX_SECTIONS} components at most.`),
    );
  }
  paint();

  const saveBtn = h('button', { type: 'button', class: 'btn primary' }, 'Save changes');
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    try {
      await api(`/pages/${page.key}`, { method: 'PUT', body: JSON.stringify(page) });
      await reload();
      toast('Saved. It goes on the site with the next publish.');
      render();
    } catch (e) {
      toast((e as Error).message, 'bad');
    } finally {
      saveBtn.disabled = false;
    }
  });
  const changed = data.changes.some((x) => x.kind === 'page' && x.id === page.key);
  const staleNote = data.changes.some((x) => x.kind === 'page' && x.id === page.key && x.stale) ? h('p', { class: 'error' }, STALE) : null;
  return h(
    'section',
    { class: 'editor' },
    h('p', {}, h('a', { href: '#/pages' }, '← All pages')),
    staleNote,
    h(
      'div',
      { class: 'toolbar' },
      h('h1', {}, page.name),
      h(
        'div',
        { class: 'row' },
        changed
          ? h(
              'button',
              {
                type: 'button',
                class: 'btn',
                onclick: async () => {
                  if (!confirm('Throw away your edits and go back to what the site shows?')) return;
                  await api(`/drafts/page/${page.key}`, { method: 'DELETE' });
                  await reload();
                  render();
                },
              },
              'Undo my edits',
            )
          : null,
        saveBtn,
      ),
    ),
    h('p', { class: 'hint' }, key === 'home' ? 'These show at the top of the homepage, in this order. The rest of the homepage (who it’s for, the two frames, most loved designs) follows them.' : 'Shown top to bottom, in this order.'),
    box,
  );
}

// ---------- questions (one list, shared by every page) ----------

function questionsEditor(): HTMLElement {
  const qs: [string, string][] = data.doc.questions.map(([q, a]) => [q, a]);
  const box = h('div', {});
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= qs.length) return;
    [qs[i], qs[j]] = [qs[j]!, qs[i]!];
    paint();
  };
  function paint() {
    box.replaceChildren(
      ...qs.map((pair, i) => {
        const q = input(pair[0], { maxlength: LIMITS.question });
        const a = textarea(pair[1], { maxlength: LIMITS.answer, rows: 3 });
        q.addEventListener('input', () => (pair[0] = q.value));
        a.addEventListener('input', () => (pair[1] = a.value));
        return h(
          'fieldset',
          { class: 'card-box', 'data-question': String(i + 1) },
          h('legend', {}, `Question ${i + 1}`),
          field('Question', q),
          field('Answer', a),
          h(
            'div',
            { class: 'row' },
            h('button', { type: 'button', class: 'btn', 'aria-label': `Move question ${i + 1} up`, disabled: i === 0, onclick: () => move(i, -1) }, '↑'),
            h('button', { type: 'button', class: 'btn', 'aria-label': `Move question ${i + 1} down`, disabled: i === qs.length - 1, onclick: () => move(i, 1) }, '↓'),
            h('button', { type: 'button', class: 'btn', onclick: () => (qs.splice(i, 1), paint()) }, 'Remove'),
          ),
        );
      }),
      qs.length < MAX_QUESTIONS
        ? h('button', { type: 'button', class: 'btn', onclick: () => (qs.push(['', '']), paint(), box.lastElementChild?.previousElementSibling?.scrollIntoView({ behavior: 'smooth', block: 'start' })) }, 'Add a question')
        : h('p', { class: 'hint' }, `${MAX_QUESTIONS} questions at most.`),
    );
  }
  paint();

  const saveBtn = h('button', { type: 'button', class: 'btn primary' }, 'Save changes');
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    try {
      await api('/questions', { method: 'PUT', body: JSON.stringify(qs satisfies QuestionDoc[]) });
      await reload();
      toast('Saved. It goes on the site with the next publish.');
      render();
    } catch (e) {
      toast((e as Error).message, 'bad');
    } finally {
      saveBtn.disabled = false;
    }
  });
  const changed = data.changes.some((x) => x.kind === 'questions');
  const staleNote = data.changes.some((x) => x.kind === 'questions' && x.stale) ? h('p', { class: 'error' }, STALE) : null;
  return h(
    'section',
    { class: 'editor' },
    staleNote,
    h(
      'div',
      { class: 'toolbar' },
      h('h1', {}, 'Questions'),
      h(
        'div',
        { class: 'row' },
        changed
          ? h(
              'button',
              {
                type: 'button',
                class: 'btn',
                onclick: async () => {
                  if (!confirm('Throw away your edits and go back to what the site shows?')) return;
                  await api('/drafts/questions/all', { method: 'DELETE' });
                  await reload();
                  render();
                },
              },
              'Undo my edits',
            )
          : null,
        saveBtn,
      ),
    ),
    h('p', { class: 'hint' }, 'One list for the whole store. It shows on the Questions page, under every category and design, and anywhere you add a Questions component. Answer what shoppers really ask, in the order they ask it.'),
    box,
  );
}

// ---------- changes ----------

function changes(): HTMLElement {
  const when = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  const link = (c: CatalogResponse['changes'][number]) =>
    c.kind === 'template' ? `#/designs/${c.id}` : c.kind === 'category' ? `#/categories/${c.id}` : c.kind === 'page' ? `#/pages/${c.id}` : c.kind === 'questions' ? '#/questions' : '#/shop-by';
  return h(
    'section',
    {},
    h('div', { class: 'toolbar' }, h('h1', {}, 'Changes waiting to publish')),
    h(
      'p',
      { class: 'hint' },
      data.setup.publish
        ? 'Publishing puts these on the test store; Justin takes them to butterlu.com.'
        : 'Your edits are saved here. Publishing them to the store is the next step and is switched on soon.',
    ),
    data.changes.length
      ? h(
          'ul',
          { class: 'list' },
          ...data.changes.map((c) => h('li', {}, h('a', { href: link(c) }, c.name || c.id), h('span', { class: 'hint' }, ` ${c.isNew ? 'new' : 'edited'}, ${when(c.at)}${c.by ? ` by ${c.by}` : ''}`), c.stale ? h('span', { class: 'badge warn' }, 'Site changed since') : null)),
        )
      : h('p', {}, 'Nothing yet. Everything matches the store.'),
    data.check.errors.length ? h('div', { class: 'issues' }, h('p', { class: 'error' }, 'To fix before a publish:'), h('ul', {}, ...data.check.errors.map((e) => h('li', {}, e)))) : null,
    data.check.warnings.length ? h('details', {}, h('summary', {}, `${data.check.warnings.length} things worth a look`), h('ul', { class: 'hint' }, ...data.check.warnings.map((w) => h('li', {}, w)))) : null,
  );
}

// ---------- shell ----------

function nav(route: string) {
  const items: [string, string][] = [
    ['#/designs', 'Designs'],
    ['#/categories', 'Categories'],
    ['#/shop-by', 'Shop by'],
    ['#/pages', 'Pages'],
    ['#/questions', 'Questions'],
    ['#/changes', `Changes${data.changes.length ? ` (${data.changes.length})` : ''}`],
  ];
  return h(
    'nav',
    { class: 'nav', 'aria-label': 'Admin' },
    ...items.map(([href, label]) => h('a', { href, 'aria-current': route.startsWith(href.slice(1)) ? 'page' : undefined }, label)),
    h('a', { href: '/admin/orders' }, 'Orders'),
    data.setup.signIn === 'workos'
      ? h(
          'form',
          { class: 'me', method: 'post', action: '/admin/sign-out' },
          h('span', { class: 'hint' }, `Signed in as ${data.me} `),
          h('button', { class: 'btn', type: 'submit' }, 'Sign out'),
        )
      : h('span', { class: 'hint me' }, `Signed in as ${data.me}`),
  );
}

function render() {
  const route = location.hash.replace(/^#/, '') || '/designs';
  let view: HTMLElement;
  let m: RegExpExecArray | null;
  if ((m = /^\/designs\/(new|[a-z0-9-]+)$/.exec(route))) view = templateEditor(m[1] === 'new' ? null : m[1]!);
  else if ((m = /^\/categories\/([a-z0-9-]+)$/.exec(route))) view = categoryEditor(m[1]!);
  else if (route === '/categories') view = categoryList();
  else if (route === '/shop-by') view = shopBy();
  else if ((m = /^\/pages\/([a-z0-9-]+)$/.exec(route))) view = pageEditor(m[1]!);
  else if (route === '/pages') view = pageList();
  else if (route === '/questions') view = questionsEditor();
  else if (route === '/changes') view = changes();
  else view = templateList();
  root.replaceChildren(nav(route), h('main', { id: 'main' }, view));
}

window.addEventListener('hashchange', () => {
  render();
  window.scrollTo(0, 0);
});

(async () => {
  try {
    await Promise.all([reload(), fontsReady()]);
    render();
  } catch (e) {
    root.replaceChildren(h('p', { class: 'error' }, `The admin couldn't load: ${(e as Error).message}`));
  }
})();

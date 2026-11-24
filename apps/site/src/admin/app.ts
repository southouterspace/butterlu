// Store admin (docs/13): Asli's editor for ready-made designs ("templates"), category
// pages, the shop-by lists, page components (the homepage's Hero Image, Value Props), the
// shared questions and the orders, with Claude-drafted SEO she approves. Talks to
// /api/admin/* (worker/catalog-admin.ts, worker/admin.ts). Every catalog edit saves as a
// draft over the live catalog; nothing here changes the store until a publish.
//
// The look follows the patterns of Shopify's admin (admin.css): a top bar and left
// navigation, a page header with the page's actions at the top right, cards on a grey
// canvas, index tables that open a record, a save bar while a form has unsaved edits,
// and toasts for results.
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

/** One order as GET /api/admin/orders sends it (worker/admin.ts orderJson). */
interface AdminOrder {
  id: string;
  createdAt: string;
  livemode: boolean;
  paymentStatus: string;
  status: string;
  amountTotal: number;
  currency: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  shipName: string | null;
  shipAddress: string[];
  marketingOptIn: boolean;
  trackingNumber: string | null;
  carrier: string | null;
  shippedAt: string | null;
  note: string | null;
  lines: { name: string | null; handle: string | null; quantity: number; amountTotal: number; summary: string | null; errors: string[] }[];
}
interface OrdersResponse {
  orders: AdminOrder[];
  statuses: string[];
}

// Same lists as catalog/doc.ts, kept here so the page doesn't bundle the whole catalog.
const TEMPLATE_SEO = ['seoTitle', 'seoDescription', 'altText', 'feedTitle', 'feedDescription'] as const satisfies readonly SeoKey[];
const CATEGORY_SEO = ['seoTitle', 'seoDescription'] as const satisfies readonly SeoKey[];
const SHAPE_LABEL: Record<string, string> = { scalloped: 'Scalloped', 'rounded-rectangle': 'Rounded' };
const SIDE_LABEL: Record<Side, string> = { top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left' };
const STALE = 'The site has changed this since your edits were started. Check it over, or use Undo my edits to start again from what the site shows.';
const STATUS_LABEL: Record<string, string> = { live: 'Live', draft: 'Draft', hidden: 'Hidden' };
const STATUS_TONE: Record<string, Tone> = { live: 'success', draft: 'info', hidden: '' };
const ORDER_LABEL: Record<string, string> = { new: 'New', proofing: 'Proofing', printing: 'Printing', shipped: 'Shipped', cancelled: 'Cancelled' };
const ORDER_TONE: Record<string, Tone> = { new: 'attention', proofing: 'info', printing: 'info', shipped: 'success', cancelled: '' };

let data: CatalogResponse;
let orders: OrdersResponse | null = null;
const root = document.getElementById('admin')!;

// ---------- small DOM helpers ----------

type Tone = '' | 'success' | 'info' | 'warning' | 'attention' | 'critical';
type Kid = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | undefined | ((e: Event) => void)>;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Kid[]): HTMLElementTagNameMap[K] {
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

// Icons: simple 24-unit strokes drawn for this admin, decorative (aria-hidden).
const ICONS = {
  designs: 'M4 5h16v14H4z M8 15l3-3 2 2 3-4 4 5 M8.5 9.5h.01',
  categories: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  shopby: 'M3 12V4h8l10 10-8 8L3 12z M7.5 7.5h.01',
  pages: 'M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6',
  questions: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14 M12 17.5h.01',
  orders: 'M4 13l2-8h12l2 8 M4 13v6h16v-6 M4 13h5l1 2h4l1-2h5',
  changes: 'M12 3v12 M7 8l5-5 5 5 M5 15v4h14v-4',
  store: 'M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6',
  back: 'M19 12H5 M11 6l-6 6 6 6',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4',
  up: 'M12 19V5 M6 11l6-6 6 6',
  down: 'M12 5v14 M6 13l6 6 6-6',
  left: 'M19 12H5 M11 6l-6 6 6 6',
  right: 'M5 12h14 M13 6l6 6-6 6',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 8h.01',
  alert: 'M12 3l10 18H2z M12 10v4 M12 17.5h.01',
  check: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M8 12l3 3 5-6',
} as const;
type IconName = keyof typeof ICONS;
function icon(name: IconName): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const d of ICONS[name].split(' M')) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d.startsWith('M') ? d : `M${d}`);
    svg.append(p);
  }
  return svg;
}

function field(label: string, control: HTMLElement, hint?: string, opts: { required?: boolean } = {}): HTMLElement {
  const cid = control.id || id('f');
  control.id = cid;
  let hintEl: HTMLElement | null = null;
  if (hint) {
    hintEl = h('p', { class: 'hint', id: `${cid}-hint` }, hint);
    control.setAttribute('aria-describedby', [control.getAttribute('aria-describedby'), hintEl.id].filter(Boolean).join(' '));
  }
  if (opts.required) control.setAttribute('aria-required', 'true');
  return h('div', { class: 'field' }, h('label', { for: cid, class: opts.required ? 'req' : undefined }, label), control, hintEl);
}

/** Shows or clears an inline error under a control, wired up for screen readers. */
function setFieldError(control: HTMLElement, message: string | null) {
  const wrap = control.closest('.field') ?? control.parentElement!;
  const errId = `${control.id}-error`;
  document.getElementById(errId)?.remove();
  const described = (control.getAttribute('aria-describedby') ?? '').split(' ').filter((x) => x && x !== errId);
  if (message) {
    wrap.append(h('p', { class: 'field-error', id: errId }, icon('alert'), h('span', {}, message)));
    control.setAttribute('aria-invalid', 'true');
    described.unshift(errId);
  } else control.removeAttribute('aria-invalid');
  if (described.length) control.setAttribute('aria-describedby', described.join(' '));
  else control.removeAttribute('aria-describedby');
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

function btn(label: Kid, onclick: (e: Event) => void, attrs: Attrs = {}): HTMLButtonElement {
  return h('button', { type: 'button', class: 'btn', ...attrs, onclick }, label);
}

/** A square button with only an icon; `label` is its accessible name. */
function iconBtn(name: IconName, label: string, onclick: () => void, disabled = false): HTMLButtonElement {
  return h('button', { type: 'button', class: 'btn icon-only', 'aria-label': label, title: label, disabled, onclick }, icon(name));
}

function badge(text: string, tone: Tone = ''): HTMLElement {
  return h('span', { class: `badge ${tone}`.trim() }, text);
}

function banner(tone: 'info' | 'critical' | 'warning' | 'success', title: string | null, ...body: Kid[]): HTMLElement {
  const name: IconName = tone === 'critical' || tone === 'warning' ? 'alert' : tone === 'success' ? 'check' : 'info';
  return h('div', { class: `banner ${tone}` }, icon(name), h('div', { class: 'banner-body' }, title ? h('p', { class: 'banner-title' }, title) : null, ...body));
}

function card(title: string | null, ...kids: Kid[]): HTMLElement {
  return h('section', { class: 'card' }, title ? h('h2', { class: 'card-title' }, title) : null, ...kids);
}

/** A card that groups form controls: a fieldset whose legend reads as the card's title. */
function fieldCard(legend: string, ...kids: Kid[]): HTMLFieldSetElement {
  return h('fieldset', { class: 'card' }, h('legend', {}, legend), ...kids);
}

function emptyState(iconName: IconName, title: string, text: string, action?: HTMLElement): HTMLElement {
  return h('div', { class: 'empty' }, icon(iconName), h('h2', {}, title), h('p', {}, text), action ?? null);
}

/**
 * The page header: an optional back link, the title with badges, and the page's actions
 * at the right, the primary one last, where people look for it.
 */
function pageHeader(title: string, opts: { back?: [string, string]; badges?: Kid[]; actions?: Kid[] } = {}): HTMLElement {
  const actions = (opts.actions ?? []).filter(Boolean);
  return h(
    'div',
    { class: 'page-header' },
    opts.back ? h('a', { class: 'back', href: opts.back[0], 'aria-label': opts.back[1], title: opts.back[1] }, icon('back')) : null,
    h('div', { class: 'page-title' }, h('h1', {}, title), ...(opts.badges ?? [])),
    actions.length ? h('div', { class: 'page-actions' }, ...actions) : null,
  );
}

/** An index table. Each row opens one record through its first link, which covers the row. */
function table(heads: { label: string; cls?: string }[], rows: HTMLTableRowElement[], caption: string): HTMLTableElement {
  return h(
    'table',
    { class: 'table' },
    h('caption', { class: 'visually-hidden' }, caption),
    h('thead', {}, h('tr', {}, ...heads.map((c) => h('th', { scope: 'col', class: c.cls }, c.label)))),
    h('tbody', {}, ...rows),
  );
}
function linkedRow(...cells: HTMLTableCellElement[]): HTMLTableRowElement {
  return h('tr', { class: 'linked' }, ...cells);
}
const td = (cls: string | undefined, ...kids: Kid[]) => h('td', { class: cls }, ...kids);
const rowLink = (href: string, text: string, sub?: string): Kid[] => [h('a', { class: 'row-link', href }, text), sub ? h('span', { class: 'cell-sub' }, sub) : null];

let toastTimer: number | undefined;
function toast(text: string, tone: 'ok' | 'bad' = 'ok') {
  const el = document.getElementById('toast')!;
  el.querySelector('.toast-text')!.textContent = text;
  el.dataset.tone = tone;
  el.hidden = false;
  // The visible toast is for sighted people; the live regions say it once to screen readers.
  const live = document.getElementById(tone === 'bad' ? 'toast-alert' : 'toast-live')!;
  live.textContent = '';
  window.setTimeout(() => (live.textContent = text), 50);
  clearTimeout(toastTimer);
  // A result goes after five seconds. An error stays until it's dismissed, so it can be read.
  if (tone === 'ok') toastTimer = window.setTimeout(() => (el.hidden = true), 5000);
}
document.querySelector('#toast button')?.addEventListener('click', () => {
  document.getElementById('toast')!.hidden = true;
  clearTimeout(toastTimer);
});

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(init.headers ?? {}) },
    credentials: 'same-origin',
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; details?: string[] };
  // A session that ended: reload, which shows the sign-in page. Unsaved edits on the
  // form are lost, which is why the session lasts a week.
  if (res.status === 401 && data?.setup.signIn === 'workos') {
    editor = null;
    location.reload();
  }
  if (!res.ok) throw new Error([body.error ?? `Error ${res.status}`, ...(body.details ?? [])].join('\n'));
  return body as T;
}

async function reload() {
  data = await api<CatalogResponse>('/catalog');
}

/** Renders the current route again and keeps the scroll position, after a save. */
function rerender() {
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}

// ---------- unsaved edits: the save bar ----------

/**
 * The open form, when it has one. Its snapshot is compared with the one taken when it
 * opened (or last saved), so the save bar shows only while something really changed,
 * and leaving the page asks first.
 */
interface Editor {
  snapshot: () => string;
  save: () => Promise<boolean>;
  /** A new record: unsaved from the start, and Discard leaves the page. */
  isNew?: boolean;
  discardTo?: string;
  saveLabel?: string;
  base: string;
}
let editor: Editor | null = null;

function isDirty(): boolean {
  return !!editor && (!!editor.isNew || editor.snapshot() !== editor.base);
}
/** The form now matches what's saved. */
function markClean() {
  if (!editor) return;
  editor.isNew = false;
  editor.base = editor.snapshot();
  paintSaveBar();
}

function track(view: HTMLElement, e: Omit<Editor, 'base'>) {
  editor = { ...e, base: '' };
  editor.base = editor.snapshot();
  // Editors change their state from input, change and click handlers on the controls, which
  // run before the event bubbles up to here.
  for (const type of ['input', 'change', 'click']) view.addEventListener(type, paintSaveBar);
}

const saveBar = h('div', { class: 'savebar', hidden: true, role: 'region', 'aria-label': 'Unsaved changes' });
document.body.append(saveBar);
let saving = false;
function paintSaveBar() {
  const show = isDirty();
  const key = `${show}|${saving}|${editor?.isNew ?? ''}`;
  if (saveBar.dataset.key === key) return;
  saveBar.dataset.key = key;
  saveBar.hidden = !show;
  if (!show) return saveBar.replaceChildren();
  const label = editor?.saveLabel ?? 'Save';
  saveBar.replaceChildren(
    h('p', { class: 'msg' }, icon('alert'), editor?.isNew ? 'Not saved yet' : 'Unsaved changes'),
    h(
      'div',
      { class: 'actions' },
      btn('Discard', discard, { disabled: saving }),
      btn(saving ? 'Saving…' : label, () => void saveNow(), { class: 'btn primary', 'aria-disabled': saving ? 'true' : undefined }),
    ),
  );
}
async function saveNow() {
  if (!editor || saving) return;
  saving = true;
  paintSaveBar();
  try {
    await editor.save();
  } finally {
    saving = false;
    paintSaveBar();
  }
}
function discard() {
  if (!editor) return;
  if (!confirm('Discard all unsaved changes?')) return;
  const to = editor.isNew ? editor.discardTo : undefined;
  editor = null;
  paintSaveBar();
  if (to) location.hash = to;
  else rerender();
}
window.addEventListener('beforeunload', (e) => {
  if (isDirty()) e.preventDefault();
});
/** Ctrl or Cmd + S saves the open form, as it does in most editors. */
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && isDirty()) {
    e.preventDefault();
    void saveNow();
  }
});

/** A save failed: a banner at the top of the form says why, and takes focus so it's read. */
function showSaveError(slot: HTMLElement, e: unknown) {
  const [first, ...rest] = (e as Error).message.split('\n');
  slot.replaceChildren(banner('critical', `Couldn't save: ${first}`, rest.length ? h('ul', {}, ...rest.map((r) => h('li', {}, r))) : null));
  slot.tabIndex = -1;
  slot.focus();
  toast("Couldn't save. See the message at the top.", 'bad');
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

/** A small preview for an index row, cached so filtering doesn't redraw every frame. */
const thumbs = new Map<string, string>();
function thumb(key: string, spec: FrameSpec): HTMLElement {
  const k = `${key}|${JSON.stringify(spec)}`;
  let markup = thumbs.get(k);
  if (markup === undefined) {
    try {
      markup = frameSvg(spec, placementsInBrowser(spec), { idPrefix: `t${++previewN}`, size: 'card' });
    } catch {
      markup = '';
    }
    thumbs.set(k, markup);
  }
  const box = h('div', { class: 'thumb-box' });
  box.innerHTML = markup;
  return box;
}

const blankSpec = (): FrameSpec => ({
  shape: SHAPE_IDS[0]!,
  backgroundId: data.backgrounds[0]!.id as FrameSpec['backgroundId'],
  sides: { top: { text: 'Your words here', fontId: data.fonts[0]!.id } },
});

// ---------- SEO fields ----------

function seoBadge(f: SeoField): HTMLElement {
  if (f.status === 'approved') return badge(f.source === 'site' ? 'On the site' : `Approved${f.by ? ` by ${f.by}` : ''}`, 'success');
  if (f.status === 'draft') return badge("Claude's draft, not approved", 'warning');
  return badge('Empty');
}

/**
 * One SEO field: the text, a live count against the limit, "Draft with Claude", and
 * Approve for a draft. `get()` returns the field as it should be saved.
 */
function seoEditor(kind: 'template' | 'category', key: SeoKey, start: SeoField, itemNow: () => Record<string, unknown>, save: () => Promise<boolean>) {
  let state: SeoField = { ...start };
  const limit = SEO_LIMITS[key];
  const area = key === 'seoTitle' || key === 'feedTitle' ? input(state.value, { maxlength: limit + 40 }) : textarea(state.value, { rows: key === 'feedDescription' ? 5 : 3 });
  area.id = id('seo');
  const count = h('span', { class: 'count', id: `${area.id}-count` });
  area.setAttribute('aria-describedby', count.id);
  const status = h('span', {});
  const options = h('div', { class: 'options', 'aria-live': 'polite' });
  const draftBtn = btn('Draft with Claude', () => void draft());
  const approveBtn = btn('Approve', () => void approve(), { class: 'btn primary' });

  const paint = () => {
    const n = area.value.length;
    count.textContent = `${n} of ${limit} characters`;
    count.classList.toggle('over', n > limit);
    status.replaceChildren(seoBadge(state));
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
  async function draft() {
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
                area.focus();
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
  }
  async function approve() {
    approveBtn.disabled = true;
    try {
      if (!(await save())) return;
      const item = itemNow();
      const res = await api<{ field: SeoField }>('/seo/approve', { method: 'POST', body: JSON.stringify({ kind, id: item.handle, field: key }) });
      state = res.field;
      picked = '';
      paint();
      markClean();
      toast(`${SEO_LABELS[key]} approved.`);
    } catch (e) {
      toast((e as Error).message, 'bad');
    } finally {
      approveBtn.disabled = false;
    }
  }

  paint();
  const el = h(
    'div',
    { class: 'seo-field' },
    h('div', { class: 'seo-head' }, h('label', { for: area.id }, SEO_LABELS[key]), status, count),
    area,
    h('div', { class: 'row' }, draftBtn, approveBtn),
    options,
  );
  return { el, get: () => ({ ...state, value: area.value.trim() }), area };
}

function searchPreview(title: () => string, desc: () => string, path: () => string) {
  const t = h('p', { class: 'serp-title' });
  const u = h('p', { class: 'serp-url' });
  const d = h('p', { class: 'serp-desc' });
  const paint = () => {
    t.textContent = `${title() || 'No search title yet'}${TITLE_SUFFIX}`;
    u.textContent = `butterlu.com${path()}`;
    d.textContent = desc() || 'No search description yet.';
  };
  paint();
  const el = h('div', { class: 'serp', role: 'group', 'aria-label': 'How it could look in Google' }, h('p', { class: 'hint' }, 'In Google, roughly'), u, t, d);
  return { el, paint };
}

/** Move up and down (or left and right) buttons for one item of a list. */
function movers(i: number, n: number, name: string, move: (d: number) => void, axis: 'vertical' | 'horizontal' = 'vertical') {
  const [a, b]: [IconName, IconName] = axis === 'vertical' ? ['up', 'down'] : ['left', 'right'];
  return h('span', { class: 'btn-group' }, iconBtn(a, `Move ${name} ${a}`, () => move(-1), i === 0), iconBtn(b, `Move ${name} ${b}`, () => move(1), i === n - 1));
}

/** Swaps two items, repaints, and keeps focus on the moved item's button. */
function swapper<T>(arr: T[], paint: () => void, box: () => HTMLElement, itemSel: string) {
  return (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    paint();
    const items = box().querySelectorAll(itemSel);
    const target = items[j]?.querySelectorAll<HTMLButtonElement>(':scope .btn-group .btn');
    const next = target?.[d < 0 ? 0 : 1];
    (next && !next.disabled ? next : target?.[d < 0 ? 1 : 0])?.focus();
  };
}

// ---------- templates (designs) ----------

const filters = { q: '', for: '', occasion: '', status: '' };

function recipientOptions() {
  return [
    { value: '', label: 'Choose…' },
    ...data.doc.taxonomy.groups.flatMap((g) => g.children.map((r) => ({ value: r.key, label: `${g.label}: ${r.label}` }))),
  ];
}

function recipientLabel(key: string): string {
  for (const g of data.doc.taxonomy.groups) {
    if (g.key === key) return g.label;
    const c = g.children.find((r) => r.key === key);
    if (c) return c.label;
  }
  return key || '—';
}

function templateList() {
  const { templates, taxonomy } = data.doc;
  const changed = new Set(data.changes.filter((c) => c.kind === 'template').map((c) => c.id));
  const matches = (t: TemplateDoc, status = filters.status) => {
    const q = filters.q.trim().toLowerCase();
    return (
      (!q || t.name.toLowerCase().includes(q) || t.handle.includes(q)) &&
      (!filters.for || t.for === filters.for || !!taxonomy.groups.find((g) => g.key === filters.for)?.children.some((c) => c.key === t.for)) &&
      (!filters.occasion || t.occasions.includes(filters.occasion)) &&
      (!status || t.status === status)
    );
  };

  const tabs = h('div', { class: 'tabs', role: 'group', 'aria-label': 'Show designs by status' });
  const count = h('p', { class: 'result-count', 'aria-live': 'polite' });
  const body = h('div', {});
  const forFilter = select(
    [{ value: '', label: 'Anyone' }, ...taxonomy.groups.flatMap((g) => [{ value: g.key, label: g.label }, ...g.children.map((r) => ({ value: r.key, label: ` ${r.label}` }))])],
    filters.for,
    { onchange: () => ((filters.for = forFilter.value), paint()) },
  );
  const occFilter = select([{ value: '', label: 'Any occasion' }, ...taxonomy.occasions.map((o) => ({ value: o.key, label: o.label }))], filters.occasion, {
    onchange: () => ((filters.occasion = occFilter.value), paint()),
  });
  const search = input(filters.q, { type: 'search', placeholder: 'Search by name or web address', id: id('q') });
  search.addEventListener('input', () => ((filters.q = search.value), paint()));
  const clearAll = () => {
    Object.assign(filters, { q: '', for: '', occasion: '', status: '' });
    search.value = '';
    forFilter.value = '';
    occFilter.value = '';
    paint();
    search.focus();
  };
  const clear = btn('Clear filters', clearAll, { class: 'btn plain' });

  // Only the tabs, the count and the rows repaint, so the search box keeps focus as she types.
  function paint() {
    tabs.replaceChildren(
      ...[['', 'All'], ...Object.entries(STATUS_LABEL)].map(([value, label]) =>
        h(
          'button',
          { type: 'button', class: 'tab', 'aria-pressed': String(filters.status === value), onclick: () => ((filters.status = value!), paint()) },
          label!,
          h('span', { class: 'n' }, String(templates.filter((t) => matches(t, value)).length)),
        ),
      ),
    );
    const shown = templates.filter((t) => matches(t));
    const filtered = !!(filters.q || filters.for || filters.occasion || filters.status);
    count.textContent = `Showing ${shown.length} of ${templates.length} designs`;
    clear.hidden = !filtered;
    if (!templates.length) {
      body.replaceChildren(emptyState('designs', 'Add your first design', 'A design is a ready-made frame: a shape, a background and words, filed under who it’s for.', btn('New design', () => openTemplate(null), { class: 'btn primary' })));
      return;
    }
    if (!shown.length) {
      body.replaceChildren(emptyState('search', 'No designs match', 'Try other words, or clear the filters to see every design.', btn('Clear filters', clearAll)));
      return;
    }
    body.replaceChildren(
      table(
        [{ label: 'Preview', cls: 'thumb' }, { label: 'Design' }, { label: 'Status' }, { label: 'Who it’s for', cls: 'hide-sm' }, { label: 'Categories', cls: 'num hide-sm' }, { label: 'To do' }],
        shown.map((t) =>
          linkedRow(
            td('thumb', thumb(t.handle, t.preset)),
            td(undefined, ...rowLink(`#/designs/${t.handle}`, t.name || t.handle, `/products/${t.handle}`)),
            td(undefined, badge(STATUS_LABEL[t.status] ?? t.status, STATUS_TONE[t.status] ?? '')),
            td('hide-sm', recipientLabel(t.for)),
            td('num hide-sm', String(t.collections.length)),
            td(
              undefined,
              h(
                'span',
                { class: 'badges' },
                changed.has(t.handle) ? badge('Edited', 'attention') : null,
                Object.values(t.seo).some((f) => f.status === 'draft') ? badge('SEO to approve', 'warning') : null,
              ),
            ),
          ),
        ),
        'Ready-made designs',
      ),
    );
  }
  paint();

  const searchField = h('div', { class: 'field search' }, h('label', { for: search.id }, 'Search designs'), h('div', { class: 'search-wrap' }, icon('search'), search));
  return h(
    'div',
    { class: 'page' },
    pageHeader('Designs', { actions: [btn('New design', () => openTemplate(null), { class: 'btn primary' })] }),
    h(
      'section',
      { class: 'card flush', 'aria-label': 'Designs' },
      tabs,
      h('div', { class: 'filters' }, searchField, field('Who it’s for', forFilter), field('Occasion', occFilter), clear),
      count,
      body,
    ),
  );
}

function openTemplate(handle: string | null) {
  location.hash = handle ? `#/designs/${handle}` : '#/designs/new';
}

function templateEditor(handle: string | null): HTMLElement {
  const existing = handle ? data.doc.templates.find((t) => t.handle === handle) : undefined;
  if (handle && !existing) return notFound('That design was not found.', '#/designs', 'Back to designs');
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

  const errorSlot = h('div', {});
  const previewBox = h('div', { class: 'big-preview' });
  const issues = h('div', { class: 'issues', 'aria-live': 'polite' });
  const repaint = () => {
    previewBox.replaceChildren(preview(t.preset, `Preview of ${t.name || 'this design'}`, 'full'));
    const r = checkTemplate(collect(), data.doc);
    issues.replaceChildren(
      ...[
        r.errors.length ? banner('critical', t.status === 'live' ? 'Fix before it can go live' : 'Needed before it can go live', h('ul', {}, ...r.errors.map((e) => h('li', {}, e)))) : null,
        r.warnings.length ? banner('warning', 'Worth a look', h('ul', {}, ...r.warnings.map((w) => h('li', {}, w)))) : null,
      ].filter((x): x is HTMLElement => !!x),
    );
  };

  // Basics
  const name = labelInput(t.name, { maxlength: 80, autocomplete: 'off' }, (v) => ((t.name = v), repaint()));
  const handleIn = input(t.handle, { maxlength: 80, disabled: !isNew, autocomplete: 'off', spellcheck: 'false' });
  let handleTouched = !isNew;
  handleIn.addEventListener('input', () => {
    handleTouched = true;
    if (handleIn.getAttribute('aria-invalid')) setFieldError(handleIn, null);
  });
  name.addEventListener('input', () => {
    t.name = name.value;
    if (!handleTouched) handleIn.value = slugify(name.value);
    if (name.value.trim() && name.getAttribute('aria-invalid')) setFieldError(name, null);
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
  const bgName = h('span', { class: 'muted' });
  const paintBgName = () => (bgName.textContent = data.backgrounds.find((b) => b.id === t.preset.backgroundId)?.name ?? '');
  paintBgName();
  const bgLabel = id('bg');
  const bgGrid = h(
    'div',
    { class: 'swatches', role: 'radiogroup', 'aria-labelledby': bgLabel },
    ...data.backgrounds.map((b) => {
      const r = h('input', {
        type: 'radio',
        name: 'bg',
        value: b.id,
        checked: t.preset.backgroundId === b.id,
        onchange: () => {
          t.preset.backgroundId = b.id as FrameSpec['backgroundId'];
          paintBgName();
          repaint();
        },
      });
      return h('label', { class: 'swatch' }, r, h('img', { src: backgroundUrl(b.id, 'card'), alt: '', loading: 'lazy', width: 68, height: 50 }), h('span', {}, b.name));
    }),
  );
  // Background size and position (packages/frame backgroundFit): 100% fills the frame;
  // larger zooms in, and the position sliders pick which part of the pattern shows.
  const fit = () => t.preset.backgroundFit ?? { scale: 1, x: 0, y: 0 };
  const range = (min: number, max: number, step: number, value: number, text: (v: number) => string) => {
    const r = h('input', { type: 'range', min, max, step });
    r.value = String(value);
    r.setAttribute('aria-valuetext', text(value));
    return r;
  };
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const side = (v: number, lo: string, hi: string) => (Math.abs(v) < 0.01 ? 'centred' : `${Math.round(Math.abs(v) * 100)}% toward the ${v < 0 ? lo : hi}`);
  const scaleIn = range(BACKGROUND_SCALE.min, BACKGROUND_SCALE.max, BACKGROUND_SCALE.step, fit().scale, pct);
  const xIn = range(-1, 1, 0.05, fit().x, (v) => side(v, 'left', 'right'));
  const yIn = range(-1, 1, 0.05, fit().y, (v) => side(v, 'top', 'bottom'));
  const scaleOut = h('output', { 'aria-hidden': 'true' });
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
  const resetFit = btn('Reset', () => ((scaleIn.value = '1'), (xIn.value = '0'), (yIn.value = '0'), syncFit()));
  scaleOut.textContent = pct(fit().scale);
  posBox.hidden = fit().scale <= 1.001;
  const sizeField = field('Background size', scaleIn, 'Larger zooms into the pattern; then pick which part shows.');
  const fitBox = h('fieldset', { class: 'sub fit' }, h('legend', {}, 'Background size and position'), h('div', { class: 'row center' }, sizeField, scaleOut, resetFit), posBox);

  const sides = h(
    'div',
    { class: 'sides' },
    ...SIDES.map((sd) => {
      const s = t.preset.sides[sd];
      const text = input(s?.text ?? '', { maxlength: 60, placeholder: `${SIDE_LABEL[sd]} words` });
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
        if (!text.value.trim()) delete t.preset.sides[sd];
        else
          t.preset.sides[sd] = {
            text: text.value,
            fontId: font.value,
            ...(color.value ? { color: color.value as `#${string}` } : {}),
            ...(rot.value ? { rotation: Number(rot.value) as 0 | 90 | -90 | 180 } : {}),
          };
        repaint();
      };
      for (const c of [text, font, color, rot]) c.addEventListener(c === text ? 'input' : 'change', sync);
      return h('fieldset', { class: 'sub' }, h('legend', {}, `${SIDE_LABEL[sd]} side`), field('Words', text), h('div', { class: 'row' }, field('Font', font), field('Colour', color), field('Turn', rot)));
    }),
  );

  // Filing
  const forSel = select(recipientOptions(), t.for, { onchange: () => ((t.for = forSel.value), repaint()) });
  const checks = (items: { value: string; label: string }[], chosen: string[], onChange: (v: string[]) => void, label: string) => {
    const opts = h('div', { class: 'opts' });
    const box = h('fieldset', { class: 'checks scroll' }, h('legend', {}, label), opts);
    for (const it of items) {
      const c = h('input', { type: 'checkbox', value: it.value, checked: chosen.includes(it.value) });
      c.addEventListener('change', () => {
        onChange([...box.querySelectorAll<HTMLInputElement>('input:checked')].map((x) => x.value));
        repaint();
      });
      opts.append(h('label', {}, c, it.label));
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
  const ideasBox = h('div', { class: 'stack' });
  const paintIdeas = () => {
    ideasBox.replaceChildren(
      ...t.ideas.map((idea, i) =>
        h(
          'fieldset',
          { class: 'sub' },
          h('legend', {}, `Idea ${i + 1}`),
          h(
            'div',
            { class: 'row' },
            ...(['top', 'bottom', 'left', 'right'] as const).map((sd) => {
              const c = input(idea[sd] ?? '', { maxlength: 60, placeholder: SIDE_LABEL[sd] });
              c.addEventListener('input', () => {
                if (c.value.trim()) idea[sd] = c.value;
                else delete idea[sd];
              });
              return field(SIDE_LABEL[sd], c);
            }),
          ),
          h(
            'div',
            { class: 'row' },
            btn('Try on the frame', () => {
              t.preset.sides = Object.fromEntries(
                Object.entries(idea)
                  .filter(([, text]) => text?.trim())
                  .map(([s, text]) => [s, { ...t.preset.sides[s as Side], text: text!, fontId: t.preset.sides[s as Side]?.fontId ?? data.fonts[0]!.id }]),
              ) as FrameSpec['sides'];
              repaint();
            }),
            btn('Remove', () => (t.ideas.splice(i, 1), paintIdeas()), { class: 'btn plain danger', 'aria-label': `Remove idea ${i + 1}` }),
          ),
        ),
      ),
      h(
        'div',
        {},
        btn('Add a wording idea', () => {
          t.ideas.push({ top: '' });
          paintIdeas();
          const all = ideasBox.querySelectorAll<HTMLFieldSetElement>('fieldset.sub');
          all[all.length - 1]?.querySelector('input')?.focus();
        }),
      ),
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
  if (serp) for (const [, f] of seoFields) f.area.addEventListener('input', serp.paint);

  function collect(): TemplateDoc {
    const seo = { ...t.seo };
    for (const [k, f] of seoFields) seo[k] = f.get();
    return { ...t, name: toLabel(name.value), handle: isNew ? handleIn.value.trim() : t.handle, intro: intro.value.trim(), seo };
  }

  /** Checks the two fields the server can't save without, next to the fields. */
  function validate(doc: TemplateDoc): boolean {
    let first: HTMLElement | null = null;
    setFieldError(name, doc.name.trim() ? null : 'Give the design a name.');
    if (!doc.name.trim()) first ??= name;
    if (isNew) {
      const bad = !doc.handle ? 'A web address name is needed.' : !/^[a-z0-9-]+$/.test(doc.handle) ? 'Use lowercase letters, numbers and dashes only.' : null;
      setFieldError(handleIn, bad);
      if (bad) first ??= handleIn;
    }
    if (first) {
      first.focus();
      toast('Fix the highlighted field to save.', 'bad');
    }
    return !first;
  }

  async function doSave(quiet = false): Promise<boolean> {
    const doc = collect();
    if (!validate(doc)) return false;
    try {
      await api(`/templates/${encodeURIComponent(doc.handle)}`, { method: 'PUT', body: JSON.stringify(doc) });
      await reload();
      errorSlot.replaceChildren();
      markClean();
      if (!quiet) {
        toast(doc.status === 'live' ? 'Saved. It goes on the site with the next publish.' : 'Saved as a draft.');
        if (isNew) location.hash = `#/designs/${doc.handle}`;
        else rerender();
      }
      return true;
    } catch (e) {
      showSaveError(errorSlot, e);
      return false;
    }
  }

  const change = existing && data.changes.find((c) => c.kind === 'template' && c.id === existing.handle);
  const staleNote = change?.stale ? banner('warning', 'The store changed underneath your edits', h('p', {}, STALE)) : null;
  const discardBtn = change
    ? btn(
        isLive ? 'Undo my edits' : 'Delete draft',
        async () => {
          if (!confirm(isLive ? 'Throw away your edits and go back to what the site shows?' : 'Delete this unpublished design?')) return;
          try {
            await api(`/drafts/template/${encodeURIComponent(existing!.handle)}`, { method: 'DELETE' });
            await reload();
          } catch (e) {
            return toast((e as Error).message, 'bad');
          }
          editor = null;
          toast(isLive ? 'Your edits are undone.' : 'Draft deleted.');
          if (isLive) rerender();
          else location.hash = '#/designs';
        },
        { class: isLive ? 'btn' : 'btn critical' },
      )
    : null;
  const viewLink = isLive && t.hasPage ? h('a', { class: 'btn', href: `/products/${t.handle}`, target: '_blank', rel: 'noopener' }, icon('store'), 'View live page', h('span', { class: 'visually-hidden' }, ' (opens in a new tab)')) : null;

  repaint();
  const view = h(
    'div',
    { class: 'page' },
    pageHeader(isNew ? 'New design' : t.name || t.handle, {
      back: ['#/designs', 'Back to designs'],
      badges: isNew ? [] : [badge(STATUS_LABEL[t.status] ?? t.status, STATUS_TONE[t.status] ?? ''), change ? badge('Edited', 'attention') : null],
      actions: [viewLink, discardBtn],
    }),
    h(
      'div',
      { class: 'stack' },
      errorSlot,
      staleNote,
      h(
        'div',
        { class: 'layout' },
        h(
          'div',
          { class: 'main-col' },
          fieldCard(
            'Basics',
            field('Name', name, undefined, { required: true }),
            field('Web address name', handleIn, isNew ? 'Made from the name: lowercase letters, numbers and dashes.' : `butterlu.com/products/${t.handle}. Fixed once a design exists.`, { required: isNew }),
          ),
          fieldCard('Design', field('Frame shape', shape), h('p', { class: 'label', id: bgLabel }, 'Background: ', bgName), bgGrid, fitBox, sides),
          fieldCard('Where it goes', field('Who it’s for', forSel), occBox, catBox),
          fieldCard(
            'Words on the page',
            field('Intro', intro, 'A sentence or two above the editor. Short, and no need to say it is personalized or ships free.'),
            field('Good for', goodFor, 'One per line, for example "Her birthday".'),
            h('p', { class: 'label' }, 'Wording ideas shoppers can load'),
            ideasBox,
          ),
          fieldCard(
            'Search and Shopping',
            data.setup.claude ? null : h('p', { class: 'hint' }, 'Claude drafts switch on once an Anthropic API key is added to the site. You can write these by hand meanwhile.'),
            serp?.el,
            ...seoFields.map(([, f]) => f.el),
          ),
        ),
        h(
          'div',
          { class: 'aside' },
          fieldCard('Status', field('Status', status, 'Live designs show in the store after a publish.'), h('label', { class: 'inline' }, ready, 'Can be bought as shown in one tap')),
          h('section', { class: 'card sticky', 'aria-label': 'Preview' }, h('h2', { class: 'card-title' }, 'Preview'), previewBox, issues),
        ),
      ),
    ),
  );
  track(view, { snapshot: () => JSON.stringify(collect()), save: () => doSave(), isNew, discardTo: '#/designs', saveLabel: isNew ? 'Save design' : 'Save' });
  return view;
}

function notFound(text: string, href: string, back: string): HTMLElement {
  return h('div', { class: 'page' }, card(null, emptyState('search', 'Not found', text, h('a', { class: 'btn', href }, back))));
}

// ---------- categories ----------

function categoryList() {
  const changed = new Set(data.changes.filter((c) => c.kind === 'category').map((c) => c.id));
  const cats = data.doc.categories;
  return h(
    'div',
    { class: 'page' },
    pageHeader('Categories'),
    h('p', { class: 'page-lede' }, 'Each category is a page in the store. Designs are filed onto them from each design.'),
    h(
      'section',
      { class: 'card flush', 'aria-label': 'Categories' },
      cats.length
        ? table(
            [{ label: 'Category' }, { label: 'Designs', cls: 'num' }, { label: 'To do' }],
            cats.map((c) =>
              linkedRow(
                td(undefined, ...rowLink(`#/categories/${c.handle}`, c.name, `/collections/${c.handle}`)),
                td('num', String(c.order.length)),
                td(
                  undefined,
                  h(
                    'span',
                    { class: 'badges' },
                    changed.has(c.handle) ? badge('Edited', 'attention') : null,
                    Object.values(c.seo).some((f) => f.status === 'draft') ? badge('SEO to approve', 'warning') : null,
                  ),
                ),
              ),
            ),
            'Category pages',
          )
        : emptyState('categories', 'No categories yet', 'Category pages come from the store’s catalog.'),
    ),
  );
}

/** "Undo my edits": throws away the saved draft and shows what the site has. */
function undoButton(path: string): HTMLButtonElement {
  return btn('Undo my edits', async () => {
    if (!confirm('Throw away your edits and go back to what the site shows?')) return;
    try {
      await api(path, { method: 'DELETE' });
      await reload();
    } catch (e) {
      return toast((e as Error).message, 'bad');
    }
    editor = null;
    toast('Your edits are undone.');
    rerender();
  });
}

function categoryEditor(handle: string): HTMLElement {
  const existing = data.doc.categories.find((c) => c.handle === handle);
  if (!existing) return notFound('That category was not found.', '#/categories', 'Back to categories');
  const c: CategoryDoc = structuredClone(existing);
  const byHandle = new Map(data.doc.templates.map((t) => [t.handle, t]));
  const errorSlot = h('div', {});

  const name = labelInput(c.name, { maxlength: 80 });
  const intro = textarea(c.intro, { maxlength: 400 });
  const body = textarea(c.body.join('\n\n'), { rows: 10 });
  const words = h('span', {});
  const countWords = () => (words.textContent = `${body.value.split(/\s+/).filter(Boolean).length} words.`);
  body.addEventListener('input', countWords);
  countWords();

  const orderBox = h('ol', { class: 'order' });
  const move = swapper(c.order, () => paintOrder(), () => orderBox, ':scope > li');
  const paintOrder = () =>
    orderBox.replaceChildren(
      ...c.order.map((hdl, i) => {
        const t = byHandle.get(hdl);
        const label = t?.name ?? hdl;
        return h(
          'li',
          {},
          h('span', { class: 'pos', 'aria-hidden': 'true' }, String(i + 1)),
          t ? thumb(t.handle, t.preset) : h('span', {}),
          h('span', { class: 'name' }, label, ' ', t && t.status !== 'live' ? badge(STATUS_LABEL[t.status] ?? t.status, STATUS_TONE[t.status] ?? '') : null),
          movers(i, c.order.length, label, (d) => move(i, d)),
        );
      }),
    );
  paintOrder();

  const relOpts = h('div', { class: 'opts' });
  const related = h('fieldset', { class: 'checks scroll' }, h('legend', { class: 'visually-hidden' }, 'Links to other categories'), relOpts);
  for (const o of data.doc.categories) {
    if (o.handle === c.handle) continue;
    const box = h('input', { type: 'checkbox', value: o.handle, checked: c.related.includes(o.handle) });
    box.addEventListener('change', () => (c.related = [...related.querySelectorAll<HTMLInputElement>('input:checked')].map((x) => x.value)));
    relOpts.append(h('label', {}, box, o.name));
  }

  const collect = (): CategoryDoc => {
    const seo = { ...c.seo };
    for (const [k, f] of seoFields) seo[k] = f.get();
    return { ...c, name: toLabel(name.value), intro: intro.value.trim(), body: body.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean), seo };
  };
  async function doSave(quiet = false) {
    try {
      await api(`/categories/${c.handle}`, { method: 'PUT', body: JSON.stringify(collect()) });
      await reload();
      errorSlot.replaceChildren();
      markClean();
      if (!quiet) {
        toast('Saved. It goes on the site with the next publish.');
        rerender();
      }
      return true;
    } catch (e) {
      showSaveError(errorSlot, e);
      return false;
    }
  }
  const seoFields = CATEGORY_SEO.map((k) => [k, seoEditor('category', k, c.seo[k], () => collect() as unknown as Record<string, unknown>, () => doSave(true))] as const);
  const serp = searchPreview(
    () => seoFields[0]![1].area.value,
    () => seoFields[1]![1].area.value,
    () => `/collections/${c.handle}`,
  );
  for (const [, f] of seoFields) f.area.addEventListener('input', serp.paint);

  const change = data.changes.find((x) => x.kind === 'category' && x.id === c.handle);
  const staleNote = change?.stale ? banner('warning', 'The store changed underneath your edits', h('p', {}, STALE)) : null;
  const isLive = data.liveHandles.categories.includes(c.handle);
  const viewLink = isLive ? h('a', { class: 'btn', href: `/collections/${c.handle}`, target: '_blank', rel: 'noopener' }, icon('store'), 'View live page', h('span', { class: 'visually-hidden' }, ' (opens in a new tab)')) : null;

  const view = h(
    'div',
    { class: 'page' },
    pageHeader(c.name, { back: ['#/categories', 'Back to categories'], badges: [change ? badge('Edited', 'attention') : null], actions: [viewLink, change ? undoButton(`/drafts/category/${c.handle}`) : null] }),
    h(
      'div',
      { class: 'stack' },
      errorSlot,
      staleNote,
      h(
        'div',
        { class: 'layout' },
        h(
          'div',
          { class: 'main-col' },
          fieldCard(
            'Page',
            field('Name', name),
            field('Intro', intro, 'A sentence or two above the designs. Short, and no need to restate the obvious.'),
            field('Words below the designs', body),
            h('p', { class: 'hint', 'aria-live': 'polite' }, words, ' Leave an empty line between paragraphs.'),
          ),
          card(
            'Order of designs',
            h('p', { class: 'hint' }, 'To add or remove a design here, open the design and change its category pages.'),
            c.order.length ? orderBox : h('p', { class: 'muted' }, 'No designs are filed here yet.'),
          ),
          fieldCard('Search engine listing', serp.el, ...seoFields.map(([, f]) => f.el)),
        ),
        h(
          'div',
          { class: 'aside' },
          card('Links to other categories', h('p', { class: 'hint' }, 'Shown at the bottom of this page.'), related),
          card('Questions', h('p', { class: 'muted' }, 'The questions under the words are the store’s shared ones. ', h('a', { href: '#/questions' }, 'Edit them under Questions'), '.')),
        ),
      ),
    ),
  );
  track(view, { snapshot: () => JSON.stringify(collect()), save: () => doSave() });
  return view;
}

// ---------- shop-by lists ----------

let drawingUrls: Record<string, string> | undefined;
/** The card drawing for a group or occasion: a picker from src/catalog/illustrations.ts and a preview. */
function drawingPicker(item: { illustration?: string }): HTMLElement {
  drawingUrls ??= JSON.parse(document.getElementById('illustration-urls')?.textContent ?? '{}') as Record<string, string>;
  const img = h('img', { class: 'drawing', alt: '', width: 48, height: 48 });
  const show = () => {
    const url = item.illustration ? drawingUrls![item.illustration] : undefined;
    img.hidden = !url;
    if (url) img.src = url;
  };
  const pick = select([{ value: '', label: 'No drawing' }, ...ILLUSTRATIONS.map((i) => ({ value: i.key, label: i.name }))], item.illustration ?? '', {
    onchange: () => {
      // "" keeps "no drawing" as her choice, so the site's default doesn't come back.
      item.illustration = pick.value;
      show();
    },
  });
  show();
  return h('span', { class: 'row center' }, field('Drawing on its card', pick), img);
}

/**
 * An inline "add" field: a name and a button, in place of a pop-up prompt. `add` returns
 * an error to show under the field, or null once the item is in. Enter adds too.
 */
function adder(adderId: string, label: string, button: string, placeholder: string, add: (name: string) => string | null): HTMLElement {
  const box = input('', { id: adderId, placeholder, maxlength: 60, autocomplete: 'off' });
  const go = () => {
    const raw = box.value.trim();
    if (!raw) return setFieldError(box, 'Type a name first.');
    const err = add(toLabel(raw));
    if (err) setFieldError(box, err);
    else document.getElementById(adderId)?.focus();
  };
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      go();
    }
  });
  box.addEventListener('input', () => {
    if (box.getAttribute('aria-invalid')) setFieldError(box, null);
  });
  return h('div', { class: 'adder' }, field(label, box), btn(button, go));
}

function shopBy(): HTMLElement {
  const tax = structuredClone(data.doc.taxonomy);
  const errorSlot = h('div', {});
  // Every label follows the rule, including ones she doesn't touch, so a save goes through.
  const fixLabels = () => {
    for (const g of tax.groups) {
      g.label = toLabel(g.label);
      for (const c of g.children) c.label = toLabel(c.label);
    }
    for (const o of tax.occasions) o.label = toLabel(o.label);
  };
  fixLabels();
  const box = h('div', { class: 'stack' });
  const catOptions = (blank: boolean) => [...(blank ? [{ value: '', label: 'Store search, no page of its own' }] : []), ...data.doc.categories.map((c) => ({ value: c.handle, label: c.name }))];
  const taken = (key: string) => tax.groups.some((x) => x.key === key || x.children.some((c) => c.key === key));
  function paint() {
    const moveGroup = swapper(tax.groups, paint, () => box, ':scope > .card[data-group]');
    box.replaceChildren(
      ...tax.groups.map((g, gi) => {
        const label = labelInput(g.label, { maxlength: 60 }, (v) => (g.label = v));
        const menus = h('input', { type: 'checkbox', checked: g.inMenus, onchange: () => (g.inMenus = menus.checked) });
        const page = select(catOptions(false), g.collection, { onchange: () => (g.collection = page.value) });
        const people = h('ul', { class: 'list' });
        const moveChild = swapper(g.children, paint, () => box.querySelector<HTMLElement>(`.card[data-group="${CSS.escape(g.key)}"] .list`)!, ':scope > li');
        people.append(
          ...g.children.map((r, ri) => {
            const rl = labelInput(r.label, { maxlength: 60 }, (v) => (r.label = v));
            return h('li', {}, field(`Name ${ri + 1}`, rl), movers(ri, g.children.length, r.label, (d) => moveChild(ri, d)));
          }),
        );
        return h(
          'fieldset',
          { class: 'card', 'data-group': g.key },
          h('legend', { class: 'visually-hidden' }, g.label),
          h('div', { class: 'card-head' }, h('h2', { 'aria-hidden': 'true' }, g.label), h('span', { class: 'actions' }, movers(gi, tax.groups.length, g.label, (d) => moveGroup(gi, d)))),
          h('div', { class: 'row' }, field('Group name', label), field('Opens the page', page), drawingPicker(g)),
          h('label', { class: 'inline' }, menus, 'Show in the menus'),
          h('p', { class: 'label' }, 'People in this group'),
          people,
          adder(`add-${g.key}`, `Add someone to ${g.label}`, 'Add person', 'For example "Godmother"', (n) => {
            const key = slugify(n);
            if (!key || taken(key)) return 'That name is already in the list.';
            g.children.push({ key, label: n });
            paint();
            return null;
          }),
        );
      }),
      (() => {
        const list = h('ul', { class: 'list' });
        const moveOcc = swapper(tax.occasions, paint, () => box.querySelector<HTMLElement>('.card[data-occasions] .list')!, ':scope > li');
        list.append(
          ...tax.occasions.map((o, oi) => {
            const ol = labelInput(o.label, { maxlength: 60 }, (v) => (o.label = v));
            const page = select(catOptions(true), o.collection ?? '', {
              onchange: () => {
                if (page.value) o.collection = page.value;
                else delete o.collection;
              },
            });
            return h('li', {}, field('Name', ol), field('Opens', page), drawingPicker(o), movers(oi, tax.occasions.length, o.label, (d) => moveOcc(oi, d)));
          }),
        );
        const fc = fieldCard(
          'Occasions',
          list,
          adder('add-occasion', 'New occasion', 'Add occasion', 'For example "Baptisms & Christenings"', (n) => {
            const key = slugify(n);
            if (!key || tax.occasions.some((o) => o.key === key)) return 'That occasion is already in the list.';
            tax.occasions.push({ key, label: n });
            paint();
            return null;
          }),
        );
        fc.dataset.occasions = '';
        return fc;
      })(),
    );
  }
  paint();
  async function doSave() {
    try {
      fixLabels();
      await api('/taxonomy', { method: 'PUT', body: JSON.stringify(tax) });
      await reload();
      markClean();
      toast('Saved. The menus change with the next publish.');
      rerender();
      return true;
    } catch (e) {
      showSaveError(errorSlot, e);
      return false;
    }
  }
  const change = data.changes.find((x) => x.kind === 'taxonomy');
  const view = h(
    'div',
    { class: 'page narrow' },
    pageHeader('Shop by', { badges: [change ? badge('Edited', 'attention') : null] }),
    h('p', { class: 'page-lede' }, 'The two lists in the store menus and filters, and the cards on the homepage. Designs are tagged from each design. Names are Title Case with "&" for "and"; that is applied when you leave a field.'),
    h('div', { class: 'stack' }, errorSlot, box),
  );
  track(view, { snapshot: () => JSON.stringify(tax), save: doSave });
  return view;
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
    'div',
    { class: 'page' },
    pageHeader('Pages'),
    h('p', { class: 'page-lede' }, 'Pages built from components you add, edit and put in order.'),
    h(
      'section',
      { class: 'card flush', 'aria-label': 'Pages' },
      data.doc.pages.length
        ? table(
            [{ label: 'Page' }, { label: 'Components', cls: 'num' }, { label: 'To do' }],
            data.doc.pages.map((p) =>
              linkedRow(td(undefined, ...rowLink(`#/pages/${p.key}`, p.name)), td('num', String(p.sections.length)), td(undefined, changed.has(p.key) ? badge('Edited', 'attention') : null)),
            ),
            'Pages',
          )
        : emptyState('pages', 'No pages yet', 'Pages built from components show here.'),
    ),
  );
}

function pageEditor(key: string): HTMLElement {
  const existing = data.doc.pages.find((p) => p.key === key);
  if (!existing) return notFound('That page was not found.', '#/pages', 'Back to pages');
  const page: PageDoc = structuredClone(existing);
  const photos = photoFiles();
  const box = h('div', { class: 'stack' });
  const errorSlot = h('div', {});

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

  function propsFields(s: ValuePropsSection, sectionIndex: number): HTMLElement[] {
    const list = h('ul', { class: 'list' });
    const moveProp = swapper(s.items, paint, () => box.querySelectorAll<HTMLElement>(':scope > .card[data-section]')[sectionIndex]!.querySelector<HTMLElement>('.list')!, ':scope > li');
    list.append(
      ...s.items.map((it, i) => {
        const ic = select(VALUE_PROP_ICONS.map((v) => ({ value: v, label: ICON_LABEL[v] })), it.icon, { onchange: () => (it.icon = ic.value as ValuePropIcon) });
        const nm = it.title || `value prop ${i + 1}`;
        return h(
          'li',
          {},
          field('Icon', ic),
          field(`Title ${i + 1}`, text(it.title, LIMITS.propTitle, (v) => (it.title = v))),
          field('Text', text(it.text, LIMITS.propText, (v) => (it.text = v))),
          h('span', { class: 'row center' }, movers(i, s.items.length, nm, (d) => moveProp(i, d), 'horizontal'), btn('Remove', () => (s.items.splice(i, 1), paint()), { class: 'btn plain danger', 'aria-label': `Remove ${nm}` })),
        );
      }),
    );
    return [
      field('Heading (optional)', text(s.heading, LIMITS.heading, (v) => (s.heading = v))),
      list,
      s.items.length < MAX_VALUE_PROPS
        ? h('div', {}, btn('Add a value prop', () => (s.items.push({ icon: 'check', title: '', text: '' }), paint())))
        : h('p', { class: 'hint' }, `${MAX_VALUE_PROPS} at most.`),
      h('p', { class: 'hint' }, 'Three show side by side on a computer and stack on a phone.'),
    ];
  }

  const addType = select(SECTION_TYPES.map((t) => ({ value: t.type, label: t.label })), SECTION_TYPES[0]!.type);
  const addHint = h('p', { class: 'hint' }, SECTION_TYPES[0]!.hint);
  addType.addEventListener('change', () => (addHint.textContent = SECTION_TYPES.find((t) => t.type === addType.value)?.hint ?? ''));
  const moveSection = swapper(page.sections, () => paint(), () => box, ':scope > .card[data-section]');

  function paint() {
    box.replaceChildren(
      ...page.sections.map((s, i) => {
        const nm = `${label(s)} ${i + 1}`;
        return h(
          'fieldset',
          { class: 'card', 'data-section': s.type },
          h('legend', { class: 'visually-hidden' }, `${i + 1}. ${label(s)}`),
          h(
            'div',
            { class: 'card-head' },
            h('h2', { 'aria-hidden': 'true' }, `${i + 1}. ${label(s)}`),
            h(
              'span',
              { class: 'actions' },
              movers(i, page.sections.length, nm, (d) => moveSection(i, d)),
              btn(
                'Remove',
                () => {
                  if (!confirm(`Remove this ${label(s)}?`)) return;
                  page.sections.splice(i, 1);
                  paint();
                },
                { class: 'btn plain danger', 'aria-label': `Remove ${nm}` },
              ),
            ),
          ),
          ...(s.type === 'hero-image'
            ? heroFields(s)
            : s.type === 'questions'
              ? [
                  field('Heading (optional)', text(s.heading, LIMITS.heading, (v) => (s.heading = v))),
                  h('p', { class: 'hint' }, `Shows the store’s ${data.doc.questions.length} shared questions. `, h('a', { href: '#/questions' }, 'Edit them under Questions'), '.'),
                ]
              : propsFields(s, i)),
        );
      }),
      page.sections.length < MAX_SECTIONS
        ? fieldCard(
            'Add a component',
            h(
              'div',
              { class: 'row end' },
              field('Component', addType),
              btn('Add', () => {
                page.sections.push(newSection(addType.value as SectionType, page.sections.map((x) => x.id)));
                paint();
                const added = box.querySelectorAll<HTMLElement>(':scope > .card[data-section]');
                const last = added[added.length - 1];
                last?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                last?.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true });
              }),
            ),
            addHint,
          )
        : h('p', { class: 'hint' }, `${MAX_SECTIONS} components at most.`),
    );
  }
  paint();

  async function doSave() {
    try {
      await api(`/pages/${page.key}`, { method: 'PUT', body: JSON.stringify(page) });
      await reload();
      markClean();
      toast('Saved. It goes on the site with the next publish.');
      rerender();
      return true;
    } catch (e) {
      showSaveError(errorSlot, e);
      return false;
    }
  }
  const change = data.changes.find((x) => x.kind === 'page' && x.id === page.key);
  const staleNote = change?.stale ? banner('warning', 'The store changed underneath your edits', h('p', {}, STALE)) : null;
  const view = h(
    'div',
    { class: 'page narrow' },
    pageHeader(page.name, { back: ['#/pages', 'Back to pages'], badges: [change ? badge('Edited', 'attention') : null], actions: [change ? undoButton(`/drafts/page/${page.key}`) : null] }),
    h('p', { class: 'page-lede' }, key === 'home' ? 'These show at the top of the homepage, in this order. The rest of the homepage (who it’s for, the two frames, most loved designs) follows them.' : 'Shown top to bottom, in this order.'),
    h('div', { class: 'stack' }, errorSlot, staleNote, box),
  );
  track(view, { snapshot: () => JSON.stringify(page), save: doSave });
  return view;
}

// ---------- questions (one list, shared by every page) ----------

function questionsEditor(): HTMLElement {
  const qs: [string, string][] = data.doc.questions.map(([q, a]) => [q, a]);
  const box = h('div', { class: 'stack' });
  const errorSlot = h('div', {});
  const move = swapper(qs, () => paint(), () => box, ':scope > .card[data-question]');
  function paint() {
    box.replaceChildren(
      ...qs.map((pair, i) => {
        const q = input(pair[0], { maxlength: LIMITS.question });
        const a = textarea(pair[1], { maxlength: LIMITS.answer, rows: 3 });
        q.addEventListener('input', () => (pair[0] = q.value));
        a.addEventListener('input', () => (pair[1] = a.value));
        return h(
          'fieldset',
          { class: 'card', 'data-question': String(i + 1) },
          h('legend', { class: 'visually-hidden' }, `Question ${i + 1}`),
          h(
            'div',
            { class: 'card-head' },
            h('h2', { 'aria-hidden': 'true' }, `Question ${i + 1}`),
            h('span', { class: 'actions' }, movers(i, qs.length, `question ${i + 1}`, (d) => move(i, d)), btn('Remove', () => (qs.splice(i, 1), paint()), { class: 'btn plain danger', 'aria-label': `Remove question ${i + 1}` })),
          ),
          field('Question', q),
          field('Answer', a),
        );
      }),
      qs.length < MAX_QUESTIONS
        ? h(
            'div',
            {},
            btn('Add a question', () => {
              qs.push(['', '']);
              paint();
              const cards = box.querySelectorAll<HTMLElement>(':scope > .card[data-question]');
              const last = cards[cards.length - 1];
              last?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              last?.querySelector('input')?.focus({ preventScroll: true });
            }),
          )
        : h('p', { class: 'hint' }, `${MAX_QUESTIONS} questions at most.`),
    );
  }
  paint();

  async function doSave() {
    try {
      await api('/questions', { method: 'PUT', body: JSON.stringify(qs satisfies QuestionDoc[]) });
      await reload();
      markClean();
      toast('Saved. It goes on the site with the next publish.');
      rerender();
      return true;
    } catch (e) {
      showSaveError(errorSlot, e);
      return false;
    }
  }
  const change = data.changes.find((x) => x.kind === 'questions');
  const staleNote = change?.stale ? banner('warning', 'The store changed underneath your edits', h('p', {}, STALE)) : null;
  const view = h(
    'div',
    { class: 'page narrow' },
    pageHeader('Questions', { badges: [change ? badge('Edited', 'attention') : null], actions: [change ? undoButton('/drafts/questions/all') : null] }),
    h('p', { class: 'page-lede' }, 'One list for the whole store. It shows on the Questions page, under every category and design, and anywhere you add a Questions component. Answer what shoppers really ask, in the order they ask it.'),
    h('div', { class: 'stack' }, errorSlot, staleNote, box),
  );
  track(view, { snapshot: () => JSON.stringify(qs), save: doSave });
  return view;
}

// ---------- changes ----------

const when = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

function changes(): HTMLElement {
  const KIND: Record<string, string> = { template: 'Design', category: 'Category', page: 'Page', questions: 'Questions', taxonomy: 'Shop by' };
  const link = (c: CatalogResponse['changes'][number]) =>
    c.kind === 'template' ? `#/designs/${c.id}` : c.kind === 'category' ? `#/categories/${c.id}` : c.kind === 'page' ? `#/pages/${c.id}` : c.kind === 'questions' ? '#/questions' : '#/shop-by';
  return h(
    'div',
    { class: 'page' },
    pageHeader('Changes', { badges: data.changes.length ? [badge(`${data.changes.length} waiting`, 'attention')] : [] }),
    h(
      'div',
      { class: 'stack' },
      banner(
        'info',
        data.setup.publish ? 'Publishing puts these on the test store' : 'Your edits are saved here',
        h('p', {}, data.setup.publish ? 'Justin takes them from the test store to butterlu.com.' : 'Publishing them to the store is the next step and is switched on soon.'),
      ),
      data.check.errors.length ? banner('critical', `${data.check.errors.length} to fix before a publish`, h('ul', {}, ...data.check.errors.map((e) => h('li', {}, e)))) : null,
      data.check.warnings.length
        ? banner('warning', null, h('details', {}, h('summary', {}, `${data.check.warnings.length} things worth a look`), h('ul', {}, ...data.check.warnings.map((w) => h('li', {}, w)))))
        : null,
      h(
        'section',
        { class: 'card flush', 'aria-label': 'Changes waiting to publish' },
        data.changes.length
          ? table(
              [{ label: 'Item' }, { label: 'Type', cls: 'hide-sm' }, { label: 'Change' }, { label: 'Saved', cls: 'hide-sm' }, { label: 'Check' }],
              data.changes.map((c) =>
                linkedRow(
                  td(undefined, ...rowLink(link(c), c.name || c.id)),
                  td('hide-sm', KIND[c.kind] ?? c.kind),
                  td(undefined, badge(c.isNew ? 'New' : 'Edited', c.isNew ? 'info' : 'attention')),
                  td('hide-sm', when(c.at), c.by ? h('span', { class: 'cell-sub' }, `by ${c.by}`) : null),
                  td(undefined, c.stale ? badge('Site changed since', 'critical') : null),
                ),
              ),
              'Changes waiting to publish',
            )
          : emptyState('check', 'Nothing waiting', 'Everything matches the store. Edits you save show up here until they’re published.'),
      ),
    ),
  );
}

// ---------- orders ----------

const money = (cents: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
const paid = (o: AdminOrder) => o.paymentStatus === 'paid' || o.paymentStatus === 'no_payment_required';
const paymentBadge = (o: AdminOrder) => (paid(o) ? badge('Paid', 'success') : badge(`Payment ${o.paymentStatus}`, 'critical'));
const orderFilter = { status: '' };

async function loadOrders() {
  orders = await api<OrdersResponse>('/orders');
}

function orderList(): HTMLElement {
  if (!orders) return loadingOrders();
  const { orders: all, statuses } = orders;
  const tabs = h('div', { class: 'tabs', role: 'group', 'aria-label': 'Show orders by status' });
  const body = h('div', {});
  const paint = () => {
    tabs.replaceChildren(
      ...[['', 'All'], ...statuses.map((s) => [s, ORDER_LABEL[s] ?? s])].map(([value, label]) =>
        h(
          'button',
          { type: 'button', class: 'tab', 'aria-pressed': String(orderFilter.status === value), onclick: () => ((orderFilter.status = value!), paint()) },
          label!,
          h('span', { class: 'n' }, String(all.filter((o) => !value || o.status === value).length)),
        ),
      ),
    );
    const shown = all.filter((o) => !orderFilter.status || o.status === orderFilter.status);
    body.replaceChildren(
      !all.length
        ? emptyState('orders', 'No orders yet', 'When someone checks out, their order shows here with what to make and where to send it.')
        : !shown.length
          ? emptyState('search', `No ${(ORDER_LABEL[orderFilter.status] ?? orderFilter.status).toLowerCase()} orders`, 'Pick another tab to see the rest.')
          : table(
              [{ label: 'Customer' }, { label: 'Date', cls: 'hide-sm' }, { label: 'Items', cls: 'num hide-sm' }, { label: 'Total', cls: 'num' }, { label: 'Payment' }, { label: 'Status' }],
              shown.map((o) =>
                linkedRow(
                  td(undefined, ...rowLink(`#/orders/${o.id}`, o.shipName ?? o.name ?? 'No name', o.email ?? undefined)),
                  td('hide-sm', when(o.createdAt)),
                  td('num hide-sm', String(o.lines.reduce((n, l) => n + l.quantity, 0))),
                  td('num', money(o.amountTotal, o.currency)),
                  td(undefined, h('span', { class: 'badges' }, paymentBadge(o), o.livemode ? null : badge('Test'))),
                  td(undefined, badge(ORDER_LABEL[o.status] ?? o.status, ORDER_TONE[o.status] ?? '')),
                ),
              ),
              'Orders, newest first',
            ),
    );
  };
  paint();
  return h('div', { class: 'page' }, pageHeader('Orders'), h('section', { class: 'card flush', 'aria-label': 'Orders' }, all.length ? tabs : null, body));
}

function orderDetail(sessionId: string): HTMLElement {
  if (!orders) return loadingOrders();
  const o = orders.orders.find((x) => x.id === sessionId);
  if (!o) return notFound('That order was not found.', '#/orders', 'Back to orders');
  const errorSlot = h('div', {});
  const status = select(orders.statuses.map((s) => ({ value: s, label: ORDER_LABEL[s] ?? s })), o.status);
  const carrier = input(o.carrier ?? '', { maxlength: 30, placeholder: 'USPS' });
  const tracking = input(o.trackingNumber ?? '', { maxlength: 60, autocomplete: 'off', spellcheck: 'false' });
  const note = textarea(o.note ?? '', { maxlength: 1000, rows: 3 });
  const collect = () => ({ status: status.value, carrier: carrier.value.trim(), tracking_number: tracking.value.trim(), note: note.value.trim() });
  async function doSave() {
    try {
      await api(`/orders/${encodeURIComponent(o!.id)}`, { method: 'POST', body: JSON.stringify(collect()) });
      await loadOrders();
      markClean();
      toast('Order saved.');
      rerender();
      return true;
    } catch (e) {
      showSaveError(errorSlot, e);
      return false;
    }
  }
  const dl = (...pairs: [string, Kid][]) => h('dl', { class: 'dl' }, ...pairs.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]));
  const view = h(
    'div',
    { class: 'page' },
    pageHeader(o.shipName ?? o.name ?? 'Order', {
      back: ['#/orders', 'Back to orders'],
      badges: [paymentBadge(o), badge(ORDER_LABEL[o.status] ?? o.status, ORDER_TONE[o.status] ?? ''), o.livemode ? null : badge('Test')],
    }),
    h('p', { class: 'page-lede' }, `${when(o.createdAt)} · ${money(o.amountTotal, o.currency)}`),
    h(
      'div',
      { class: 'stack' },
      errorSlot,
      paid(o) ? null : banner('critical', `Hold: payment is ${o.paymentStatus}`, h('p', {}, 'Don’t make this frame until the payment clears.')),
      h(
        'div',
        { class: 'layout' },
        h(
          'div',
          { class: 'main-col' },
          card(
            'Items',
            h(
              'ul',
              { class: 'lines' },
              ...o.lines.map((l) =>
                h(
                  'li',
                  {},
                  h(
                    'div',
                    {},
                    h('strong', {}, `${l.quantity} × ${l.name ?? l.handle ?? 'Frame'}`),
                    h('div', { class: 'muted' }, l.summary ?? 'Design could not be read'),
                    l.errors.length ? h('p', { class: 'error' }, `Check by hand: ${l.errors.join('; ')}`) : null,
                  ),
                  h('span', { class: 'num' }, money(l.amountTotal, o.currency)),
                ),
              ),
            ),
          ),
          fieldCard('Fulfilment', h('div', { class: 'row' }, field('Status', status), field('Carrier', carrier), field('Tracking number', tracking)), field('Note', note, 'Only you and Asli see this.')),
        ),
        h(
          'div',
          { class: 'aside' },
          card(
            'Customer',
            dl(
              ['Name', o.name ?? 'None given'],
              ['Email', o.email ? h('a', { href: `mailto:${o.email}` }, o.email) : 'None given'],
              ...(o.phone ? ([['Phone', o.phone]] as [string, Kid][]) : []),
              ['Marketing', o.marketingOptIn ? 'Opted in' : 'Not opted in'],
            ),
          ),
          card(
            'Ship to',
            o.shipAddress.length
              ? h('address', {}, ...[o.shipName, ...o.shipAddress].filter((x): x is string => !!x).flatMap((x, i) => (i ? [h('br'), x] : [x])))
              : h('p', { class: 'muted' }, 'No address'),
          ),
          card('Reference', h('p', { class: 'mono' }, `Stripe ${o.id}`), o.shippedAt ? h('p', { class: 'hint' }, `Shipped ${when(o.shippedAt)}`) : null),
        ),
      ),
    ),
  );
  track(view, { snapshot: () => JSON.stringify(collect()), save: doSave, saveLabel: 'Save order' });
  return view;
}

let ordersLoading = false;
function loadingOrders(): HTMLElement {
  if (!ordersLoading) {
    ordersLoading = true;
    loadOrders()
      .then(() => render())
      .catch((e) => document.getElementById('main')?.replaceChildren(h('div', { class: 'page' }, pageHeader('Orders'), banner('critical', 'The orders couldn’t load', h('p', {}, (e as Error).message)))))
      .finally(() => (ordersLoading = false));
  }
  return h('div', { class: 'page' }, pageHeader('Orders'), h('p', { class: 'loading', role: 'status' }, 'Loading orders…'));
}

// ---------- shell ----------

function initials(who: string): string {
  const base = who.split('@')[0] ?? who;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function topbar(): HTMLElement {
  const menu = h('button', { type: 'button', class: 'btn icon-only menu-btn', 'aria-label': 'Menu', 'aria-expanded': 'false', 'aria-controls': 'sidenav', onclick: () => toggleNav() }, icon('menu'));
  return h(
    'header',
    { class: 'topbar' },
    menu,
    h('a', { class: 'brand', href: '#/designs' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'B'), h('span', {}, 'Butterlu'), h('span', { class: 'brand-sub' }, 'Store admin')),
    h('span', { class: 'spacer' }),
    data.setup.signIn === 'workos'
      ? h(
          'form',
          { class: 'account', method: 'post', action: '/admin/sign-out' },
          h('span', { class: 'avatar', 'aria-hidden': 'true' }, initials(data.me)),
          h('span', { class: 'who' }, data.me),
          h('button', { class: 'btn', type: 'submit' }, 'Sign out'),
        )
      : h('span', { class: 'account' }, h('span', { class: 'avatar', 'aria-hidden': 'true' }, initials(data.me)), h('span', { class: 'who' }, `Signed in as ${data.me}`)),
  );
}

function toggleNav(open?: boolean) {
  const nav = document.getElementById('sidenav');
  const menuBtn = document.querySelector<HTMLButtonElement>('.menu-btn');
  if (!nav || !menuBtn) return;
  const next = open ?? !nav.classList.contains('open');
  nav.classList.toggle('open', next);
  menuBtn.setAttribute('aria-expanded', String(next));
  if (next) nav.querySelector<HTMLElement>('a')?.focus();
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('sidenav')?.classList.contains('open')) {
    toggleNav(false);
    document.querySelector<HTMLElement>('.menu-btn')?.focus();
  }
});

function sidenav(route: string): HTMLElement {
  const item = (href: string, label: string, iconName: IconName, extra?: Kid) => {
    const path = href.slice(1);
    const current = route === path || route.startsWith(`${path}/`);
    return h('li', {}, h('a', { class: 'nav-link', href, 'aria-current': current ? 'page' : undefined }, icon(iconName), h('span', {}, label), extra));
  };
  const group = (heading: string | null, ...items: HTMLElement[]) => {
    const hid = heading ? id('nav') : undefined;
    return [heading ? h('p', { class: 'nav-heading', id: hid }, heading) : null, h('ul', { 'aria-labelledby': hid }, ...items)];
  };
  const n = data.changes.length;
  return h(
    'nav',
    { class: 'sidenav', id: 'sidenav', 'aria-label': 'Admin' },
    ...group(null, item('#/designs', 'Designs', 'designs'), item('#/categories', 'Categories', 'categories'), item('#/shop-by', 'Shop by', 'shopby')),
    ...group('Content', item('#/pages', 'Pages', 'pages'), item('#/questions', 'Questions', 'questions')),
    ...group('Sales', item('#/orders', 'Orders', 'orders')),
    ...group(
      'Publishing',
      item('#/changes', 'Changes', 'changes', n ? h('span', { class: 'nav-count' }, String(n), h('span', { class: 'visually-hidden' }, ' waiting')) : null),
      h('li', {}, h('a', { class: 'nav-link', href: '/', target: '_blank', rel: 'noopener' }, icon('store'), h('span', {}, 'View store'), h('span', { class: 'visually-hidden' }, ' (opens in a new tab)'))),
    ),
  );
}

let rendered = false;
function render() {
  const route = location.hash.replace(/^#/, '') || '/designs';
  editor = null;
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
  else if ((m = /^\/orders\/(cs_[A-Za-z0-9_]{1,200})$/.exec(route))) view = orderDetail(m[1]!);
  else if (route === '/orders') view = orderList();
  else view = templateList();
  const main = h('main', { id: 'main', class: 'main', tabindex: '-1' }, view);
  const skip = h('a', { class: 'skip', href: '#main' }, 'Skip to content');
  skip.addEventListener('click', (e) => {
    e.preventDefault();
    main.focus();
  });
  root.replaceChildren(skip, topbar(), sidenav(route), main);
  paintSaveBar();
  const title = view.querySelector('h1')?.textContent;
  document.title = `${title ? `${title} · ` : ''}Butterlu admin`;
  // After a page change, focus goes to the new page so a screen reader starts there.
  if (rendered) main.focus({ preventScroll: true });
  rendered = true;
}

// Leaving a form with unsaved edits asks first. The address goes back if she stays.
let currentHash = location.hash;
window.addEventListener('hashchange', () => {
  if (isDirty() && !confirm('Leave this page? Your unsaved changes will be lost.')) {
    history.replaceState(null, '', currentHash || '#/designs');
    return;
  }
  currentHash = location.hash;
  document.getElementById('sidenav')?.classList.remove('open');
  render();
  window.scrollTo(0, 0);
});

(async () => {
  try {
    await Promise.all([reload(), fontsReady()]);
    render();
  } catch (e) {
    root.replaceChildren(h('div', { class: 'page' }, banner('critical', 'The admin couldn’t load', h('p', {}, (e as Error).message))));
  }
})();

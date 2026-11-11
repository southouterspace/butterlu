// Page components ("sections") that Asli adds, edits and orders in the admin
// (docs/13 "Pages"). A page is a list of sections drawn top to bottom; each section
// type has an Astro component in src/components/sections/. The homepage's list lives
// in pages.json, which the build reads and a publish from the admin rewrites.
//
// Plain TypeScript with no Astro imports: the admin Worker, the editor and the build
// all read it. A new section type needs: its interface and entry in SECTION_TYPES
// here, a case in sectionFrom and checkSection, a component, and an editor in
// src/admin/app.ts.
import pagesJson from './pages.json';

/** The lucide icons a value prop can use (all of them exist in components/ui/Icon.astro). */
export const VALUE_PROP_ICONS = ['heart', 'pen-line', 'gift', 'truck', 'clock', 'check', 'frame', 'image', 'shopping-bag'] as const;
export type ValuePropIcon = (typeof VALUE_PROP_ICONS)[number];

export interface ButtonDoc {
  label: string;
  /** A path on the site ("/collections/all") or a full https:// address. */
  href: string;
}

/**
 * The hero's photo: a file under src/assets/media/ (it goes through the image pipeline,
 * so a missing file fails the build). Empty until Asli's photos are in: stage then shows
 * the image placeholder (Justin, 2026-11-11) and production shows the words alone.
 */
export interface HeroImageDoc {
  file: string;
  alt: string;
}

export interface HeroImageSection {
  type: 'hero-image';
  /** Stable within the page, so the editor and the HTML can tell sections apart. */
  id: string;
  heading: string;
  text: string;
  image: HeroImageDoc;
  button: ButtonDoc;
  /** Optional second button; an empty label leaves it out. */
  secondary: ButtonDoc;
}

export interface ValuePropDoc {
  icon: ValuePropIcon;
  title: string;
  text: string;
}

export interface ValuePropsSection {
  type: 'value-props';
  id: string;
  /** Optional heading over the columns; empty shows none (the list is still labelled). */
  heading: string;
  /** Three columns on desktop, stacked on phones. */
  items: ValuePropDoc[];
}

/**
 * The shared questions and answers. There is one list for the whole store (edited under
 * Questions in the admin); this section only places it on a page, under its heading.
 */
export interface QuestionsSection {
  type: 'questions';
  id: string;
  /** Heading over the list; empty shows none (the list is still labelled). */
  heading: string;
}

/** One shared question and its answer. */
export type QuestionDoc = readonly [question: string, answer: string];

export type SectionDoc = HeroImageSection | ValuePropsSection | QuestionsSection;
export type SectionType = SectionDoc['type'];

export interface PageDoc {
  /** Which page: "home" is the only one so far. */
  key: string;
  name: string;
  sections: SectionDoc[];
}

/** The section types the admin offers, in the order of its "Add a section" menu. */
export const SECTION_TYPES: readonly { type: SectionType; label: string; hint: string }[] = [
  { type: 'hero-image', label: 'Hero Image', hint: 'A big picture with a heading, a line of text and up to two buttons.' },
  { type: 'value-props', label: 'Value Props', hint: 'Short reasons to buy, as three columns on a computer and a stack on a phone.' },
  { type: 'questions', label: 'Questions', hint: 'The store’s questions and answers. Edit the questions themselves under Questions; every page shows the same list.' },
];

export const PAGE_KEYS = ['home'] as const;
export const MAX_SECTIONS = 12;
export const MAX_VALUE_PROPS = 6;
export const MAX_QUESTIONS = 20;
export const LIMITS = { heading: 80, text: 240, buttonLabel: 40, href: 300, alt: 125, propTitle: 40, propText: 140, question: 120, answer: 600 } as const;

const PHOTO_FILE = /^[\w][\w ./()-]*\.(?:jpe?g|png|webp|avif)$/i;
const SECTION_ID = /^[a-z0-9-]{1,40}$/;

/** True for a link the store may show: a site path or an https address. */
export function safeHref(href: string): boolean {
  if (href.startsWith('/')) return !href.startsWith('//') && !/[\s\\]/.test(href);
  try {
    return new URL(href).protocol === 'https:';
  } catch {
    return false;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function buttonFrom(v: unknown): ButtonDoc {
  const r = isRecord(v) ? v : {};
  return { label: str(r.label, LIMITS.buttonLabel), href: str(r.href, LIMITS.href) };
}

/** A fresh section id that isn't taken on the page. */
export function newSectionId(type: SectionType, taken: Iterable<string>): string {
  const used = new Set(taken);
  for (let n = 1; ; n++) if (!used.has(`${type}-${n}`)) return `${type}-${n}`;
}

/** A new section with starter words, so a fresh one already looks like something. */
export function newSection(type: SectionType, taken: Iterable<string>): SectionDoc {
  const id = newSectionId(type, taken);
  if (type === 'hero-image') {
    return {
      type,
      id,
      heading: 'Personalized Picture Frames',
      text: 'Add their names and your words, and see it before you buy.',
      image: { file: '', alt: '' },
      button: { label: 'Shop All Frames', href: '/collections/all' },
      secondary: { label: '', href: '' },
    };
  }
  if (type === 'questions') return { type, id, heading: 'Questions' };
  return {
    type,
    id,
    heading: '',
    items: [
      { icon: 'heart', title: 'Made for Them', text: 'Grandma, a godmother, a new baby and more.' },
      { icon: 'pen-line', title: 'Your Design', text: 'Make every detail yours, start to finish.' },
      { icon: 'gift', title: 'Ready to Give', text: 'Add a 4x6 photo. Free shipping in the US.' },
    ],
  };
}

/** A clean section from a request body, or null for an unknown type. Unknown fields are dropped. */
export function sectionFrom(raw: unknown): SectionDoc | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id, 40);
  if (raw.type === 'hero-image') {
    const img = isRecord(raw.image) ? raw.image : {};
    const image: HeroImageDoc = { file: str(img.file, 200), alt: str(img.alt, LIMITS.alt + 50) };
    return {
      type: 'hero-image',
      id,
      heading: str(raw.heading, LIMITS.heading + 50),
      text: str(raw.text, LIMITS.text + 50),
      image,
      button: buttonFrom(raw.button),
      secondary: buttonFrom(raw.secondary),
    };
  }
  if (raw.type === 'value-props') {
    const items = (Array.isArray(raw.items) ? raw.items : []).filter(isRecord).slice(0, MAX_VALUE_PROPS + 2).map((i) => ({
      icon: (VALUE_PROP_ICONS as readonly string[]).includes(String(i.icon)) ? (i.icon as ValuePropIcon) : 'heart',
      title: str(i.title, LIMITS.propTitle + 20),
      text: str(i.text, LIMITS.propText + 50),
    }));
    return { type: 'value-props', id, heading: str(raw.heading, LIMITS.heading + 50), items };
  }
  if (raw.type === 'questions') return { type: 'questions', id, heading: str(raw.heading, LIMITS.heading + 50) };
  return null;
}

/** A clean page from a request body. Sections of an unknown type are dropped. */
export function pageFrom(raw: unknown, before: PageDoc): PageDoc {
  const r = isRecord(raw) ? raw : {};
  const sections = (Array.isArray(r.sections) ? r.sections : [])
    .slice(0, MAX_SECTIONS + 4)
    .map(sectionFrom)
    .filter((s): s is SectionDoc => s !== null);
  return { key: before.key, name: before.name, sections };
}

function checkButton(where: string, b: ButtonDoc, required: boolean, errors: string[]) {
  if (!b.label && !b.href) {
    if (required) errors.push(`${where}: give the button a label and a link`);
    return;
  }
  if (!b.label) errors.push(`${where}: the button needs a label`);
  if (b.label.length > LIMITS.buttonLabel) errors.push(`${where}: the button label is ${b.label.length} characters; ${LIMITS.buttonLabel} at most`);
  if (!b.href) errors.push(`${where}: the button needs a link`);
  else if (!safeHref(b.href)) errors.push(`${where}: the link must start with "/" (a page on the store) or "https://"`);
}

const len = (where: string, what: string, v: string, max: number, errors: string[]) => {
  if (v.length > max) errors.push(`${where}: the ${what} is ${v.length} characters; ${max} at most`);
};

/** Problems with one section. `photos`, when known, is every file under src/assets/media/. */
export function checkSection(s: SectionDoc, n: number, photos?: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  const label = SECTION_TYPES.find((t) => t.type === s.type)?.label ?? s.type;
  const where = `Section ${n} (${label})`;
  if (!SECTION_ID.test(s.id)) errors.push(`${where}: bad section id "${s.id}"`);
  if (s.type === 'hero-image') {
    if (!s.heading) errors.push(`${where}: give it a heading`);
    len(where, 'heading', s.heading, LIMITS.heading, errors);
    len(where, 'text', s.text, LIMITS.text, errors);
    if (s.image.file) {
      if (!PHOTO_FILE.test(s.image.file) || s.image.file.includes('..')) errors.push(`${where}: "${s.image.file}" isn't a photo file name`);
      else if (photos && !photos.has(s.image.file)) errors.push(`${where}: there's no photo "${s.image.file}"`);
      if (!s.image.alt) errors.push(`${where}: describe the photo for people who can't see it`);
    }
    len(where, 'photo description', s.image.alt, LIMITS.alt, errors);
    checkButton(where, s.button, true, errors);
    checkButton(`${where}, second button`, s.secondary, false, errors);
  } else if (s.type === 'questions') {
    len(where, 'heading', s.heading, LIMITS.heading, errors);
  } else {
    if (!s.items.length) errors.push(`${where}: add at least one value prop`);
    if (s.items.length > MAX_VALUE_PROPS) errors.push(`${where}: ${MAX_VALUE_PROPS} value props at most`);
    len(where, 'heading', s.heading, LIMITS.heading, errors);
    s.items.forEach((i, k) => {
      if (!i.title) errors.push(`${where}, value prop ${k + 1}: give it a title`);
      len(`${where}, value prop ${k + 1}`, 'title', i.title, LIMITS.propTitle, errors);
      len(`${where}, value prop ${k + 1}`, 'text', i.text, LIMITS.propText, errors);
    });
  }
  return errors;
}

/** Problems with a page, worded for Asli. */
export function checkPage(p: PageDoc, photos?: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  if (p.sections.length > MAX_SECTIONS) errors.push(`${p.name}: ${MAX_SECTIONS} sections at most`);
  const ids = new Set<string>();
  p.sections.forEach((s, i) => {
    if (ids.has(s.id)) errors.push(`${p.name}: two sections share the id "${s.id}"`);
    ids.add(s.id);
    errors.push(...checkSection(s, i + 1, photos).map((e) => `${p.name}, ${e.charAt(0).toLowerCase()}${e.slice(1)}`));
  });
  // The homepage's one h1 comes from its first hero.
  if (p.key === 'home' && !p.sections.some((s) => s.type === 'hero-image')) errors.push(`${p.name}: keep a Hero Image; its heading is the page's main heading`);
  return errors;
}

/** A clean questions list from a request body. Rows that aren't a pair are dropped. */
export function questionsFrom(raw: unknown): QuestionDoc[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((q): q is unknown[] => Array.isArray(q))
    .slice(0, MAX_QUESTIONS + 4)
    .map((q) => [str(q[0], LIMITS.question + 50), str(q[1], LIMITS.answer + 100)] as const);
}

/** Problems with the shared questions, worded for Asli. */
export function checkQuestions(qs: readonly QuestionDoc[]): string[] {
  const errors: string[] = [];
  if (!qs.length) errors.push('Questions: keep at least one question');
  if (qs.length > MAX_QUESTIONS) errors.push(`Questions: ${MAX_QUESTIONS} at most`);
  const seen = new Set<string>();
  qs.forEach(([q, a], i) => {
    const where = `Question ${i + 1}`;
    if (!q) errors.push(`${where}: write the question`);
    if (!a) errors.push(`${where}: write the answer`);
    len(where, 'question', q, LIMITS.question, errors);
    len(where, 'answer', a, LIMITS.answer, errors);
    if (q && seen.has(q.toLowerCase())) errors.push(`${where}: the same question is in the list twice`);
    seen.add(q.toLowerCase());
  });
  return errors;
}

/** The shared questions the site is built from right now (pages.json). */
export function liveQuestions(): QuestionDoc[] {
  return structuredClone(pagesJson.questions as unknown as QuestionDoc[]);
}

/** The pages the site is built from right now (pages.json). */
export function livePages(): PageDoc[] {
  return structuredClone(pagesJson.pages as unknown as PageDoc[]);
}

export function livePage(key: string): PageDoc {
  const p = livePages().find((x) => x.key === key);
  if (!p) throw new Error(`pages.json: no page "${key}"`);
  return p;
}

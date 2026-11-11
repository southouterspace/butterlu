// A customer's design: the FrameSpec the site's customizer builds, checked the
// same way everywhere it travels (browser, checkout Worker, Stripe, print PDF).
// No photo travels with it: the frame ships empty and the buyer adds their own.
import {
  BACKGROUNDS,
  BACKGROUND_SCALE,
  type BackgroundFit,
  FONT_IDS,
  type FrameSpec,
  type HexColor,
  ROTATIONS,
  type Rotation,
  SHAPE_IDS,
  SHAPES,
  SIDES,
  type ShapeId,
  type Side,
  type SideText,
  backgroundById,
  backgroundSlack,
} from './index';

/** Longest line the customizer accepts. Fitting shrinks long lines; this stops absurd ones. */
export const MAX_SIDE_CHARS = 60;

/** Text colours the customizer offers. Any #rrggbb is valid on the order itself. */
export const TEXT_COLORS: readonly { name: string; hex: HexColor }[] = [
  { name: 'Charcoal', hex: '#2b333f' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Navy', hex: '#1f2f4d' },
  { name: 'Maroon', hex: '#6b1f2e' },
  { name: 'Sage', hex: '#55684d' },
  { name: 'Rose', hex: '#b5596a' },
];

export type DesignResult = { ok: true; spec: FrameSpec } | { ok: false; errors: string[] };

const HEX = /^#[0-9a-fA-F]{6}$/;
// Control characters and the Unicode line/paragraph separators never print well.
const UNPRINTABLE = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function parseSide(side: Side, raw: unknown, errors: string[]): SideText | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    errors.push(`${side}: expected an object with text and fontId`);
    return undefined;
  }
  const text = typeof raw.text === 'string' ? raw.text.replace(/\s+/g, ' ').trim() : undefined;
  if (text === undefined) {
    errors.push(`${side}: text must be a string`);
    return undefined;
  }
  if (text === '') return undefined;
  if (text.length > MAX_SIDE_CHARS) errors.push(`${side}: at most ${MAX_SIDE_CHARS} characters`);
  if (UNPRINTABLE.test(text)) errors.push(`${side}: contains characters that cannot print`);
  if (typeof raw.fontId !== 'string' || !FONT_IDS.includes(raw.fontId)) errors.push(`${side}: unknown font ${JSON.stringify(raw.fontId)}`);
  if (raw.rotation !== undefined && !ROTATIONS.includes(raw.rotation as Rotation)) errors.push(`${side}: rotation must be one of ${ROTATIONS.join(', ')}`);
  if (raw.color !== undefined && (typeof raw.color !== 'string' || !HEX.test(raw.color))) errors.push(`${side}: color must look like #2b333f`);
  const out: SideText = { text, fontId: raw.fontId as string };
  if (raw.rotation !== undefined) out.rotation = raw.rotation as Rotation;
  if (raw.color !== undefined) out.color = (raw.color as string).toLowerCase() as HexColor;
  return out;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * A background fit, rounded to hundredths so identical choices merge in the cart.
 * Returns undefined for the default (scale 1, centred), which a spec leaves off.
 * An axis the zoom leaves no room on is centred, since it can't change the print.
 */
export function parseFit(raw: unknown, shape: ShapeId | undefined, errors: string[] = []): BackgroundFit | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    errors.push('backgroundFit: expected an object with scale, x and y');
    return undefined;
  }
  const num = (k: 'scale' | 'x' | 'y', lo: number, hi: number, fallback: number) => {
    const v = raw[k] ?? fallback;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < lo - 1e-9 || v > hi + 1e-9) {
      errors.push(`backgroundFit: ${k} must be a number from ${lo} to ${hi}`);
      return fallback;
    }
    return round2(v);
  };
  const scale = num('scale', BACKGROUND_SCALE.min, BACKGROUND_SCALE.max, 1);
  let x = num('x', -1, 1, 0);
  let y = num('y', -1, 1, 0);
  if (shape) {
    const slack = backgroundSlack(shape, scale);
    if (slack.x < 1e-6) x = 0;
    if (slack.y < 1e-6) y = 0;
  }
  if (scale === 1 && x === 0 && y === 0) return undefined;
  return { scale, x: x || 0, y: y || 0 };
}

/**
 * Checks a design from an untrusted source and returns it normalised: whitespace
 * collapsed, empty sides dropped, colours lower-cased. At least one side must
 * carry text, the same rule the print renderer applies.
 */
export function parseDesign(input: unknown): DesignResult {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['design must be an object'] };
  const { shape, backgroundId, sides } = input;
  const shapeOk = typeof shape === 'string' && SHAPE_IDS.includes(shape as ShapeId);
  if (!shapeOk) errors.push(`unknown shape ${JSON.stringify(shape)}`);
  const fit = parseFit(input.backgroundFit, shapeOk ? (shape as ShapeId) : undefined, errors);
  if (typeof backgroundId !== 'string' || !backgroundById(backgroundId)) errors.push(`unknown background ${JSON.stringify(backgroundId)}`);
  const clean: FrameSpec['sides'] = {};
  if (!isRecord(sides)) {
    errors.push('sides must be an object');
  } else {
    for (const key of Object.keys(sides)) if (!SIDES.includes(key as Side)) errors.push(`unknown side ${JSON.stringify(key)}`);
    for (const side of SIDES) {
      const parsed = parseSide(side, sides[side], errors);
      if (parsed) clean[side] = parsed;
    }
    if (errors.length === 0 && Object.keys(clean).length === 0) errors.push('give text for at least one side');
  }
  if (errors.length > 0) return { ok: false, errors };
  const spec: FrameSpec = { shape: shape as ShapeId, backgroundId: backgroundId as FrameSpec['backgroundId'], sides: clean };
  if (fit) spec.backgroundFit = fit;
  return { ok: true, spec };
}

/** One stable string per design, so the cart can merge identical lines. */
export function designKey(spec: FrameSpec): string {
  const f = spec.backgroundFit;
  return JSON.stringify([spec.shape, spec.backgroundId, ...SIDES.map((s) => spec.sides[s] ?? null), f ? [f.scale, f.x, f.y] : null]);
}

// Stripe metadata holds at most 50 keys of 500 characters. A design is at most
// seven keys of well under 500, so it rides on the line item's product with no
// database row in between.
const META_PREFIX = 'frame_';

export function designToMetadata(spec: FrameSpec): Record<string, string> {
  const meta: Record<string, string> = { [`${META_PREFIX}shape`]: spec.shape, [`${META_PREFIX}background`]: spec.backgroundId };
  for (const side of SIDES) {
    const st = spec.sides[side];
    if (st) meta[`${META_PREFIX}${side}`] = JSON.stringify(st);
  }
  if (spec.backgroundFit) meta[`${META_PREFIX}fit`] = JSON.stringify(spec.backgroundFit);
  return meta;
}

export function designFromMetadata(meta: Record<string, string | undefined>): DesignResult {
  const sides: Record<string, unknown> = {};
  for (const side of SIDES) {
    const raw = meta[`${META_PREFIX}${side}`];
    if (raw === undefined) continue;
    try {
      sides[side] = JSON.parse(raw);
    } catch {
      return { ok: false, errors: [`${side}: metadata is not JSON`] };
    }
  }
  let backgroundFit: unknown;
  const fitRaw = meta[`${META_PREFIX}fit`];
  if (fitRaw !== undefined) {
    try {
      backgroundFit = JSON.parse(fitRaw);
    } catch {
      return { ok: false, errors: ['fit: metadata is not JSON'] };
    }
  }
  return parseDesign({ shape: meta[`${META_PREFIX}shape`], backgroundId: meta[`${META_PREFIX}background`], sides, backgroundFit });
}

const SIDE_LABEL: Record<Side, string> = { top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left' };

/** Plain-language summary for the cart, Stripe's line description and order emails. */
export function describeDesign(spec: FrameSpec): string {
  const shape = spec.shape === 'scalloped' ? 'Scalloped' : 'Rounded';
  const background = backgroundById(spec.backgroundId)?.name ?? spec.backgroundId;
  const words = SIDES.flatMap((s) => (spec.sides[s] ? [`${SIDE_LABEL[s]}: "${spec.sides[s]!.text}"`] : []));
  const fit = spec.backgroundFit ? describeFit(spec.backgroundFit) : null;
  return [`${shape} frame`, fit ? `${background} (${fit})` : background, ...words].join(' · ');
}

/** "zoomed to 150%, toward the top left", or "centered" for the default. */
export function describeFit(fit: BackgroundFit): string {
  const toward = (v: number, lo: string, hi: string) => (Math.abs(v) < 0.005 ? '' : v < 0 ? lo : hi);
  const where = [toward(fit.y, 'top', 'bottom'), toward(fit.x, 'left', 'right')].filter(Boolean).join(' ');
  const parts = [fit.scale !== 1 ? `zoomed to ${Math.round(fit.scale * 100)}%` : '', where ? `toward the ${where}` : ''].filter(Boolean);
  return parts.length ? parts.join(', ') : 'centered';
}

export { BACKGROUNDS, SHAPES, SIDES, SIDE_LABEL };

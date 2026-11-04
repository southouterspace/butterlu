// A customer's design: the FrameSpec the site's customizer builds, checked the
// same way everywhere it travels (browser, checkout Worker, Stripe, frame MCP).
// No photo travels with it: the frame ships empty and the buyer adds their own.
import {
  BACKGROUNDS,
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

/**
 * Checks a design from an untrusted source and returns it normalised: whitespace
 * collapsed, empty sides dropped, colours lower-cased. At least one side must
 * carry text, the same rule render_frame applies.
 */
export function parseDesign(input: unknown): DesignResult {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['design must be an object'] };
  const { shape, backgroundId, sides } = input;
  if (typeof shape !== 'string' || !SHAPE_IDS.includes(shape as ShapeId)) errors.push(`unknown shape ${JSON.stringify(shape)}`);
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
  return { ok: true, spec: { shape: shape as ShapeId, backgroundId: backgroundId as FrameSpec['backgroundId'], sides: clean } };
}

/** One stable string per design, so the cart can merge identical lines. */
export function designKey(spec: FrameSpec): string {
  return JSON.stringify([spec.shape, spec.backgroundId, ...SIDES.map((s) => spec.sides[s] ?? null)]);
}

// Stripe metadata holds at most 50 keys of 500 characters. A design is at most
// six keys of well under 500, so it rides on the line item's product with no
// database row in between.
const META_PREFIX = 'frame_';

export function designToMetadata(spec: FrameSpec): Record<string, string> {
  const meta: Record<string, string> = { [`${META_PREFIX}shape`]: spec.shape, [`${META_PREFIX}background`]: spec.backgroundId };
  for (const side of SIDES) {
    const st = spec.sides[side];
    if (st) meta[`${META_PREFIX}${side}`] = JSON.stringify(st);
  }
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
  return parseDesign({ shape: meta[`${META_PREFIX}shape`], backgroundId: meta[`${META_PREFIX}background`], sides });
}

const SIDE_LABEL: Record<Side, string> = { top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left' };

/** Plain-language summary for the cart, Stripe's line description and order emails. */
export function describeDesign(spec: FrameSpec): string {
  const shape = spec.shape === 'scalloped' ? 'Scalloped' : 'Rounded';
  const background = backgroundById(spec.backgroundId)?.name ?? spec.backgroundId;
  const words = SIDES.flatMap((s) => (spec.sides[s] ? [`${SIDE_LABEL[s]}: "${spec.sides[s]!.text}"`] : []));
  return [`${shape} frame`, background, ...words].join(' · ');
}

export { BACKGROUNDS, SHAPES, SIDES, SIDE_LABEL };

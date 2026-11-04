import { BACKGROUNDS } from './backgrounds.generated';
import { SHAPE_GEOMETRY } from './shapes.generated';
import fonts from './fonts.json';

export { BACKGROUNDS };

export interface Font {
  id: string;
  name: string;
  style: string;
  weight: number;
  /** Package path of the font file, resolved by the scripts that copy it. */
  source: string;
  licence: string;
  /** True until Asli's real font list replaces the stand-ins. */
  placeholder: boolean;
}

/** The fonts a frame can print in. The site's customizer and the frame MCP both read this list. */
export const FONTS: readonly Font[] = fonts;
export const FONT_IDS: readonly string[] = FONTS.map((f) => f.id);

export type ShapeId = keyof typeof SHAPE_GEOMETRY;
export type BackgroundId = (typeof BACKGROUNDS)[number]['id'];
export type Side = 'top' | 'right' | 'bottom' | 'left';
/** Degrees counterclockwise as seen on the printed frame. 90 reads bottom to top. */
export type Rotation = 0 | 90 | -90 | 180;
export type HexColor = `#${string}`;

export interface SideText {
  text: string;
  fontId: string;
  rotation?: Rotation;
  color?: HexColor;
  maxPt?: number;
}

export interface FrameSpec {
  shape: ShapeId;
  backgroundId: BackgroundId;
  sides: Partial<Record<Side, SideText>>;
}

/** Frame-local inches, origin at the frame's top-left, y down. */
export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Shape {
  widthIn: number;
  heightIn: number;
  borderIn: number;
  /** Closest text may come to the cut edge. */
  outerInsetIn: number;
  /** SVG path data in frame-local inches. */
  outline: string;
  opening: string;
}

export const SHAPES: Record<ShapeId, Shape> = SHAPE_GEOMETRY;
export const SHAPE_IDS = Object.keys(SHAPES) as ShapeId[];
export const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left'];
export const ROTATIONS: readonly Rotation[] = [0, 90, -90, 180];

/** Closest text may come to the photo opening. */
export const INNER_INSET_IN = 0.125;
/** Top and bottom zones stop this far short of the outer inset at each end, clear of the corners. */
export const CORNER_INSET_IN = 0.25;
export const DEFAULT_MAX_PT = 48;
export const DEFAULT_MIN_PT = 14;
export const PT_PER_IN = 72;

interface SideRule {
  defaultRotation: Rotation;
  zone(shape: Shape): Zone;
}

const depth = (s: Shape) => s.borderIn - s.outerInsetIn - INNER_INSET_IN;
const horizontal = (s: Shape, y: number): Zone => {
  const x = s.outerInsetIn + CORNER_INSET_IN;
  return { x, y, w: s.widthIn - 2 * x, h: depth(s) };
};
const vertical = (s: Shape, x: number): Zone => {
  const y = s.borderIn - INNER_INSET_IN;
  return { x, y, w: depth(s), h: s.heightIn - 2 * y };
};

// Top and bottom own the corners; left and right span only the opening's height.
const SIDE_RULES: Record<Side, SideRule> = {
  top: { defaultRotation: 0, zone: (s) => horizontal(s, s.outerInsetIn) },
  bottom: { defaultRotation: 0, zone: (s) => horizontal(s, s.heightIn - s.borderIn + INNER_INSET_IN) },
  left: { defaultRotation: 90, zone: (s) => vertical(s, s.outerInsetIn) },
  right: { defaultRotation: -90, zone: (s) => vertical(s, s.widthIn - s.borderIn + INNER_INSET_IN) },
};

export function safeZone(shape: ShapeId, side: Side): Zone {
  return SIDE_RULES[side].zone(SHAPES[shape]);
}

export function defaultRotation(side: Side): Rotation {
  return SIDE_RULES[side].defaultRotation;
}

export function backgroundById(id: string) {
  return BACKGROUNDS.find((b) => b.id === id);
}

/** Ink bounds of a run at 1 unit font size, baseline at y = 0, y up (font convention). */
export interface InkBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
export type MeasureInk = (text: string) => InkBox;

export type FitWarning = { code: 'below-min-size'; sizePt: number; minPt: number; message: string };

export interface Fit {
  sizePt: number;
  /** Baseline start of the run, frame-local inches, to draw at `rotation`. */
  origin: Point;
  rotation: Rotation;
  warnings: FitWarning[];
}

/**
 * Largest size up to maxPt whose ink fits the zone, positioned so the ink's
 * centre sits on the zone's centre. Uses ink bounds, not line metrics, so a
 * script font's swashes neither overflow nor leave the run visibly off-centre.
 */
export function fitText(
  measure: MeasureInk,
  text: string,
  zone: Zone,
  rotation: Rotation,
  { maxPt = DEFAULT_MAX_PT, minPt = DEFAULT_MIN_PT }: { maxPt?: number; minPt?: number } = {},
): Fit {
  const ink = measure(text);
  const inkW = ink.maxX - ink.minX;
  const inkH = ink.maxY - ink.minY;
  const sideways = rotation === 90 || rotation === -90;
  const alongPt = (sideways ? zone.h : zone.w) * PT_PER_IN;
  const acrossPt = (sideways ? zone.w : zone.h) * PT_PER_IN;
  const sizePt = Math.min(maxPt, alongPt / inkW, acrossPt / inkH);

  const cx = ((ink.minX + ink.maxX) / 2) * sizePt;
  const cy = ((ink.minY + ink.maxY) / 2) * sizePt;
  const r = (rotation * Math.PI) / 180;
  const centre = { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 };
  const origin = {
    x: centre.x - (cx * Math.cos(r) - cy * Math.sin(r)) / PT_PER_IN,
    y: centre.y + (cx * Math.sin(r) + cy * Math.cos(r)) / PT_PER_IN,
  };

  const warnings: FitWarning[] =
    sizePt < minPt
      ? [
          {
            code: 'below-min-size',
            sizePt,
            minPt,
            message: `"${text}" only fits at ${sizePt.toFixed(1)}pt, below the ${minPt}pt legibility minimum. Shorten it or use a narrower font.`,
          },
        ]
      : [];
  return { sizePt, origin, rotation, warnings };
}

export interface Placement extends Fit {
  side: Side;
  text: string;
  fontId: string;
  color: HexColor;
  zone: Zone;
}

/** Fits every side that has text. `measureFor` returns the ink measure for a font id. */
export function layoutFrame(spec: FrameSpec, measureFor: (fontId: string) => MeasureInk): Placement[] {
  const background = backgroundById(spec.backgroundId);
  if (!background) throw new Error(`unknown background ${spec.backgroundId}`);
  return SIDES.flatMap((side) => {
    const st = spec.sides[side];
    if (!st || st.text.trim() === '') return [];
    const zone = safeZone(spec.shape, side);
    const fit = fitText(measureFor(st.fontId), st.text, zone, st.rotation ?? defaultRotation(side), { maxPt: st.maxPt });
    return [{ side, text: st.text, fontId: st.fontId, color: st.color ?? background.defaultTextColor, zone, ...fit }];
  });
}

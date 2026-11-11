import fontkit from '@pdf-lib/fontkit';
import {
  type PDFFont,
  PDFDocument,
  concatTransformationMatrix,
  degrees,
  popGraphicsState,
  pushGraphicsState,
  rgb,
} from 'pdf-lib';
import {
  DEFAULT_BLEED_IN,
  type FrameSpec,
  type HexColor,
  type InkBox,
  type MeasureInk,
  type Placement,
  type Zone,
  PT_PER_IN,
  SHAPES,
  SIDES,
  backgroundRect,
  layoutFrame,
  safeZone,
} from './index';

export type Variant = 'print' | 'proof';

export interface RenderAssets {
  /** JPEG bytes of the background image. */
  background: Uint8Array;
  /** Font file bytes (TTF, OTF or WOFF) by font id, for every font the spec uses. */
  fonts: Record<string, Uint8Array>;
}

export interface RenderOptions {
  variant: Variant;
  bleedIn?: number;
}

export interface Rendered {
  bytes: Uint8Array;
  placements: Placement[];
  pageSizeIn: { w: number; h: number };
}

export { DEFAULT_BLEED_IN };

/**
 * Ink measure from a font file, using the same fontkit build pdf-lib embeds with.
 * pdf-lib places glyphs at their plain advance widths and drops GPOS kerning, so
 * the run's own bbox (which is kerned) would be narrower than what gets drawn.
 */
export function inkMeasure(fontBytes: Uint8Array): MeasureInk {
  const font = fontkit.create(fontBytes);
  const upm = font.unitsPerEm;
  return (text) => {
    let pen = 0;
    const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const glyph of font.layout(text).glyphs) {
      const b = glyph.bbox;
      if (b.maxX > b.minX) {
        box.minX = Math.min(box.minX, pen + b.minX);
        box.maxX = Math.max(box.maxX, pen + b.maxX);
        box.minY = Math.min(box.minY, b.minY);
        box.maxY = Math.max(box.maxY, b.maxY);
      }
      pen += glyph.advanceWidth;
    }
    if (box.maxX < box.minX) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    return { minX: box.minX / upm, minY: box.minY / upm, maxX: box.maxX / upm, maxY: box.maxY / upm } satisfies InkBox;
  };
}

/**
 * Text as SVG path data, from the same font file and glyph advances the print file
 * uses (pdf-lib draws with plain advance widths, no kerning). For rasterising a
 * frame without a browser (product images at build time). The path starts at
 * (0, 0) on the baseline, in units of `size` (y down, as in SVG).
 */
export function textOutline(fontBytes: Uint8Array): (text: string, size: number) => string {
  const font = fontkit.create(fontBytes);
  const upm = font.unitsPerEm;
  return (text, size) => {
    const s = size / upm;
    let pen = 0;
    const parts: string[] = [];
    for (const glyph of font.layout(text).glyphs) {
      const ox = pen * s;
      // fontkit's Path keeps its drawing commands at runtime; the typings omit them.
      const { commands } = glyph.path as unknown as { commands: { command: string; args: number[] }[] };
      const d = commands
        .map(({ command, args }) => {
          const pts = args.map((v, k) => (k % 2 === 0 ? ox + v * s : -v * s).toFixed(4));
          const c = { moveTo: 'M', lineTo: 'L', quadraticCurveTo: 'Q', bezierCurveTo: 'C', closePath: 'Z' }[command];
          return c ? c + pts.join(' ') : '';
        })
        .join('');
      if (d) parts.push(d);
      pen += glyph.advanceWidth;
    }
    return parts.join('');
  };
}

const toRgb = (hex: HexColor) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/**
 * backgroundRect covers DEFAULT_BLEED_IN. A render asked for a wider bleed grows
 * the image about the frame's centre just enough to cover it, so no edge prints
 * blank. At the default bleed this returns the rectangle unchanged.
 */
function coverBleed(r: Zone, shape: { widthIn: number; heightIn: number }, bleedIn: number): Zone {
  const cx = shape.widthIn / 2;
  const cy = shape.heightIn / 2;
  const f = Math.max(
    1,
    (cx + bleedIn) / (cx - r.x),
    (cx + bleedIn) / (r.x + r.w - cx),
    (cy + bleedIn) / (cy - r.y),
    (cy + bleedIn) / (r.y + r.h - cy),
  );
  if (f === 1) return r;
  return { x: cx - (cx - r.x) * f, y: cy - (cy - r.y) * f, w: r.w * f, h: r.h * f };
}

/**
 * The print variant is mirrored for sublimation transfer and carries no guides.
 * The proof is unmirrored, with the cut line, a masked opening and the safe zones.
 */
export async function renderPdf(spec: FrameSpec, assets: RenderAssets, { variant, bleedIn = DEFAULT_BLEED_IN }: RenderOptions): Promise<Rendered> {
  const shape = SHAPES[spec.shape];
  const measures = new Map<string, MeasureInk>();
  const measureFor = (fontId: string) => {
    let m = measures.get(fontId);
    if (!m) {
      const bytes = assets.fonts[fontId];
      if (!bytes) throw new Error(`no font bytes supplied for ${fontId}`);
      m = inkMeasure(bytes);
      measures.set(fontId, m);
    }
    return m;
  };
  const placements = layoutFrame(spec, measureFor);

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const pageSizeIn = { w: shape.widthIn + 2 * bleedIn, h: shape.heightIn + 2 * bleedIn };
  const pw = pageSizeIn.w * PT_PER_IN;
  const ph = pageSizeIn.h * PT_PER_IN;
  const page = doc.addPage([pw, ph]);
  const toPage = (xIn: number, yIn: number) => ({ x: (xIn + bleedIn) * PT_PER_IN, y: ph - (yIn + bleedIn) * PT_PER_IN });

  if (variant === 'print') page.pushOperators(pushGraphicsState(), concatTransformationMatrix(-1, 0, 0, 1, pw, 0));

  // The same rectangle the site's preview draws, so the customer's zoom and
  // position print as they saw them. It covers the frame plus DEFAULT_BLEED_IN.
  const img = await doc.embedJpg(assets.background);
  const bg = coverBleed(backgroundRect(spec.shape, spec.backgroundFit, { w: img.width, h: img.height }), shape, bleedIn);
  page.drawImage(img, { ...toPage(bg.x, bg.y + bg.h), width: bg.w * PT_PER_IN, height: bg.h * PT_PER_IN });

  if (variant === 'proof') {
    const o = toPage(0, 0);
    const guide = { x: o.x, y: o.y, scale: PT_PER_IN, borderColor: rgb(0.85, 0.1, 0.1), borderWidth: 0.75 / PT_PER_IN };
    page.drawSvgPath(shape.outline, guide);
    page.drawSvgPath(shape.opening, { ...guide, color: rgb(1, 1, 1), opacity: 0.85 });
    for (const side of SIDES) {
      const z = safeZone(spec.shape, side);
      const bottomLeft = toPage(z.x, z.y + z.h);
      page.drawRectangle({
        ...bottomLeft,
        width: z.w * PT_PER_IN,
        height: z.h * PT_PER_IN,
        borderColor: rgb(0, 0.6, 1),
        borderWidth: 0.5,
        borderDashArray: [3, 2],
      });
    }
  }

  const embedded = new Map<string, PDFFont>();
  for (const p of placements) {
    let font = embedded.get(p.fontId);
    if (!font) {
      font = await doc.embedFont(assets.fonts[p.fontId]!, { subset: true });
      embedded.set(p.fontId, font);
    }
    page.drawText(p.text, {
      ...toPage(p.origin.x, p.origin.y),
      size: p.sizePt,
      font,
      rotate: degrees(p.rotation),
      color: toRgb(p.color),
    });
  }

  if (variant === 'print') page.pushOperators(popGraphicsState());
  return { bytes: await doc.save(), placements, pageSizeIn };
}

// Ink bounds from the browser's own text engine, in the units fitText expects
// (1 unit font size, y up). The print renderer measures the same font files
// with fontkit; the two agree to within a few percent, and both fit to the
// same safe zones.
import { FONTS, type FrameSpec, type MeasureInk, type Placement, layoutFrame } from '@butterlu/frame';
import { fontCss } from '../lib/frame-svg';

const SIZE = 200;
const cache = new Map<string, MeasureInk>();
let ctx: CanvasRenderingContext2D | null = null;

function measureFor(fontId: string): MeasureInk {
  let m = cache.get(fontId);
  if (m) return m;
  ctx ??= document.createElement('canvas').getContext('2d');
  const { family, weight } = fontCss(fontId);
  const font = `${weight} ${SIZE}px ${family}`;
  m = (text) => {
    if (!ctx) return { minX: 0, minY: 0, maxX: text.length * 0.5, maxY: 0.7 };
    ctx.font = font;
    const t = ctx.measureText(text);
    return {
      minX: -t.actualBoundingBoxLeft / SIZE,
      maxX: t.actualBoundingBoxRight / SIZE,
      minY: -t.actualBoundingBoxDescent / SIZE,
      maxY: t.actualBoundingBoxAscent / SIZE,
    };
  };
  cache.set(fontId, m);
  return m;
}

/** Resolves once every frame font has loaded, so the first measurement is the real one. */
export async function fontsReady(): Promise<void> {
  await Promise.all(
    FONTS.map((f) => {
      const { family, weight } = fontCss(f.id);
      return document.fonts.load(`${weight} 32px ${family}`).catch(() => []);
    }),
  );
}

export function placementsInBrowser(spec: FrameSpec): Placement[] {
  return layoutFrame(spec, measureFor);
}

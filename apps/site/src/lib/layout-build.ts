// Build-time text fitting with fontkit, the measure the print renderer uses, so
// a product card shows the preset exactly as it prints. Only Astro pages import
// this; it reads font files from node_modules and never reaches the browser.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { FONTS, type FrameSpec, type MeasureInk, type Placement, layoutFrame } from '@butterlu/frame';
import { inkMeasure } from '@butterlu/frame/pdf';

const require = createRequire(import.meta.url);
const measures = new Map<string, MeasureInk>();

function measureFor(fontId: string): MeasureInk {
  let m = measures.get(fontId);
  if (!m) {
    const font = FONTS.find((f) => f.id === fontId);
    if (!font) throw new Error(`unknown font ${fontId}`);
    m = inkMeasure(new Uint8Array(readFileSync(require.resolve(font.source))));
    measures.set(fontId, m);
  }
  return m;
}

export function placementsAtBuild(spec: FrameSpec): Placement[] {
  return layoutFrame(spec, measureFor);
}

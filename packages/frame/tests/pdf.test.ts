import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { type FrameSpec, SHAPES, type ShapeId, type Side, type SideText, safeZone } from '../src/index';
import { inkMeasure, renderPdf, textOutline } from '../src/pdf';

const here = path.dirname(new URL(import.meta.url).pathname);
const fontFile = (pkg: string, file: string) => new Uint8Array(fs.readFileSync(Bun.resolveSync(`@fontsource/${pkg}/files/${file}`, here)));
const fonts = {
  'great-vibes': fontFile('great-vibes', 'great-vibes-latin-400-normal.woff'),
  'playfair-display': fontFile('playfair-display', 'playfair-display-latin-700-normal.woff'),
};
const white = new Uint8Array(fs.readFileSync(path.join(here, 'fixtures/white.jpg')));
const BLEED = 0.125;
const DPI = 200;

/** Rasterizes page 1 and returns the bounding box of near-black pixels, in page inches from the top-left. Proof guides are coloured, so they are ignored. */
function inkBounds(pdf: Uint8Array) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-ink-'));
  fs.writeFileSync(path.join(dir, 'in.pdf'), pdf);
  execFileSync('pdftoppm', ['-r', String(DPI), '-singlefile', path.join(dir, 'in.pdf'), path.join(dir, 'out')]);
  const pgm = fs.readFileSync(path.join(dir, 'out.ppm'));
  fs.rmSync(dir, { recursive: true });
  const header = pgm.toString('latin1', 0, 64).match(/^P6\s+(\d+)\s+(\d+)\s+(\d+)\s/);
  if (!header) throw new Error('not a binary PPM');
  const [w, h] = [Number(header[1]), Number(header[2])];
  const pixels = pgm.subarray(header[0].length);
  let [minX, minY, maxX, maxY] = [w, h, -1, -1];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = 3 * (y * w + x);
      if (pixels[i]! < 100 && pixels[i + 1]! < 100 && pixels[i + 2]! < 100) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) throw new Error('no ink on the page');
  return { minX: minX / DPI, maxX: (maxX + 1) / DPI, minY: minY / DPI, maxY: (maxY + 1) / DPI, pageW: w / DPI };
}

const oneSide = (shape: ShapeId, side: Side, st: SideText): FrameSpec => ({
  shape,
  backgroundId: 'white-linen',
  sides: { [side]: { color: '#000000', ...st } },
});

describe('renderPdf', () => {
  const cases: [ShapeId, Side, SideText][] = [
    ['rounded-rectangle', 'top', { text: 'Aunt Sarah', fontId: 'great-vibes' }],
    ['rounded-rectangle', 'left', { text: 'EST. 2024', fontId: 'playfair-display' }],
    ['scalloped', 'right', { text: 'Love you to the moon & back', fontId: 'great-vibes' }],
    ['scalloped', 'bottom', { text: 'The best aunt in the whole wide world', fontId: 'playfair-display' }],
    ['scalloped', 'top', { text: 'Upside down', fontId: 'playfair-display', rotation: 180 }],
  ];

  for (const [shape, side, st] of cases) {
    test(`${shape} ${side}: the printed ink is centred on the safe zone and inside it`, async () => {
      const { bytes } = await renderPdf(oneSide(shape, side, st), { background: white, fonts }, { variant: 'print', bleedIn: BLEED });
      const ink = inkBounds(bytes);
      const zone = safeZone(shape, side);
      // The print is mirrored, so flip x back into frame coordinates.
      const inkCentreX = ink.pageW - (ink.minX + ink.maxX) / 2 - BLEED;
      const inkCentreY = (ink.minY + ink.maxY) / 2 - BLEED;
      const tolerance = 2 / DPI;
      expect(Math.abs(inkCentreX - (zone.x + zone.w / 2))).toBeLessThan(tolerance);
      expect(Math.abs(inkCentreY - (zone.y + zone.h / 2))).toBeLessThan(tolerance);
      expect(ink.pageW - ink.maxX - BLEED).toBeGreaterThan(zone.x - tolerance);
      expect(ink.pageW - ink.minX - BLEED).toBeLessThan(zone.x + zone.w + tolerance);
      expect(ink.minY - BLEED).toBeGreaterThan(zone.y - tolerance);
      expect(ink.maxY - BLEED).toBeLessThan(zone.y + zone.h + tolerance);
    });
  }

  test('the print variant is the proof mirrored left to right', async () => {
    const spec = oneSide('rounded-rectangle', 'left', { text: 'EST. 2024', fontId: 'playfair-display' });
    const render = async (variant: 'print' | 'proof') => inkBounds((await renderPdf(spec, { background: white, fonts }, { variant })).bytes);
    const [print, proof] = [await render('print'), await render('proof')];
    expect(proof.maxX).toBeLessThan(proof.pageW / 2);
    expect(print.minX).toBeGreaterThan(print.pageW / 2);
    expect(Math.abs(print.minX - (proof.pageW - proof.maxX))).toBeLessThan(2 / DPI);
    expect(Math.abs(print.minY - proof.minY)).toBeLessThan(2 / DPI);
  });

  test('the page is the frame plus bleed on every side', async () => {
    for (const shape of ['rounded-rectangle', 'scalloped'] as const) {
      for (const bleedIn of [0, 0.125, 0.25]) {
        const { bytes } = await renderPdf(oneSide(shape, 'top', { text: 'Hi', fontId: 'great-vibes' }), { background: white, fonts }, { variant: 'print', bleedIn });
        const page = (await PDFDocument.load(bytes)).getPage(0).getSize();
        expect(page.width / 72).toBeCloseTo(SHAPES[shape].widthIn + 2 * bleedIn, 6);
        expect(page.height / 72).toBeCloseTo(SHAPES[shape].heightIn + 2 * bleedIn, 6);
      }
    }
  });

  test('reports each side it placed with its fitted size and warnings', async () => {
    const { placements } = await renderPdf(
      {
        shape: 'scalloped',
        backgroundId: 'black',
        sides: {
          top: { text: 'Aunt Sarah', fontId: 'great-vibes' },
          bottom: { text: 'A very long dedication that cannot possibly fit on one side of this little frame, however hard it tries', fontId: 'playfair-display' },
        },
      },
      { background: white, fonts },
      { variant: 'proof' },
    );
    expect(placements.map((p) => p.side)).toEqual(['top', 'bottom']);
    expect(placements[0]!.color).toBe('#ffffff');
    expect(placements[0]!.warnings).toEqual([]);
    expect(placements[1]!.warnings[0]?.code).toBe('below-min-size');
  });
});

describe('textOutline', () => {
  test('draws text as path data whose extent matches the ink measure', () => {
    const size = 0.5;
    const d = textOutline(fonts['playfair-display'])('Nana', size);
    expect(d.startsWith('M')).toBe(true);
    const xs = [...d.matchAll(/[MLQC]([^MLQCZ]+)/g)].flatMap((m) => m[1]!.trim().split(/\s+/).filter((_, i) => i % 2 === 0).map(Number));
    const ink = inkMeasure(fonts['playfair-display'])('Nana');
    // Same font, same shaping: the outline's horizontal extent matches the ink box
    // (within 1%: a curve's control points can sit a hair outside its ink).
    const inkWidth = (ink.maxX - ink.minX) * size;
    const width = Math.max(...xs) - Math.min(...xs);
    expect(Math.abs(width - inkWidth) / inkWidth).toBeLessThan(0.01);
  });

  test('draws nothing for blank text', () => {
    expect(textOutline(fonts['great-vibes'])('   ', 1)).toBe('');
  });
});

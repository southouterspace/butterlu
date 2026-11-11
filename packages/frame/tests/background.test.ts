import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { BACKGROUND_SCALE, BACKGROUND_SHEET_IN, DEFAULT_BLEED_IN, SHAPES, SHAPE_IDS, backgroundRect, backgroundSlack } from '../src/index';

const here = path.dirname(new URL(import.meta.url).pathname);

describe('backgroundRect', () => {
  const fits = [-1, -0.4, 0, 0.7, 1].flatMap((x) => [-1, 0, 1].flatMap((y) => [1, 1.35, BACKGROUND_SCALE.max].map((scale) => ({ scale, x, y }))));

  for (const shape of SHAPE_IDS) {
    test(`${shape}: every fit in range covers the frame and its bleed`, () => {
      const s = SHAPES[shape];
      const b = DEFAULT_BLEED_IN;
      for (const fit of fits) {
        const r = backgroundRect(shape, fit);
        expect(r.x).toBeLessThanOrEqual(-b + 1e-9);
        expect(r.y).toBeLessThanOrEqual(-b + 1e-9);
        expect(r.x + r.w).toBeGreaterThanOrEqual(s.widthIn + b - 1e-9);
        expect(r.y + r.h).toBeGreaterThanOrEqual(s.heightIn + b - 1e-9);
        // The sheet keeps its aspect.
        expect(r.w / r.h).toBeCloseTo(BACKGROUND_SHEET_IN.w / BACKGROUND_SHEET_IN.h, 9);
      }
    });
  }

  test('scale 2 is twice the size of scale 1, and the default is centred', () => {
    const one = backgroundRect('scalloped');
    const two = backgroundRect('scalloped', { scale: 2, x: 0, y: 0 });
    expect(two.w).toBeCloseTo(2 * one.w, 9);
    const s = SHAPES.scalloped;
    for (const r of [one, two]) {
      expect(r.x + r.w / 2).toBeCloseTo(s.widthIn / 2, 9);
      expect(r.y + r.h / 2).toBeCloseTo(s.heightIn / 2, 9);
    }
  });

  test('x and y pick the edge that shows: -1 is left or top, 1 is right or bottom', () => {
    const b = DEFAULT_BLEED_IN;
    const s = SHAPES['rounded-rectangle'];
    const topLeft = backgroundRect('rounded-rectangle', { scale: 1.5, x: -1, y: -1 });
    expect(topLeft.x).toBeCloseTo(-b, 9);
    expect(topLeft.y).toBeCloseTo(-b, 9);
    const bottomRight = backgroundRect('rounded-rectangle', { scale: 1.5, x: 1, y: 1 });
    expect(bottomRight.x + bottomRight.w).toBeCloseTo(s.widthIn + b, 9);
    expect(bottomRight.y + bottomRight.h).toBeCloseTo(s.heightIn + b, 9);
  });

  test('out-of-range values are held to the range, never leaving the frame uncovered', () => {
    expect(backgroundRect('scalloped', { scale: 0.2, x: -9, y: 9 })).toEqual(backgroundRect('scalloped', { scale: 1, x: -1, y: 1 }));
    expect(backgroundRect('scalloped', { scale: 9, x: 0, y: 0 })).toEqual(backgroundRect('scalloped', { scale: BACKGROUND_SCALE.max, x: 0, y: 0 }));
  });

  test('at scale 1 the sheet fills the width exactly, so only up and down can move', () => {
    for (const shape of SHAPE_IDS) {
      const slack = backgroundSlack(shape, 1);
      expect(slack.x).toBeCloseTo(0, 9);
      expect(slack.y).toBeGreaterThan(1);
      expect(backgroundSlack(shape, 1.2).x).toBeGreaterThan(0.5);
    }
  });
});

/** Width and height from a baseline or progressive JPEG's SOF marker. */
function jpegSize(bytes: Buffer) {
  let i = 2;
  while (i < bytes.length) {
    const marker = bytes[i + 1]!;
    const len = bytes.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { w: bytes.readUInt16BE(i + 7), h: bytes.readUInt16BE(i + 5) };
    i += 2 + len;
  }
  throw new Error('no SOF marker');
}

test('every background file is an 8.5 × 11 sheet, the aspect the preview assumes', () => {
  const dir = path.join(here, '../../../assets/background-images');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg'));
  expect(files.length).toBeGreaterThan(0);
  for (const f of files) {
    const { w, h } = jpegSize(fs.readFileSync(path.join(dir, f)));
    expect(w / h).toBeCloseTo(BACKGROUND_SHEET_IN.w / BACKGROUND_SHEET_IN.h, 3);
  }
});

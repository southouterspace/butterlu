import { describe, expect, test } from 'bun:test';
import {
  CORNER_INSET_IN,
  DEFAULT_MIN_PT,
  INNER_INSET_IN,
  type MeasureInk,
  PT_PER_IN,
  SHAPES,
  SHAPE_IDS,
  SIDES,
  type Zone,
  fitText,
  safeZone,
} from '../src/index';

// A run whose ink is 0.5 em per character wide and 0.7 em tall, sitting on the baseline.
const fakeMeasure: MeasureInk = (text) => ({ minX: 0, minY: 0, maxX: 0.5 * text.length, maxY: 0.7 });

const overlaps = (a: Zone, b: Zone) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('safeZone', () => {
  for (const id of SHAPE_IDS) {
    const s = SHAPES[id];
    const zones = SIDES.map((side) => [side, safeZone(id, side)] as const);
    const opening: Zone = {
      x: s.borderIn - INNER_INSET_IN,
      y: s.borderIn - INNER_INSET_IN,
      w: s.widthIn - 2 * (s.borderIn - INNER_INSET_IN),
      h: s.heightIn - 2 * (s.borderIn - INNER_INSET_IN),
    };

    test(`${id}: zones do not overlap each other`, () => {
      for (const [i, [sa, a]] of zones.entries()) {
        for (const [sb, b] of zones.slice(i + 1)) expect(overlaps(a, b), `${sa} overlaps ${sb}`).toBe(false);
      }
    });

    test(`${id}: zones stay out of the opening and the outer inset`, () => {
      for (const [side, z] of zones) {
        expect(overlaps(z, opening), `${side} enters the opening`).toBe(false);
        expect(z.x).toBeGreaterThanOrEqual(s.outerInsetIn);
        expect(z.y).toBeGreaterThanOrEqual(s.outerInsetIn);
        expect(z.x + z.w).toBeLessThanOrEqual(s.widthIn - s.outerInsetIn + 1e-9);
        expect(z.y + z.h).toBeLessThanOrEqual(s.heightIn - s.outerInsetIn + 1e-9);
        expect(z.w).toBeGreaterThan(0);
        expect(z.h).toBeGreaterThan(0);
      }
    });

    test(`${id}: top and bottom keep clear of the corners`, () => {
      for (const side of ['top', 'bottom'] as const) {
        expect(safeZone(id, side).x).toBeCloseTo(s.outerInsetIn + CORNER_INSET_IN);
      }
    });
  }
});

describe('fitText', () => {
  const zone = safeZone('rounded-rectangle', 'bottom');

  test('long text shrinks to fit the zone and warns below the minimum size', () => {
    const text = 'x'.repeat(80);
    const fit = fitText(fakeMeasure, text, zone, 0, { maxPt: 48 });
    expect((fit.sizePt * 0.5 * text.length) / PT_PER_IN).toBeCloseTo(zone.w, 6);
    expect(fit.sizePt).toBeLessThan(DEFAULT_MIN_PT);
    expect(fit.warnings.map((w) => w.code)).toEqual(['below-min-size']);
  });

  test('text that fits at a legible size carries no warning', () => {
    expect(fitText(fakeMeasure, 'Aunt Sarah forever', zone, 0).warnings).toEqual([]);
  });

  test('short text stops at maxPt', () => {
    const fit = fitText(fakeMeasure, 'Hi', zone, 0, { maxPt: 20 });
    expect(fit.sizePt).toBe(20);
    expect(fit.warnings).toEqual([]);
  });

  test('a run rotated ±90 fits along the zone height, not its width', () => {
    const side = safeZone('rounded-rectangle', 'left');
    const text = 'x'.repeat(30);
    for (const rotation of [90, -90] as const) {
      const fit = fitText(fakeMeasure, text, side, rotation, { maxPt: 500 });
      const inkAlongIn = (fit.sizePt * 0.5 * text.length) / PT_PER_IN;
      const inkAcrossIn = (fit.sizePt * 0.7) / PT_PER_IN;
      expect(Math.min(Math.abs(inkAlongIn - side.h), Math.abs(inkAcrossIn - side.w))).toBeLessThan(1e-9);
      expect(inkAlongIn).toBeLessThanOrEqual(side.h + 1e-9);
      expect(inkAcrossIn).toBeLessThanOrEqual(side.w + 1e-9);
      expect(inkAlongIn).toBeGreaterThan(side.w);
    }
  });
});

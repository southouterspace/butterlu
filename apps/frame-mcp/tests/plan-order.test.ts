import { describe, expect, test } from 'bun:test';
import { BACKGROUNDS } from '@butterlu/frame';
import { ETSY_COLOR_CHART, planOrder } from '../src/plan-order';

describe('Etsy colour chart', () => {
  test('has 41 numbers in order, each matched id a real background', () => {
    expect(ETSY_COLOR_CHART.map((c) => c.number)).toEqual(Array.from({ length: 41 }, (_, i) => i + 1));
    const ids = new Set(BACKGROUNDS.map((b) => b.id));
    for (const c of ETSY_COLOR_CHART) {
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
      if (c.backgroundId) expect(ids.has(c.backgroundId as never)).toBe(true);
      expect(c.backgroundId === null).toBe(c.match === 'none');
    }
  });
});

describe('planOrder', () => {
  test('a matched chart number and two plain lines are ready to print', () => {
    const plan = planOrder('25', 'Happy Birthday Pop\nLove, Jo');
    expect(plan.background).toEqual({ kind: 'chart', number: 25, backgroundId: 'black', match: 'strong' });
    expect(plan.lines.map((l) => [l.side, l.text])).toEqual([
      ['top', 'Happy Birthday Pop'],
      ['bottom', 'Love, Jo'],
    ]);
    expect(plan.needsReview).toEqual([]);
    expect(plan.ready).toBe(true);
  });

  test('a chart number with no background file needs review', () => {
    const plan = planOrder('32', 'I love my uncle Dale\nLove, Sammy');
    expect(plan.background).toMatchObject({ kind: 'chart', number: 32, backgroundId: null });
    expect(plan.needsReview).toEqual(['Colour-chart #32 has no background file yet.']);
    expect(plan.ready).toBe(false);
  });

  test('a likely match needs review until confirmed', () => {
    expect(planOrder('41', 'The Smiths').needsReview.join(' ')).toContain('not confirmed');
  });

  test('"(color #N)" on a line becomes that swatch as the text colour', () => {
    const plan = planOrder('1', 'Nana and Me (color #25) along the top');
    const chart25 = ETSY_COLOR_CHART.find((c) => c.number === 25)!;
    expect(plan.lines).toEqual([{ side: 'top', text: 'Nana and Me', chartColor: 25, color: chart25.hex as `#${string}`, explicit: true }]);
    expect(plan.ready).toBe(true);
  });

  test('As Shown, an unknown colour, or an off-chart text colour need review', () => {
    expect(planOrder('As Shown', 'Jamie and Lou').needsReview).toEqual(['Background is "As Shown", which needs the listing\'s own design.']);
    expect(planOrder('Fuchsia', 'Hi').needsReview).toEqual(['Color "Fuchsia" is not a number on the colour chart.']);
    expect(planOrder('99', 'Hi').background).toEqual({ kind: 'unknown', value: '99' });
    expect(planOrder('1', 'Hi (color #77)').needsReview).toEqual(['Text colour #77 for the top side is not on the colour chart.']);
  });
});

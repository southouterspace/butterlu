import { describe, expect, test } from 'bun:test';
import { parsePersonalization } from '../src/personalization';

// Shapes copied from real packing slips; names are invented.
describe('parsePersonalization', () => {
  test('two unplaced lines go top then bottom and need no review', () => {
    const r = parsePersonalization('I love my uncle Dale\nLove, Sammy');
    expect(r.lines).toEqual([
      { side: 'top', text: 'I love my uncle Dale', chartColor: undefined, explicit: false },
      { side: 'bottom', text: 'Love, Sammy', chartColor: undefined, explicit: false },
    ]);
    expect(r.needsReview).toEqual([]);
    expect(r.orientation).toBeUndefined();
  });

  test('blank lines between lines are ignored', () => {
    const r = parsePersonalization('Jamie and Lou\n\n  October 3, 2026  \n');
    expect(r.lines.map((l) => [l.side, l.text])).toEqual([
      ['top', 'Jamie and Lou'],
      ['bottom', 'October 3, 2026'],
    ]);
  });

  test('orientation line, explicit sides, chart colours and a private note', () => {
    const r = parsePersonalization(
      'Vertical frame\nNana and Me (color #2) along the top\nI love you LOTS (color #2) along the bottom',
      'black text',
    );
    expect(r.orientation).toBe('portrait');
    expect(r.lines).toEqual([
      { side: 'top', text: 'Nana and Me', chartColor: 2, explicit: true },
      { side: 'bottom', text: 'I love you LOTS', chartColor: 2, explicit: true },
    ]);
    expect(r.needsReview).toHaveLength(2);
    expect(r.needsReview.join(' ')).toContain('colour-chart');
    expect(r.needsReview.join(' ')).toContain('black text');
  });

  test('unplaced lines take top and bottom around a line placed on a side', () => {
    const r = parsePersonalization('Best Dad\nEst. 2020 on the left side\nLove, the kids');
    expect(r.lines.map((l) => [l.side, l.text, l.explicit])).toEqual([
      ['top', 'Best Dad', false],
      ['bottom', 'Love, the kids', false],
      ['left', 'Est. 2020', true],
    ]);
    expect(r.needsReview).toEqual([]);
  });

  test('an unplaced line is never guessed onto the left or right', () => {
    const r = parsePersonalization('Grandma\nGrandpa\nEst. 1970');
    expect(r.lines.map((l) => l.side)).toEqual(['top', 'bottom']);
    expect(r.needsReview).toEqual(['"Est. 1970" has no side, and only top and bottom are filled by default.']);

    const taken = parsePersonalization('Nana on top\nLove you\nXO');
    expect(taken.lines.map((l) => [l.side, l.text])).toEqual([['top', 'Nana'], ['bottom', 'Love you']]);
    expect(taken.needsReview.join(' ')).toContain('"XO"');
  });

  test('a clash, "as shown", or no text needs review', () => {
    expect(parsePersonalization('a along the top\nb on top').needsReview.join(' ')).toContain('Two lines');
    expect(parsePersonalization('Same as shown but Auntie').needsReview.join(' ')).toContain('listing photo');
    expect(parsePersonalization('').needsReview).toEqual(['No text to print.']);
  });

  test('a horizontal line sets landscape and is not printed', () => {
    const r = parsePersonalization('Horizontal\nThe Smiths');
    expect(r.orientation).toBe('landscape');
    expect(r.lines.map((l) => l.text)).toEqual(['The Smiths']);
  });
});

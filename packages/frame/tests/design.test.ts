import { describe, expect, test } from 'bun:test';
import { MAX_SIDE_CHARS, describeDesign, designFromMetadata, designKey, designToMetadata, parseDesign } from '../src/design';
import { FONTS, FONT_IDS } from '../src/index';

const good = {
  shape: 'scalloped',
  backgroundId: 'blue-toile',
  sides: {
    top: { text: '  Promoted   to Grandparents ', fontId: 'great-vibes' },
    bottom: { text: 'Est. 2027', fontId: 'montserrat-semibold', color: '#FFFFFF' },
    left: { text: '', fontId: 'great-vibes' },
  },
};

describe('parseDesign', () => {
  test('normalises a valid design: collapses spaces, drops empty sides, lower-cases colours', () => {
    const r = parseDesign(good);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.sides.top?.text).toBe('Promoted to Grandparents');
    expect(r.spec.sides.bottom?.color).toBe('#ffffff');
    expect(r.spec.sides.left).toBeUndefined();
  });

  test('refuses unknown shape, background, font and side', () => {
    const r = parseDesign({ shape: 'oval', backgroundId: 'plaid', sides: { middle: {}, top: { text: 'Hi', fontId: 'comic-sans' } } });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join('\n')).toContain('unknown shape');
    expect(r.errors.join('\n')).toContain('unknown background');
    expect(r.errors.join('\n')).toContain('unknown side');
    expect(r.errors.join('\n')).toContain('unknown font');
  });

  test('needs text on at least one side, like render_frame', () => {
    const r = parseDesign({ shape: 'scalloped', backgroundId: 'blue-toile', sides: { top: { text: '   ', fontId: 'great-vibes' } } });
    expect(r).toEqual({ ok: false, errors: ['give text for at least one side'] });
  });

  test('refuses over-long lines and unprintable characters', () => {
    const long = parseDesign({ ...good, sides: { top: { text: 'x'.repeat(MAX_SIDE_CHARS + 1), fontId: 'great-vibes' } } });
    expect(long.ok).toBe(false);
    const ctrl = parseDesign({ ...good, sides: { top: { text: 'a\u0007b', fontId: 'great-vibes' } } });
    expect(ctrl.ok).toBe(false);
  });
});

describe('background fit', () => {
  test('is optional, and the default is left off', () => {
    const r = parseDesign({ ...good, backgroundFit: { scale: 1, x: 0, y: 0 } });
    expect(r.ok && r.spec.backgroundFit).toBe(undefined);
  });

  test('is rounded to hundredths, and an axis with no room to move is centred', () => {
    const r = parseDesign({ ...good, backgroundFit: { scale: 1.2345, x: 0.4567, y: -0.333333 } });
    expect(r.ok && r.spec.backgroundFit).toEqual({ scale: 1.23, x: 0.46, y: -0.33 });
    // At scale 1 the sheet exactly fills the frame's width, so x can't change the print.
    const flat = parseDesign({ ...good, backgroundFit: { scale: 1, x: 0.8, y: 0.5 } });
    expect(flat.ok && flat.spec.backgroundFit).toEqual({ scale: 1, x: 0, y: 0.5 });
  });

  test('refuses values out of range or not numbers', () => {
    for (const backgroundFit of [{ scale: 0.5 }, { scale: 2.5 }, { scale: 1.5, x: 1.2 }, { scale: '2' }, { scale: 1.5, y: Number.NaN }, 'big']) {
      expect(parseDesign({ ...good, backgroundFit }).ok).toBe(false);
    }
  });

  test('rides through Stripe metadata and changes the cart key', () => {
    const r = parseDesign({ ...good, backgroundFit: { scale: 1.5, x: -0.25, y: 0.75 } });
    if (!r.ok) throw new Error(r.errors.join(', '));
    const meta = designToMetadata(r.spec);
    expect(meta.frame_fit).toBe('{"scale":1.5,"x":-0.25,"y":0.75}');
    expect(designFromMetadata(meta)).toEqual({ ok: true, spec: r.spec });
    const plain = parseDesign(good);
    if (!plain.ok) throw new Error();
    expect(designKey(plain.spec)).not.toBe(designKey(r.spec));
    expect(designFromMetadata({ ...meta, frame_fit: '{"scale":' }).ok).toBe(false);
  });

  test('describeDesign says how the background was zoomed and moved', () => {
    const r = parseDesign({ ...good, backgroundFit: { scale: 1.5, x: -0.25, y: -0.5 } });
    if (!r.ok) throw new Error();
    expect(describeDesign(r.spec)).toBe(
      'Scalloped frame · Blue Toile (zoomed to 150%, toward the top left) · Top: "Promoted to Grandparents" · Bottom: "Est. 2027"',
    );
  });
});

describe('Stripe metadata round trip', () => {
  test('a design survives encode and decode, and fits Stripe limits', () => {
    const r = parseDesign({
      ...good,
      sides: Object.fromEntries(['top', 'right', 'bottom', 'left'].map((s) => [s, { text: 'W'.repeat(MAX_SIDE_CHARS), fontId: 'playfair-display-bold', rotation: 0, color: '#2b333f' }])),
    });
    if (!r.ok) throw new Error(r.errors.join(', '));
    const meta = designToMetadata(r.spec);
    expect(Object.keys(meta).length).toBeLessThanOrEqual(50);
    for (const [k, v] of Object.entries(meta)) {
      expect(k.length).toBeLessThanOrEqual(40);
      expect(v.length).toBeLessThanOrEqual(500);
    }
    const back = designFromMetadata(meta);
    expect(back).toEqual({ ok: true, spec: r.spec });
    expect(designKey(back.ok ? back.spec : r.spec)).toBe(designKey(r.spec));
  });

  test('tampered metadata is refused', () => {
    expect(designFromMetadata({ frame_shape: 'scalloped', frame_background: 'blue-toile', frame_top: '{not json' }).ok).toBe(false);
  });
});

test('describeDesign names the shape, background and every line', () => {
  const r = parseDesign(good);
  if (!r.ok) throw new Error();
  expect(describeDesign(r.spec)).toBe('Scalloped frame · Blue Toile · Top: "Promoted to Grandparents" · Bottom: "Est. 2027"');
});

test('the font list is shared and every id is unique', () => {
  expect(new Set(FONT_IDS).size).toBe(FONTS.length);
  expect(FONT_IDS).toContain('great-vibes');
});

import type { Side } from '@butterlu/frame';

export type Orientation = 'landscape' | 'portrait';

export interface PlacedLine {
  side: Side;
  text: string;
  /** Number on the Etsy colour chart the buyer named for this line's text, e.g. "(color #2)". */
  chartColor?: number;
  /** True when the buyer said where the line goes; false when it was assigned by order. */
  explicit: boolean;
}

export interface ParsedPersonalization {
  lines: PlacedLine[];
  orientation?: Orientation;
  /** Why a person must check this order before it prints. Empty means it can go straight through. */
  needsReview: string[];
}

/** Unplaced lines fill the free sides in this order. */
const FILL_ORDER: readonly Side[] = ['top', 'bottom', 'left', 'right'];

const ORIENTATION_LINE = /^(?:(vertical|portrait)|(horizontal|landscape))(?:\s+frame)?\.?$/i;
const SIDE_SUFFIX = /\s*[-,:]?\s*(?:along|on|at|across)\s+(?:the\s+)?(top|bottom|left|right)(?:\s+side)?\.?$/i;
const CHART_COLOR = /\s*\(\s*colou?r\s*#?\s*(\d+)\s*\)/i;
const AS_SHOWN = /\b(?:as\s+(?:shown|pictured)|same\s+as\s+(?:the\s+)?(?:photo|picture|listing))\b/i;

/**
 * Reads the free-text Personalization field of an Etsy order. One line of the
 * field is one line of printed text. A line may say where it goes ("along the
 * top") and what colour it is ("(color #2)"); a line on its own like "Vertical
 * frame" sets the orientation and is not printed. Private notes are the
 * seller's own and always send the order to review.
 */
export function parsePersonalization(personalization: string, privateNotes = ''): ParsedPersonalization {
  const needsReview: string[] = [];
  let orientation: Orientation | undefined;
  const pending: { text: string; side?: Side; chartColor?: number }[] = [];

  for (const raw of personalization.split(/\r?\n/)) {
    let text = raw.trim();
    if (!text) continue;

    const o = text.match(ORIENTATION_LINE);
    if (o) {
      orientation = o[1] ? 'portrait' : 'landscape';
      continue;
    }
    if (AS_SHOWN.test(text)) needsReview.push(`"${text}" refers to the listing photo's wording.`);

    let side: Side | undefined;
    const s = text.match(SIDE_SUFFIX);
    if (s) {
      side = s[1]!.toLowerCase() as Side;
      text = text.slice(0, s.index).trim();
    }
    let chartColor: number | undefined;
    const c = text.match(CHART_COLOR);
    if (c) {
      chartColor = Number(c[1]);
      text = (text.slice(0, c.index) + text.slice(c.index! + c[0].length)).trim();
    }
    pending.push({ text, side, chartColor });
  }

  const lines: PlacedLine[] = [];
  const taken = new Set<Side>();
  for (const p of pending.filter((p) => p.side)) {
    if (taken.has(p.side!)) {
      needsReview.push(`Two lines asked for the ${p.side} side.`);
      continue;
    }
    taken.add(p.side!);
    lines.push({ side: p.side!, text: p.text, chartColor: p.chartColor, explicit: true });
  }
  const free = FILL_ORDER.filter((s) => !taken.has(s));
  const unplaced = pending.filter((p) => !p.side);
  if (unplaced.length > free.length) {
    needsReview.push(`${pending.length} lines of text but a frame has 4 sides.`);
  }
  unplaced.slice(0, free.length).forEach((p, i) => {
    lines.push({ side: free[i]!, text: p.text, chartColor: p.chartColor, explicit: false });
  });

  if (lines.length === 0) needsReview.push('No text to print.');
  if (lines.some((l) => l.chartColor !== undefined)) {
    needsReview.push('A text colour is given as an Etsy colour-chart number, and the chart is not mapped yet.');
  }
  if (privateNotes.trim()) needsReview.push(`Private note: "${privateNotes.trim()}".`);

  lines.sort((a, b) => FILL_ORDER.indexOf(a.side) - FILL_ORDER.indexOf(b.side));
  return { lines, orientation, needsReview };
}

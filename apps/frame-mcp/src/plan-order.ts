import type { HexColor } from '@butterlu/frame';
import CHART from './etsy-color-chart.json';
import { type Orientation, type PlacedLine, parsePersonalization } from './personalization';

export interface ChartColor {
  number: number;
  hex: string;
  backgroundId: string | null;
  match: 'strong' | 'likely' | 'none';
}

export const ETSY_COLOR_CHART = CHART as ChartColor[];

export type OrderBackground =
  | { kind: 'chart'; number: number; backgroundId: string | null; match: ChartColor['match'] }
  | { kind: 'as-shown' }
  | { kind: 'unknown'; value: string };

export interface PlannedLine extends PlacedLine {
  /** Text colour from the chart number the buyer named; absent means the background's default. */
  color?: HexColor;
}

export interface OrderPlan {
  background: OrderBackground;
  orientation?: Orientation;
  lines: PlannedLine[];
  needsReview: string[];
  ready: boolean;
}

const chartEntry = (n: number) => ETSY_COLOR_CHART.find((c) => c.number === n);

function readBackground(color: string): OrderBackground {
  const value = color.trim();
  if (/^\d+$/.test(value)) {
    const entry = chartEntry(Number(value));
    if (entry) return { kind: 'chart', number: entry.number, backgroundId: entry.backgroundId, match: entry.match };
  }
  if (/^as\s+shown$/i.test(value)) return { kind: 'as-shown' };
  return { kind: 'unknown', value };
}

function backgroundReview(bg: OrderBackground): string[] {
  switch (bg.kind) {
    case 'chart':
      if (!bg.backgroundId) return [`Colour-chart #${bg.number} has no background file yet.`];
      if (bg.match === 'likely') return [`Colour-chart #${bg.number} is matched to ${bg.backgroundId} by eye but not confirmed.`];
      return [];
    case 'as-shown':
      return ['Background is "As Shown", which needs the listing\'s own design.'];
    case 'unknown':
      return [`Color "${bg.value}" is not a number on the colour chart.`];
  }
}

/** Reads an Etsy order's Color, Personalization and Private notes into a layout plan. */
export function planOrder(color: string, personalization: string, privateNotes = ''): OrderPlan {
  const parsed = parsePersonalization(personalization, privateNotes);
  const background = readBackground(color);
  const needsReview = [...backgroundReview(background)];

  const lines = parsed.lines.map((line): PlannedLine => {
    if (line.chartColor === undefined) return line;
    const entry = chartEntry(line.chartColor);
    if (!entry) {
      needsReview.push(`Text colour #${line.chartColor} for the ${line.side} side is not on the colour chart.`);
      return line;
    }
    return { ...line, color: entry.hex as HexColor };
  });

  needsReview.push(...parsed.needsReview);
  return { background, orientation: parsed.orientation, lines, needsReview, ready: needsReview.length === 0 };
}

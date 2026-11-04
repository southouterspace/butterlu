#!/usr/bin/env node
// Writes src/etsy-color-chart.json: for each number on the Etsy colour chart
// (assets/etsy-color-chart/), the background file it matches, if any, and the
// swatch's average colour for when a buyer names a chart number as a text
// colour. Needs ImageMagick. Rerun after changing MATCHES or the chart images.
//
// MATCHES was set by eye from a side-by-side sheet and checked by colour
// distance. The matched backgrounds (files 23 to 43) follow the chart in exact
// reverse order, which is how they were exported. "likely" means the texture
// matches but the edit differs (rotated grain, lighter tone); plan_order sends
// those to review until someone confirms them.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chartDir = path.resolve(appDir, '../../assets/etsy-color-chart');

const MATCHES = {
  1: ['red', 'strong'],
  2: ['pink-coral', 'strong'],
  3: ['pink', 'strong'],
  7: ['orange', 'strong'],
  9: ['yellow', 'strong'],
  10: ['lime-green', 'strong'],
  12: ['green', 'strong'],
  13: ['teal', 'strong'],
  15: ['light-blue', 'strong'],
  17: ['dark-blue-navy', 'strong'],
  18: ['light-purple', 'strong'],
  19: ['light-brown', 'strong'],
  21: ['dark-brown', 'strong'],
  22: ['gray', 'strong'],
  24: ['charcoal', 'strong'],
  25: ['black', 'strong'],
  29: ['distressed-white', 'strong'],
  31: ['whitewashed-wood', 'likely'],
  37: ['brown-wood-plank', 'strong'],
  39: ['white-shiplap', 'strong'],
  41: ['gray-shiplap', 'likely'],
};

const SHEETS = [
  { file: 'chart-01-25.webp', first: 1, cols: 5, count: 25 },
  { file: 'chart-26-41.webp', first: 26, cols: 4, count: 16 },
];

function swatchHex(file, cols, index) {
  const size = Number(execFileSync('identify', ['-format', '%w', file], { encoding: 'utf8' }));
  const cell = Math.floor(size / cols);
  const x = (index % cols) * cell;
  const y = Math.floor(index / cols) * cell;
  // The centre half of the cell avoids the printed number in its corner.
  const rgb = execFileSync(
    'convert',
    [file, '-crop', `${cell}x${cell}+${x}+${y}`, '+repage', '-gravity', 'center', '-crop', '50%x50%+0+0', '+repage', '-resize', '1x1!', '-format', '%[fx:int(255*r)] %[fx:int(255*g)] %[fx:int(255*b)]', 'info:'],
    { encoding: 'utf8' },
  );
  return `#${rgb.split(' ').map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
}

const chart = SHEETS.flatMap(({ file, first, cols, count }) =>
  Array.from({ length: count }, (_, i) => {
    const number = first + i;
    const [backgroundId, match] = MATCHES[number] ?? [null, 'none'];
    return { number, hex: swatchHex(path.join(chartDir, file), cols, i), backgroundId, match };
  }),
);

const out = path.join(appDir, 'src/etsy-color-chart.json');
fs.writeFileSync(out, `${JSON.stringify(chart, null, 2)}\n`);
const matched = chart.filter((c) => c.backgroundId);
console.log(`${chart.length} chart colours, ${matched.length} matched to a background (${matched.filter((c) => c.match === 'likely').length} likely); wrote ${path.relative(process.cwd(), out)}`);

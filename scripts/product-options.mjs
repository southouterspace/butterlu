// Writes plans/product-options.json: the frame's two shapes and every background in
// assets/background-images/. Rerun after adding or renaming a background.
//
//   node scripts/product-options.mjs
//
// A frame is one shape plus one background, with fully custom text. Shape sizes are
// read off assets/frame-drawing.pdf by hand; background names come from file names.
import { readdir, readFile, writeFile } from 'node:fs/promises';

const ASSETS = new URL('../assets/', import.meta.url);
const OUT = new URL('../plans/product-options.json', import.meta.url);

// Width and height of a baseline or progressive JPEG, from its first SOF marker.
function jpegSize(buf) {
  for (let i = 2; i < buf.length; ) {
    const marker = buf[i + 1];
    const length = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  throw new Error('no SOF marker');
}

const PATTERNS = ['Bows', 'Toile', 'Stripes', 'Checkers', 'Linen', 'Shiplap', 'Wood Plank', 'Wood'];
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const files = (await readdir(new URL('background-images/', ASSETS))).filter((f) => f.endsWith('.jpg')).sort();
const backgrounds = await Promise.all(
  files.map(async (file) => {
    const [, order, raw] = file.match(/^_(\d+)_(.+)\.jpg$/);
    const name = raw.replace('_', ' / ');
    const pattern = PATTERNS.find((p) => name.endsWith(` ${p}`)) ?? 'solid';
    const { width, height } = jpegSize(await readFile(new URL(`background-images/${file}`, ASSETS)));
    return {
      id: slug(name),
      name,
      pattern: slug(pattern),
      color: pattern === 'solid' ? name : name.slice(0, -pattern.length - 1),
      order: Number(order),
      file: `assets/background-images/${file}`,
      width,
      height,
    };
  }),
);

const manifest = {
  _schema: {
    description:
      'The configurable frame: one shape plus one background, with fully custom text. Etsy listing variations exist to capture search volume; on the new site they are presets of this one product. Produced by scripts/product-options.mjs.',
    shape: { id: 'string', name: 'string', widthIn: 'number', heightIn: 'number', source: 'string' },
    background: { id: 'string', name: 'string', pattern: 'solid | stripes | checkers | toile | bows | linen | shiplap | wood-plank | wood', color: 'string', order: 'integer, the file-name prefix', file: 'string', width: 'px', height: 'px' },
  },
  generatedAt: new Date().toISOString(),
  shapes: [
    { id: 'rounded-rectangle', name: 'Rounded rectangle', widthIn: 8.375, heightIn: 6.375, source: 'assets/frame-drawing.pdf' },
    { id: 'scalloped', name: 'Scalloped', widthIn: 8.375, heightIn: 6.368, source: 'assets/frame-drawing.pdf' },
  ],
  // Owner answers, 2026-10-12.
  notes: [
    'The photo opening takes a 4x6 photo (owner: "I think so"; the drawing does not dimension it, scaled it is about 5.75 x 3.75 in). Confirm against a real frame before the editor fixes crop sizes.',
    'The two plain rectangles in assets/frame-drawing.pdf (15.00 x 5.00 in, 13.75 x 9.25 in) are out of scope for now.',
    'These 44 backgrounds are the set. The Etsy colour chart ("#1 is fuchsia") is not carried over.',
    'Backgrounds are 2550 x 3300 px at 300 dpi (8.5 x 11 in sheets).',
  ],
  backgrounds,
};

await writeFile(OUT, JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${manifest.shapes.length} shapes and ${backgrounds.length} backgrounds to plans/product-options.json`);

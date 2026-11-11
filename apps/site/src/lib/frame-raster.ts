// A frame as a raster image, rendered at build time without a browser: Google's
// merchant listings need a product image, and link previews need og:image. Text
// becomes path outlines from the print fonts (so no font loading in the
// rasteriser) and the background is inlined, then sharp draws the SVG. Only build
// code imports this.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { FONTS, type FrameSpec, SHAPES, backgroundRect } from '@butterlu/frame';
import { textOutline } from '@butterlu/frame/pdf';
import sharp from 'sharp';
import { placementsAtBuild } from './layout-build';

const require = createRequire(import.meta.url);
const outlines = new Map<string, ReturnType<typeof textOutline>>();
const outline = (fontId: string) => {
  let o = outlines.get(fontId);
  if (!o) {
    const font = FONTS.find((f) => f.id === fontId)!;
    o = textOutline(new Uint8Array(readFileSync(require.resolve(font.source))));
    outlines.set(fontId, o);
  }
  return o;
};

/** Square JPEG of the preset frame on the shop's muted backdrop. */
export async function frameJpeg(spec: FrameSpec, size = 1200): Promise<Buffer> {
  const shape = SHAPES[spec.shape];
  const bg = await sharp(join(process.cwd(), 'public/backgrounds', `${spec.backgroundId}.webp`)).jpeg({ quality: 82 }).toBuffer();
  const texts = placementsAtBuild(spec)
    .map((p) => {
      const rotate = p.rotation ? ` rotate(${-p.rotation})` : '';
      return `<path transform="translate(${p.origin.x} ${p.origin.y})${rotate}" fill="${p.color}" d="${outline(p.fontId)(p.text, p.sizePt / 72)}"/>`;
    })
    .join('');
  // Frame centred with a margin on a square canvas.
  const side = Math.max(shape.widthIn, shape.heightIn) * 1.18;
  const ox = (side - shape.widthIn) / 2;
  const oy = (side - shape.heightIn) / 2;
  const r = backgroundRect(spec.shape, spec.backgroundFit);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${side} ${side}">
<rect width="${side}" height="${side}" fill="#eef1f2"/>
<defs><clipPath id="c"><path d="${shape.outline}"/></clipPath><filter id="s" x="-5%" y="-5%" width="110%" height="115%"><feDropShadow dx="0" dy="0.05" stdDeviation="0.06" flood-opacity="0.22"/></filter></defs>
<g transform="translate(${ox} ${oy})">
<g filter="url(#s)"><path d="${shape.outline}" fill="#ffffff"/></g>
<g clip-path="url(#c)"><image href="data:image/jpeg;base64,${bg.toString('base64')}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" preserveAspectRatio="none"/></g>
<path d="${shape.opening}" fill="#f3efe8" stroke="#d9d2c6" stroke-width="0.02"/>
${texts}
</g></svg>`;
  return sharp(Buffer.from(svg)).flatten({ background: '#eef1f2' }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
}

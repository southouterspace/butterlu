// Draws a frame as SVG markup from a spec and its fitted placements. The same
// function runs at build time (product cards, fitted with fontkit like the print
// file) and in the browser (the live customizer, fitted with canvas ink metrics).
// Placements come from @butterlu/frame's layoutFrame, so text sits in the same
// safe zones, at the same size, as on the printed frame.
import { type FrameSpec, type Placement, SHAPES, backgroundById } from '@butterlu/frame';

/** CSS face for each font id. public/fonts/<id>.woff is the same file the print renderer embeds. */
export const FONT_FACES: Record<string, { family: string; weight: number }> = {
  'great-vibes': { family: 'Great Vibes', weight: 400 },
  'playfair-display-bold': { family: 'Playfair Display', weight: 700 },
  'montserrat-semibold': { family: 'Montserrat', weight: 600 },
};

export const fontCss = (fontId: string) => {
  const f = FONT_FACES[fontId] ?? { family: 'serif', weight: 400 };
  return { family: `'${f.family}'`, weight: f.weight };
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const backgroundUrl = (id: string) => `/backgrounds/${id}.webp`;

export interface FrameSvgOptions {
  /** Unique per SVG on the page, for the clip path id. */
  idPrefix: string;
  /** Accessible name; the SVG is decorative when omitted. */
  label?: string;
  /** Show the photo opening's "your photo here" hint. */
  photoHint?: boolean;
}

export function frameSvg(spec: FrameSpec, placements: Placement[], { idPrefix, label, photoHint = true }: FrameSvgOptions): string {
  const shape = SHAPES[spec.shape];
  const pad = 0.06;
  const clip = `${idPrefix}-clip`;
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true" focusable="false"';
  const texts = placements
    .map((p) => {
      const { family, weight } = fontCss(p.fontId);
      const x = p.origin.x.toFixed(4);
      const y = p.origin.y.toFixed(4);
      // PDF rotation is counterclockwise with y up; SVG's y runs down, so negate it.
      const rotate = p.rotation ? ` transform="rotate(${-p.rotation} ${x} ${y})"` : '';
      return `<text x="${x}" y="${y}" font-family="${esc(family)}" font-weight="${weight}" font-size="${(p.sizePt / 72).toFixed(4)}" fill="${p.color}"${rotate}>${esc(p.text)}</text>`;
    })
    .join('');
  const cx = shape.widthIn / 2;
  const cy = shape.heightIn / 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${shape.widthIn + 2 * pad} ${shape.heightIn + 2 * pad}" ${a11y} class="frame-svg">`,
    `<defs><clipPath id="${clip}"><path d="${shape.outline}"/></clipPath><filter id="${idPrefix}-shadow" x="-5%" y="-5%" width="110%" height="115%"><feDropShadow dx="0" dy="0.04" stdDeviation="0.04" flood-opacity="0.25"/></filter></defs>`,
    `<g filter="url(#${idPrefix}-shadow)"><path d="${shape.outline}" fill="#ffffff"/></g>`,
    `<g clip-path="url(#${clip})"><image href="${backgroundUrl(spec.backgroundId)}" x="0" y="0" width="${shape.widthIn}" height="${shape.heightIn}" preserveAspectRatio="xMidYMid slice" /></g>`,
    `<path d="${shape.opening}" fill="#f3efe8" stroke="#d9d2c6" stroke-width="0.02"/>`,
    photoHint
      ? `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, sans-serif" font-size="0.24" fill="#857d71">Your 4×6 photo</text>`
      : '',
    texts,
    `</svg>`,
  ].join('');
}

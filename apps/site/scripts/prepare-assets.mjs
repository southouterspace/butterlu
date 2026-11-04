// Copies what the browser needs out of the repo's business assets, before the
// Astro build. Outputs are generated, gitignored, and skipped when up to date.
//   public/backgrounds/<id>.webp        1200 px wide, for frame previews
//   public/backgrounds/thumb/<id>.webp  160 px, for the background picker
//   public/fonts/<id>.woff              the same font files the print renderer embeds
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = resolve(siteDir, '../..');
const pub = join(siteDir, 'public');
const options = JSON.parse(readFileSync(join(repoDir, 'plans/product-options.json'), 'utf8'));
const fonts = JSON.parse(readFileSync(join(repoDir, 'packages/frame/src/fonts.json'), 'utf8'));
const require = createRequire(join(repoDir, 'packages/frame/package.json'));

const fresh = (out, src) => existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs;
for (const dir of ['backgrounds/thumb', 'fonts']) mkdirSync(join(pub, dir), { recursive: true });

let made = 0;
await Promise.all(
  options.backgrounds.map(async (b) => {
    const src = join(repoDir, b.file);
    const full = join(pub, 'backgrounds', `${b.id}.webp`);
    const thumb = join(pub, 'backgrounds/thumb', `${b.id}.webp`);
    if (!fresh(full, src)) {
      await sharp(src).resize({ width: 1200 }).webp({ quality: 72 }).toFile(full);
      made++;
    }
    if (!fresh(thumb, src)) {
      // The middle of the sheet, square: what the frame's border actually shows.
      await sharp(src).resize({ width: 160, height: 160, fit: 'cover' }).webp({ quality: 70 }).toFile(thumb);
      made++;
    }
  }),
);
for (const f of fonts) {
  const src = require.resolve(f.source);
  const out = join(pub, 'fonts', `${f.id}.woff`);
  if (!fresh(out, src)) {
    copyFileSync(src, out);
    made++;
  }
}
console.log(`prepare-assets: ${options.backgrounds.length} backgrounds, ${fonts.length} fonts (${made} file(s) written)`);

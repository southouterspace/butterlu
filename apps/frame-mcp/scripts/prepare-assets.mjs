#!/usr/bin/env node
// Copies every background and font into build/assets, which wrangler uploads
// with the Worker as static assets (wrangler.jsonc "assets"). The Worker reads
// them through its ASSETS binding; run_worker_first keeps them off the public
// web. Safe to rerun: it rebuilds the folder from scratch.
//
//   node scripts/prepare-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.resolve(appDir, '../..');
const outDir = path.join(appDir, 'build/assets');
const resolve = createRequire(import.meta.url).resolve;

const options = JSON.parse(fs.readFileSync(path.join(repoDir, 'plans/product-options.json'), 'utf8'));
const fonts = JSON.parse(fs.readFileSync(path.join(repoDir, 'packages/frame/src/fonts.json'), 'utf8'));

// Key layout shared with src/assets.ts (backgroundPath, fontPath).
const rows = [
  ...options.backgrounds.map((b) => ({ to: `backgrounds/${b.id}.jpg`, from: path.join(repoDir, b.file) })),
  ...fonts.map((f) => ({ to: `fonts/${f.id}.woff`, from: resolve(f.source) })),
];

const missing = rows.filter((r) => !fs.existsSync(r.from));
if (missing.length) throw new Error(`missing source files:\n${missing.map((r) => `  ${r.from}`).join('\n')}`);

fs.rmSync(outDir, { recursive: true, force: true });
for (const { from, to } of rows) {
  fs.mkdirSync(path.dirname(path.join(outDir, to)), { recursive: true });
  fs.copyFileSync(from, path.join(outDir, to));
}
console.log(`prepare-assets: ${options.backgrounds.length} backgrounds, ${fonts.length} fonts -> ${path.relative(repoDir, outDir)}`);

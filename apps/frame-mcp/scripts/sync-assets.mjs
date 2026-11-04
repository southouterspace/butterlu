#!/usr/bin/env node
// Uploads every background and font to the ASSETS R2 bucket. Safe to rerun:
// each upload overwrites its key.
//
//   node scripts/sync-assets.mjs                       local R2 under .wrangler/state (what `bun run dev` reads)
//   node scripts/sync-assets.mjs --persist-to <dir>    local R2 under <dir>
//   node scripts/sync-assets.mjs --remote              the real Cloudflare bucket (needs wrangler login)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.resolve(appDir, '../..');
const BUCKET = 'butterlu-frame-assets';

const { values: args } = parseArgs({
  options: { remote: { type: 'boolean', default: false }, 'persist-to': { type: 'string', default: '.wrangler/state' } },
});

const options = JSON.parse(fs.readFileSync(path.join(repoDir, 'plans/product-options.json'), 'utf8'));
const fonts = JSON.parse(fs.readFileSync(path.join(repoDir, 'packages/frame/src/fonts.json'), 'utf8'));

const batches = [
  {
    contentType: 'image/jpeg',
    rows: options.backgrounds.map((b) => ({ key: `backgrounds/${b.id}.jpg`, file: path.join(repoDir, b.file) })),
  },
  {
    contentType: 'font/woff',
    rows: fonts.map((f) => ({ key: `fonts/${f.id}.woff`, file: createRequire(import.meta.url).resolve(f.source) })),
  },
];

for (const { rows } of batches) {
  const missing = rows.filter((r) => !fs.existsSync(r.file));
  if (missing.length) throw new Error(`missing source files:\n${missing.map((r) => `  ${r.file}`).join('\n')}`);
}

const target = args.remote ? ['--remote'] : ['--local', '--persist-to', args['persist-to']];
if (args.remote) console.warn(`Uploading to the REMOTE bucket ${BUCKET}.`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-assets-'));
try {
  for (const { contentType, rows } of batches) {
    const list = path.join(tmp, 'list.json');
    fs.writeFileSync(list, JSON.stringify(rows));
    execFileSync('npx', ['wrangler', 'r2', 'bulk', 'put', BUCKET, '--filename', list, '--ct', contentType, '--force', ...target], {
      cwd: appDir,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    console.log(`${contentType}: ${rows.length} objects -> ${BUCKET} (${args.remote ? 'remote' : `local, ${args['persist-to']}`})`);
  }
} finally {
  fs.rmSync(tmp, { recursive: true });
}

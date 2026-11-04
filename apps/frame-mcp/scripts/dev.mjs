#!/usr/bin/env node
// `bun run dev`: serves the frame MCP on http://localhost:8787/mcp with Google
// Drive replaced by scripts/mock-google.mjs, so renders work without a Google
// account. MCP_TOKEN still comes from .dev.vars (README, Authentication).
// Saved PDFs are kept in memory; render_frame's links open them while this runs.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MOCK_CREDENTIALS, startMockGoogle } from './mock-google.mjs';

const appDir = fileURLToPath(new URL('..', import.meta.url));
const google = await startMockGoogle();
console.log(`mock Google Drive on ${google.base}`);
const vars = { GOOGLE_API_BASE: google.base, ...MOCK_CREDENTIALS };
const dev = spawn('npx', ['wrangler', 'dev', ...Object.entries(vars).flatMap(([k, v]) => ['--var', `${k}:${v}`]), ...process.argv.slice(2)], {
  cwd: appDir,
  stdio: 'inherit',
});
dev.on('exit', (code) => {
  google.close();
  process.exit(code ?? 0);
});

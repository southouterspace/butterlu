#!/usr/bin/env node
// The one way the frame MCP gets deployed: node scripts/deploy.mjs <stage|production>.
// Validates, bundles the assets, deploys, waits for /health, and, when a token
// for this server is in FRAME_MCP_TOKEN and Drive is set up, renders one test
// frame through the deployed server and checks it was saved to Drive. Prints
// one JSON summary line: deploy-summary {...}.
//
// Stage runs from .github/workflows/frame-mcp-stage.yml on pushes to main.
// Production runs only from .github/workflows/release.yml on a published
// release, which only the owner cuts.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = fileURLToPath(new URL('..', import.meta.url));
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', cwd: appDir }).trim();

function run(cmd, args, extraEnv = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', cwd: appDir, env: { ...process.env, ...extraEnv } });
  if (res.status !== 0) fail(`${cmd} ${args.join(' ')} exited ${res.status}`);
}

function fail(reason) {
  console.error(`deploy: ${reason}`);
  process.exit(1);
}

// Missing setup only the owner can do: report it, never work around it.
function setupBlocked(reason) {
  console.error(`deploy-setup-blocked: ${reason}`);
  process.exit(1);
}

// The shared account that hosts Quote Goat. Butterlu must never deploy there.
const FORBIDDEN_ACCOUNTS = new Set(['d85e596fe8902fb82e35f754fac9ffb8']);

function pinnedAccount() {
  const config = readFileSync(join(appDir, 'wrangler.jsonc'), 'utf8');
  const pinned = config.match(/^\s*"account_id":\s*"([0-9a-f]{32})"/m)?.[1];
  if (!pinned) return { blocked: 'apps/frame-mcp/wrangler.jsonc pins no account_id' };
  const fromEnv = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (fromEnv && fromEnv !== pinned) return { blocked: `CLOUDFLARE_ACCOUNT_ID is ${fromEnv}, not Butterlu's account ${pinned}` };
  return { pinned };
}

function onSyncedMain() {
  if (git('rev-parse', '--abbrev-ref', 'HEAD') !== 'main' && process.env.GITHUB_REF !== 'refs/heads/main') return 'stage deploys only from main';
  if (git('status', '--porcelain', '--', '.')) return 'apps/frame-mcp has uncommitted changes';
  git('fetch', '--quiet', 'origin', 'main');
  if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/main')) return 'HEAD is not origin/main';
  return null;
}

const ENVIRONMENTS = {
  // Stage may deploy before the owner has set its secrets (the Worker has to
  // exist first), so missing setup is reported, not fatal.
  stage: { precondition: onSyncedMain, envFlag: '--env=', mustBeSetUp: false },
  production: {
    // Production must be able to render and save: a release with missing
    // secrets fails instead of going green while every call is refused.
    mustBeSetUp: true,
    precondition: () =>
      process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_EVENT_NAME === 'release'
        ? null
        : 'production deploys only from .github/workflows/release.yml on a published release',
    envFlag: '--env=production',
  },
};

// Wrangler records each deploy as one ND-JSON entry in this file.
function wranglerDeploy(envFlag) {
  const out = join(mkdtempSync(join(tmpdir(), 'wrangler-')), 'out.ndjson');
  run('bunx', ['wrangler', 'deploy', envFlag, '--message', git('rev-parse', '--short', 'HEAD')], { WRANGLER_OUTPUT_FILE_PATH: out });
  const entry = readFileSync(out, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .find((e) => e.type === 'deploy');
  const url = (entry?.targets ?? []).find((u) => u.includes('workers.dev')) ?? entry?.targets?.[0];
  return url && !url.startsWith('http') ? `https://${url}` : url;
}

async function waitForHealth(url) {
  let answered = false;
  for (let i = 0; i < 15; i++) {
    try {
      const res = await fetch(new URL('/health', url), { signal: AbortSignal.timeout(5000) });
      answered = true;
      if (res.ok) return { state: 'ok', body: await res.json() };
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return { state: answered ? 'unhealthy' : 'unreachable' };
}

const name = process.argv[2];
const env = ENVIRONMENTS[name];
if (!env) fail(`usage: node scripts/deploy.mjs <${Object.keys(ENVIRONMENTS).join('|')}>`);
if (!process.env.CLOUDFLARE_API_TOKEN) setupBlocked('CLOUDFLARE_API_TOKEN is not set (apps/frame-mcp/README.md, Deploy)');
const account = pinnedAccount();
if (account.blocked) setupBlocked(account.blocked);
if (FORBIDDEN_ACCOUNTS.has(account.pinned)) setupBlocked(`account ${account.pinned} belongs to another project`);
process.env.CLOUDFLARE_ACCOUNT_ID = account.pinned;
const blocked = env.precondition();
if (blocked) fail(blocked);

run('bun', ['run', 'validate']);
run('node', ['scripts/prepare-assets.mjs']);
const url = wranglerDeploy(env.envFlag);
if (!url) fail('wrangler reported no URL');

const health = await waitForHealth(url);
let check = 'skipped: no FRAME_MCP_TOKEN';
if (health.state === 'ok' && health.body.auth !== 'set') check = 'skipped: MCP_TOKEN secret not set on the Worker';
else if (health.state === 'ok' && health.body.storage === 'not-configured') check = `skipped: Drive not set up (missing ${health.body.missing.join(', ')})`;
else if (health.state === 'ok' && process.env.FRAME_MCP_TOKEN) {
  const res = spawnSync('node', ['scripts/remote-check.mjs', '--url', url, '--label', `${name} check ${git('rev-parse', '--short', 'HEAD')}`], {
    stdio: 'inherit',
    cwd: appDir,
  });
  check = res.status === 0 ? 'passed' : 'failed';
}

const summary = { env: name, url, commit: git('rev-parse', '--short', 'HEAD'), health: health.state, storage: health.body?.storage, check };
console.log(`deploy-summary ${JSON.stringify(summary)}`);
if (health.state !== 'ok' || check === 'failed') process.exit(1);
if (env.mustBeSetUp && (health.body.auth !== 'set' || health.body.storage === 'not-configured')) {
  setupBlocked(`${name} is deployed but cannot work yet: ${check.replace(/^skipped: /, '')} (apps/frame-mcp/README.md, Google Drive)`);
}

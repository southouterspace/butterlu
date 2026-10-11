// The one way any environment gets deployed: node scripts/deploy.mjs <env>.
// Each run builds, checks, deploys, waits for /api/health, then runs the e2e
// suite against the deployed URL, and prints one JSON summary line.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

function run(cmd, args, extraEnv = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...extraEnv } });
  if (res.status !== 0) fail(`${cmd} ${args.join(' ')} exited ${res.status}`);
}

function fail(reason) {
  console.error(`deploy: ${reason}`);
  process.exit(1);
}

// Missing setup only the owner can do. The session hook relays these lines
// to the agent as "report it, do not work around it".
function setupBlocked(reason) {
  console.error(`deploy-setup-blocked: ${reason}`);
  process.exit(1);
}

// The shared account that hosts Quote Goat. Butterlu must never deploy there.
const FORBIDDEN_ACCOUNTS = new Set(['d85e596fe8902fb82e35f754fac9ffb8']);

// Butterlu deploys only to its own Cloudflare account, pinned in wrangler.jsonc.
// CLOUDFLARE_ACCOUNT_ID overrides the config in wrangler, so a token for any
// other account (the shared one that hosts Quote Goat) must be refused here.
function pinnedAccount() {
  const config = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  const pinned = config.match(/^\s*"account_id":\s*"([0-9a-f]{32})"/m)?.[1];
  if (!pinned) return { blocked: 'wrangler.jsonc pins no account_id; Butterlu needs its own Cloudflare account (site/README.md, one-time setup)' };
  const fromEnv = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (fromEnv && fromEnv !== pinned) return { blocked: `CLOUDFLARE_ACCOUNT_ID is ${fromEnv}, not Butterlu's account ${pinned}` };
  return { pinned };
}

function onCleanSyncedMain() {
  if (git('rev-parse', '--abbrev-ref', 'HEAD') !== 'main') return 'stage deploys only from main';
  if (git('status', '--porcelain')) return 'working tree is dirty';
  git('fetch', '--quiet', 'origin', 'main');
  if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/main')) return 'HEAD is not origin/main';
  return null;
}

// Branch names end in their unique part (claude/<topic>-<id>), so a long
// name keeps a hash of the whole branch instead of being cut at the tail.
function previewName() {
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  const slug = branch.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (slug.length <= 40) return slug;
  const hash = createHash('sha1').update(branch).digest('hex').slice(0, 8);
  return `${slug.slice(0, 31).replace(/-+$/, '')}-${hash}`;
}

// Wrangler records each deploy as one ND-JSON entry in this file. Reading it
// avoids parsing the human output, which mixes progress lines into --json.
function wrangler(args, type) {
  const out = join(mkdtempSync(join(tmpdir(), 'wrangler-')), 'out.ndjson');
  run('npx', ['wrangler', ...args, '--message', git('rev-parse', '--short', 'HEAD')], {
    WRANGLER_OUTPUT_FILE_PATH: out,
  });
  return readFileSync(out, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .find((e) => e.type === type);
}

// Wrangler prefixes https:// only on workers.dev targets; routes come bare.
function workersDev(urls = []) {
  const url = urls.find((u) => u.includes('workers.dev')) ?? urls[0];
  return url && !url.startsWith('http') ? `https://${url}` : url;
}

const ENVIRONMENTS = {
  preview: {
    precondition: () => {
      if (git('rev-parse', '--abbrev-ref', 'HEAD') === 'main') return 'preview a branch, not main';
      return git('status', '--porcelain', '--', '.') ? 'site/ has uncommitted changes; the Preview must match a commit' : null;
    },
    check: 'build',
    deploy: () => workersDev(wrangler(['preview', '--name', previewName()], 'preview')?.preview_urls),
  },
  stage: {
    precondition: onCleanSyncedMain,
    check: 'validate',
    mustReach: true,
    deploy: () => workersDev(wrangler(['deploy', '--env='], 'deploy')?.targets),
  },
  production: {
    precondition: () =>
      process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_EVENT_NAME === 'release'
        ? null
        : 'production deploys only from .github/workflows/release.yml on a published release',
    check: 'validate',
    mustReach: true,
    deploy: () => workersDev(wrangler(['deploy', '--env=production'], 'deploy')?.targets),
  },
};

// "unreachable" means no HTTP response at all: the Claude sandbox blocks
// *.workers.dev unless the environment's network policy allows it.
async function healthy(url) {
  let answered = false;
  for (let i = 0; i < 15; i++) {
    try {
      const res = await fetch(new URL('/api/health', url), { signal: AbortSignal.timeout(5000) });
      answered = true;
      if (res.ok) return 'ok';
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return answered ? 'unhealthy' : 'unreachable';
}

const name = process.argv[2];
const env = ENVIRONMENTS[name];
if (!env) fail(`usage: node scripts/deploy.mjs <${Object.keys(ENVIRONMENTS).join('|')}>`);
if (!process.env.CLOUDFLARE_API_TOKEN) setupBlocked('CLOUDFLARE_API_TOKEN is not set (see site/README.md, one-time setup)');
const account = pinnedAccount();
if (account.blocked) setupBlocked(account.blocked);
if (FORBIDDEN_ACCOUNTS.has(account.pinned)) setupBlocked(`account ${account.pinned} belongs to another project; Butterlu needs its own`);
process.env.CLOUDFLARE_ACCOUNT_ID = account.pinned;
const blocked = env.precondition();
if (blocked) fail(blocked);

run('npm', ['run', env.check]);
const url = env.deploy();
if (!url) fail('wrangler reported no URL');

const health = await healthy(url);
let e2e = 'skipped';
if (health === 'ok') {
  const res = spawnSync('npx', ['e2e', 'run'], { stdio: 'inherit', env: { ...process.env, E2E_BASE_URL: url, E2E_ENVIRONMENT: name } });
  e2e = res.status === 0 ? 'passed' : 'failed';
}

const summary = { env: name, url, commit: git('rev-parse', '--short', 'HEAD'), health, e2e };
console.log(`deploy-summary ${JSON.stringify(summary)}`);
if (health === 'unhealthy' || e2e === 'failed' || (env.mustReach && health !== 'ok')) process.exit(1);

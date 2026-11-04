#!/usr/bin/env node
// One-time Google Drive setup for the frame MCP. The owner runs this on their
// own computer, once per environment (stage first, production later):
//
//   node scripts/google-setup.mjs --env stage --client-file ~/Downloads/client_secret_XXXX.json
//
// What it does:
//   1. Opens Google's sign-in page in the browser. Sign in with the Google
//      account whose Drive should hold the print files and allow access. The
//      only permission asked is drive.file: the server can see and change only
//      the files and folders it made itself, nothing else in the Drive.
//   2. Makes (or reuses) a folder for print PDFs with a "Proofs" folder inside:
//      "Butterlu print files" for production, "Butterlu print files (stage)" for
//      stage, so test renders never land beside real orders.
//   3. Stores the sign-in and the folder ids as secrets on that environment's
//      Worker with wrangler (needs `npx wrangler login` to the Butterlu account
//      first). Nothing is printed or written to the repo.
//
// Options:
//   --env stage|production   which Worker to set up (default stage)
//   --client-file <path>     the OAuth client JSON downloaded from Google Cloud
//                            (a "Desktop app" client)
//   --mcp-token              also make a new MCP_TOKEN for this Worker, set it,
//                            and show it once so it can go in the MCP client
//   --dry-run                do everything except set the Worker secrets
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const appDir = fileURLToPath(new URL('..', import.meta.url));
const { values: args } = parseArgs({
  options: {
    env: { type: 'string', default: 'stage' },
    'client-file': { type: 'string' },
    'mcp-token': { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    'no-browser': { type: 'boolean', default: false },
    // Tests only: a local stand-in for Google's endpoints.
    'google-base': { type: 'string' },
  },
});

const die = (msg) => {
  console.error(`google-setup: ${msg}`);
  process.exit(1);
};

const WORKERS = { stage: { name: 'butterlu-frame-mcp-stage', envFlag: '--env=' }, production: { name: 'butterlu-frame-mcp', envFlag: '--env=production' } };
const target = WORKERS[args.env];
if (!target) die('--env must be stage or production');
if (!args['client-file']) die('--client-file is required: the OAuth client JSON from Google Cloud (see apps/frame-mcp/README.md, Google Drive setup)');

const clientJson = JSON.parse(fs.readFileSync(args['client-file'].replace(/^~(?=\/)/, os.homedir()), 'utf8'));
const client = clientJson.installed ?? clientJson.web;
if (!client?.client_id || !client?.client_secret) die('that file has no client_id and client_secret; download the JSON of a "Desktop app" OAuth client');
if (!clientJson.installed) console.warn('google-setup: this is not a "Desktop app" client; the sign-in may refuse the local redirect.');

const base = args['google-base']?.replace(/\/+$/, '');
if (base && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) die('--google-base is for local tests only (http://127.0.0.1:<port>)');
const endpoints = base
  ? { auth: `${base}/auth`, token: `${base}/token`, api: `${base}/drive/v3` }
  : { auth: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', api: 'https://www.googleapis.com/drive/v3' };
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

// 1. Sign in: loopback redirect with PKCE (Google's flow for desktop apps).
async function signIn() {
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state = randomBytes(16).toString('hex');

  let finish;
  const done = new Promise((resolve, reject) => (finish = { resolve, reject }));
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname !== '/callback') return res.writeHead(404).end();
    const ok = url.searchParams.get('state') === state && url.searchParams.get('code');
    res.writeHead(ok ? 200 : 400, { 'content-type': 'text/plain' });
    res.end(ok ? 'Signed in. You can close this tab and go back to the terminal.' : 'Sign-in did not finish. Go back to the terminal.');
    if (ok) finish.resolve(url.searchParams.get('code'));
    else finish.reject(new Error(url.searchParams.get('error') ?? 'state mismatch'));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const redirectUri = `http://127.0.0.1:${server.address().port}/callback`;

  const authUrl = new URL(endpoints.auth);
  authUrl.search = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();

  console.log(`\nSign in to Google in your browser. If it doesn't open, paste this address:\n\n${authUrl}\n`);
  if (!args['no-browser']) {
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    // Detached, so a slow opener never stalls the local server waiting for Google's redirect.
    spawn(opener, [authUrl.toString()], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  }

  const timeout = setTimeout(() => finish.reject(new Error('timed out after 5 minutes')), 5 * 60_000);
  try {
    const code = await done;
    const res = await fetch(endpoints.token, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        client_id: client.client_id,
        client_secret: client.client_secret,
        redirect_uri: redirectUri,
      }),
    });
    const body = await res.json();
    if (!res.ok || !body.refresh_token) die(`Google did not return a refresh token (${res.status} ${body.error ?? ''}). Rerun; if it repeats, remove the app at myaccount.google.com/permissions and rerun.`);
    if (body.scope && !body.scope.split(' ').includes(SCOPE)) die('Drive access was not granted. Rerun and tick the Drive box on the consent screen.');
    return { refreshToken: body.refresh_token, accessToken: body.access_token };
  } finally {
    clearTimeout(timeout);
    server.close();
  }
}

// 2. Folders, made by this app so the drive.file scope can write to them.
async function drive(accessToken, method, pathAndQuery, json) {
  const res = await fetch(`${endpoints.api}${pathAndQuery}`, {
    method,
    headers: { authorization: `Bearer ${accessToken}`, ...(json ? { 'content-type': 'application/json' } : {}) },
    body: json ? JSON.stringify(json) : undefined,
  });
  const body = await res.json();
  if (!res.ok) die(`Drive ${method} ${pathAndQuery.split('?')[0]} failed: ${res.status} ${body.error?.message ?? ''}`);
  return body;
}

async function folder(accessToken, name, parent) {
  const q = [`name = '${name.replace(/'/g, "\\'")}'`, "mimeType = 'application/vnd.google-apps.folder'", 'trashed = false', parent ? `'${parent}' in parents` : null]
    .filter(Boolean)
    .join(' and ');
  const found = await drive(accessToken, 'GET', `/files?${new URLSearchParams({ q, fields: 'files(id,name)', spaces: 'drive' })}`);
  if (found.files?.[0]) return { id: found.files[0].id, made: false };
  const made = await drive(accessToken, 'POST', '/files?fields=id', { name, mimeType: 'application/vnd.google-apps.folder', ...(parent ? { parents: [parent] } : {}) });
  return { id: made.id, made: true };
}

// 3. Worker secrets, through a 0600 temp file that is deleted straight after.
function setSecrets(secrets) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-mcp-secrets-'));
  const file = path.join(dir, 'secrets.json');
  try {
    fs.writeFileSync(file, JSON.stringify(secrets), { mode: 0o600 });
    execFileSync('npx', ['wrangler', 'secret', 'bulk', file, target.envFlag], { cwd: appDir, stdio: ['ignore', 'inherit', 'inherit'] });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const { refreshToken, accessToken } = await signIn();
console.log('Signed in.');

const printName = args.env === 'production' ? 'Butterlu print files' : 'Butterlu print files (stage)';
const print = await folder(accessToken, printName);
const proofs = await folder(accessToken, 'Proofs', print.id);
console.log(`${print.made ? 'Made' : 'Reusing'} the folder "${printName}", with "Proofs" inside: https://drive.google.com/drive/folders/${print.id}`);

const secrets = {
  GOOGLE_CLIENT_ID: client.client_id,
  GOOGLE_CLIENT_SECRET: client.client_secret,
  GOOGLE_REFRESH_TOKEN: refreshToken,
  DRIVE_FOLDER_ID: print.id,
  DRIVE_PROOF_FOLDER_ID: proofs.id,
};
const mcpToken = args['mcp-token'] ? randomBytes(32).toString('base64url') : undefined;
if (mcpToken) secrets.MCP_TOKEN = mcpToken;

if (args['dry-run']) {
  console.log(`Dry run: would set ${Object.keys(secrets).join(', ')} on ${target.name}.`);
} else {
  setSecrets(secrets);
  console.log(`Set ${Object.keys(secrets).join(', ')} on ${target.name}.`);
}

if (mcpToken && args['dry-run']) {
  console.log('Dry run: no MCP_TOKEN was set, so none is shown.');
} else if (mcpToken) {
  console.log(`\nNew MCP_TOKEN for ${target.name}, shown once. Put it in your MCP client as "Authorization: Bearer <token>"${args.env === 'stage' ? ', and as the GitHub stage environment secret FRAME_MCP_TOKEN so each stage deploy test-renders one frame' : ''}:\n\n${mcpToken}\n`);
}
console.log('Done. Share the folder with anyone who prints (Asli) from Google Drive as usual.');

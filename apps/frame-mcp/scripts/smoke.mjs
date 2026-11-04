#!/usr/bin/env node
// End-to-end check against `wrangler dev`, with the bundled assets freshly
// prepared and Google Drive replaced by scripts/mock-google.mjs, so it needs no
// Google account. Needs poppler (pdfinfo, pdftoppm). Leaves the proof PNG in
// --out for a human to look at.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { MOCK_CREDENTIALS, startMockGoogle } from './mock-google.mjs';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values: args } = parseArgs({ options: { out: { type: 'string', default: path.join(os.tmpdir(), 'frame-mcp-smoke') } } });
fs.mkdirSync(args.out, { recursive: true });
const state = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-mcp-state-'));

const freePort = () =>
  new Promise((resolve) => {
    const srv = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });

execFileSync('node', [path.join(appDir, 'scripts/prepare-assets.mjs')], { cwd: appDir, stdio: ['ignore', 'inherit', 'inherit'] });
const google = await startMockGoogle();

const port = await freePort();
const base = `http://127.0.0.1:${port}`;
// A throwaway token for this run only; the real one is a Worker secret.
const token = crypto.randomUUID();
const vars = { MCP_TOKEN: token, GOOGLE_API_BASE: google.base, ...MOCK_CREDENTIALS };
const varArgs = Object.entries(vars).flatMap(([k, v]) => ['--var', `${k}:${v}`]);
const dev = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--ip', '127.0.0.1', '--persist-to', state, ...varArgs], {
  cwd: appDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
});
let devLog = '';
dev.stdout.on('data', (d) => (devLog += d));
dev.stderr.on('data', (d) => (devLog += d));
const stop = () => {
  try {
    process.kill(-dev.pid, 'SIGTERM');
  } catch {}
  fs.rmSync(state, { recursive: true, force: true });
  google.close();
};

let nextId = 1;
async function rpc(method, params) {
  const res = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  });
  assert.equal(res.status, 200, `${method} -> HTTP ${res.status}`);
  const body = await res.text();
  const data = res.headers.get('content-type')?.includes('text/event-stream')
    ? body.split('\n').find((l) => l.startsWith('data: '))?.slice(6)
    : body;
  const msg = JSON.parse(data);
  assert.ok(!msg.error, `${method} -> ${JSON.stringify(msg.error)}`);
  return msg.result;
}
const callTool = async (name, args) => {
  const result = await rpc('tools/call', { name, arguments: args });
  return { isError: Boolean(result.isError), text: result.content[0].text };
};
const pageSizePt = (file) => {
  const m = execFileSync('pdfinfo', [file], { encoding: 'utf8' }).match(/Page size:\s+([\d.]+) x ([\d.]+) pts/);
  return { w: Number(m[1]), h: Number(m[2]) };
};

try {
  const deadline = Date.now() + 60_000;
  while (!/Ready on/.test(devLog)) {
    assert.ok(Date.now() < deadline, `wrangler dev did not start:\n${devLog}`);
    assert.equal(dev.exitCode, null, `wrangler dev exited:\n${devLog}`);
    await new Promise((r) => setTimeout(r, 250));
  }

  const health = await (await fetch(`${base}/health`)).json();
  assert.deepEqual(health, { ok: true, auth: 'set', storage: 'google-drive' });
  console.log('ok /health: auth set, storage google-drive');

  const { tools } = await rpc('tools/list');
  assert.deepEqual(tools.map((t) => t.name).sort(), ['list_options', 'plan_order', 'plan_site_order', 'render_frame']);
  console.log('ok tools/list: list_options, plan_order, plan_site_order, render_frame');

  const plan = JSON.parse((await callTool('plan_order', { personalization: 'I love my uncle Dale\nLove, Sammy', color: '25' })).text);
  assert.deepEqual(plan.lines.map((l) => [l.side, l.text]), [['top', 'I love my uncle Dale'], ['bottom', 'Love, Sammy']]);
  assert.equal(plan.background.backgroundId, 'black');
  assert.equal(plan.ready, true);
  console.log(`ok plan_order: ${plan.lines.length} lines placed, review: ${plan.needsReview.join(' ')}`);

  const options = JSON.parse((await callTool('list_options', {})).text);
  assert.equal(options.backgrounds.length, 44);
  console.log(`ok list_options: ${options.shapes.length} shapes, ${options.backgrounds.length} backgrounds, ${options.fonts.length} fonts`);

  const spec = {
    shape: 'rounded-rectangle',
    backgroundId: 'sage-stripes',
    sides: {
      top: { text: 'Aunt Sarah', fontId: 'great-vibes' },
      bottom: { text: 'The best aunt in the whole wide world', fontId: 'playfair-display-bold' },
      left: { text: 'EST. 2024', fontId: 'montserrat-semibold' },
      right: { text: 'Love you to the moon & back', fontId: 'great-vibes', color: '#7a1f3d' },
    },
  };
  const rendered = await callTool('render_frame', { ...spec, label: 'Etsy 3412: Aunt/Sarah' });
  assert.ok(!rendered.isError, rendered.text);
  const out = JSON.parse(rendered.text);
  assert.deepEqual(out.sides.map((s) => s.side).sort(), ['bottom', 'left', 'right', 'top']);
  console.log(`ok render_frame: ${out.sides.map((s) => `${s.side} ${s.sizePt}pt`).join(', ')}; ${out.warnings.length} warnings`);

  assert.equal(out.storage, 'google-drive');
  assert.match(out.printFile.name, /^\d{4}-\d{2}-\d{2} Etsy 3412 Aunt Sarah - print\.pdf$/);
  assert.match(out.proofFile.name, /^PROOF \d{4}-\d{2}-\d{2} Etsy 3412 Aunt Sarah - not for printing\.pdf$/);
  const uploads = [...google.files.values()];
  assert.deepEqual(uploads.map((f) => f.metadata.parents[0]).sort(), [MOCK_CREDENTIALS.DRIVE_PROOF_FOLDER_ID, MOCK_CREDENTIALS.DRIVE_FOLDER_ID].sort());
  assert.ok(uploads.every((f) => f.metadata.mimeType === 'application/pdf' && f.contentType === 'application/pdf'));
  console.log(`ok Drive upload: "${out.printFile.name}" to the print folder, the proof to the proof folder`);

  const shape = options.shapes.find((s) => s.id === spec.shape);
  const files = {};
  for (const variant of ['print', 'proof']) {
    const res = await fetch(out[`${variant}File`].url);
    assert.equal(res.status, 200, `${variant} PDF -> HTTP ${res.status}`);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    const bytes = Buffer.from(await res.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', `${variant} is not a PDF`);
    files[variant] = path.join(args.out, `${variant}.pdf`);
    fs.writeFileSync(files[variant], bytes);
    const size = pageSizePt(files[variant]);
    assert.ok(Math.abs(size.w - (shape.widthIn + 2 * options.bleedIn) * 72) < 0.01, `${variant} width ${size.w}pt`);
    assert.ok(Math.abs(size.h - (shape.heightIn + 2 * options.bleedIn) * 72) < 0.01, `${variant} height ${size.h}pt`);
    console.log(`ok ${variant} PDF in Drive: ${bytes.length} bytes, ${size.w} x ${size.h} pt`);
  }

  const bad = await callTool('render_frame', { ...spec, backgroundId: 'sage-stripe' });
  assert.ok(bad.isError && bad.text.includes('Valid ids: maroon-bows'), bad.text);
  console.log('ok unknown background id is refused with the valid ids');

  const gone = await fetch(`${base}/renders/${crypto.randomUUID()}/print.pdf`);
  assert.equal(gone.status, 404);
  console.log('ok nothing but /mcp and /health is served (no public asset or render paths)');
  const asset = await fetch(`${base}/backgrounds/blue-toile.jpg`);
  assert.equal(asset.status, 404, 'bundled backgrounds must not be public');

  const rpcBody = JSON.stringify({ jsonrpc: '2.0', id: 999, method: 'tools/list' });
  const mcpHeaders = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  const anon = await fetch(`${base}/mcp`, { method: 'POST', headers: mcpHeaders, body: rpcBody });
  assert.equal(anon.status, 401, 'a call without a token must be refused');
  const wrong = await fetch(`${base}/mcp`, { method: 'POST', headers: { ...mcpHeaders, authorization: 'Bearer wrong' }, body: rpcBody });
  assert.equal(wrong.status, 401, 'a call with the wrong token must be refused');
  console.log('ok /mcp refuses a missing or wrong token');

  const site = await callTool('plan_site_order', {
    metadata: { frame_shape: 'scalloped', frame_background: 'blue-toile', frame_top: JSON.stringify({ text: 'Promoted to Grandparents', fontId: 'great-vibes' }) },
  });
  assert.ok(!site.isError, site.text);
  assert.equal(JSON.parse(site.text).spec.sides.top.text, 'Promoted to Grandparents');
  console.log('ok plan_site_order turns Stripe metadata into a render_frame spec');

  execFileSync('pdftoppm', ['-png', '-r', '100', '-singlefile', files.proof, path.join(args.out, 'proof')]);
  console.log(`proof PNG for inspection: ${path.join(args.out, 'proof.png')}`);
} finally {
  stop();
}

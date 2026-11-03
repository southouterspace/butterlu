#!/usr/bin/env node
// End-to-end check against `wrangler dev` with a freshly seeded local R2.
// Needs poppler (pdfinfo, pdftoppm). Leaves the proof PNG in --out for a human to look at.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values: args } = parseArgs({ options: { out: { type: 'string', default: path.join(os.tmpdir(), 'frame-mcp-smoke') } } });
fs.mkdirSync(args.out, { recursive: true });
const state = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-mcp-r2-'));

const freePort = () =>
  new Promise((resolve) => {
    const srv = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });

execFileSync('node', [path.join(appDir, 'scripts/sync-assets.mjs'), '--persist-to', state], { cwd: appDir, stdio: ['ignore', 'inherit', 'ignore'] });

const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const dev = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--ip', '127.0.0.1', '--persist-to', state], {
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
};

let nextId = 1;
async function rpc(method, params) {
  const res = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
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

  const { tools } = await rpc('tools/list');
  assert.deepEqual(tools.map((t) => t.name).sort(), ['list_options', 'render_frame']);
  console.log('ok tools/list: list_options, render_frame');

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
  const rendered = await callTool('render_frame', spec);
  assert.ok(!rendered.isError, rendered.text);
  const out = JSON.parse(rendered.text);
  assert.deepEqual(out.sides.map((s) => s.side).sort(), ['bottom', 'left', 'right', 'top']);
  console.log(`ok render_frame: ${out.sides.map((s) => `${s.side} ${s.sizePt}pt`).join(', ')}; ${out.warnings.length} warnings`);

  const shape = options.shapes.find((s) => s.id === spec.shape);
  const files = {};
  for (const variant of ['print', 'proof']) {
    const res = await fetch(out[`${variant}Url`]);
    assert.equal(res.status, 200, `${variant} PDF -> HTTP ${res.status}`);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    const bytes = Buffer.from(await res.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', `${variant} is not a PDF`);
    files[variant] = path.join(args.out, `${variant}.pdf`);
    fs.writeFileSync(files[variant], bytes);
    const size = pageSizePt(files[variant]);
    assert.ok(Math.abs(size.w - (shape.widthIn + 2 * options.bleedIn) * 72) < 0.01, `${variant} width ${size.w}pt`);
    assert.ok(Math.abs(size.h - (shape.heightIn + 2 * options.bleedIn) * 72) < 0.01, `${variant} height ${size.h}pt`);
    console.log(`ok GET ${variant}.pdf: ${bytes.length} bytes, ${size.w} x ${size.h} pt`);
  }

  const bad = await callTool('render_frame', { ...spec, backgroundId: 'sage-stripe' });
  assert.ok(bad.isError && bad.text.includes('Valid ids: maroon-bows'), bad.text);
  console.log('ok unknown background id is refused with the valid ids');

  const missing = await fetch(`${base}/renders/${crypto.randomUUID()}/print.pdf`);
  assert.equal(missing.status, 404);
  console.log('ok unknown render id -> 404');

  execFileSync('pdftoppm', ['-png', '-r', '100', '-singlefile', files.proof, path.join(args.out, 'proof')]);
  console.log(`proof PNG for inspection: ${path.join(args.out, 'proof.png')}`);
} finally {
  stop();
}

#!/usr/bin/env node
// Renders one test frame through a deployed frame MCP and checks both PDFs were
// saved to Google Drive. The token comes from FRAME_MCP_TOKEN (the Worker's
// MCP_TOKEN secret) and is never printed.
//
//   FRAME_MCP_TOKEN=... node scripts/remote-check.mjs --url https://butterlu-frame-mcp-stage.butterlu.workers.dev --label "stage check"
//
// Each run adds one print PDF and one proof to that server's Drive folders, so
// point it at stage, whose folders are for tests.
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({ options: { url: { type: 'string' }, label: { type: 'string', default: 'remote check' } } });
assert.ok(args.url, '--url is required');
const token = process.env.FRAME_MCP_TOKEN;
assert.ok(token, 'FRAME_MCP_TOKEN is not set');

let nextId = 1;
async function rpc(method, params) {
  const res = await fetch(new URL('/mcp', args.url), {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
    signal: AbortSignal.timeout(60_000),
  });
  assert.equal(res.status, 200, `${method} -> HTTP ${res.status}`);
  const body = await res.text();
  const data = res.headers.get('content-type')?.includes('text/event-stream') ? body.split('\n').find((l) => l.startsWith('data: '))?.slice(6) : body;
  const msg = JSON.parse(data);
  assert.ok(!msg.error, `${method} -> ${JSON.stringify(msg.error)}`);
  return msg.result;
}

const { tools } = await rpc('tools/list');
assert.ok(tools.some((t) => t.name === 'render_frame'), 'render_frame is not listed');
console.log(`ok tools/list on ${args.url}: ${tools.map((t) => t.name).join(', ')}`);

const result = await rpc('tools/call', {
  name: 'render_frame',
  arguments: {
    shape: 'scalloped',
    backgroundId: 'blue-toile',
    label: args.label,
    sides: { top: { text: 'Test print', fontId: 'great-vibes' }, bottom: { text: 'Not an order', fontId: 'montserrat-semibold' } },
  },
});
assert.ok(!result.isError, `render_frame failed: ${result.content?.[0]?.text}`);
const out = JSON.parse(result.content[0].text);
assert.equal(out.storage, 'google-drive');
for (const kind of ['printFile', 'proofFile']) {
  assert.match(out[kind].url, /^https:\/\/drive\.google\.com\//, `${kind} is not a Drive link`);
}
console.log(`ok render_frame saved "${out.printFile.name}" and its proof to Google Drive`);

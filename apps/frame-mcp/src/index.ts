import { createMcpHandler } from 'agents/mcp/server';
import { renderKey } from './assets';
import { authorizeMcpRequest } from './auth';
import type { Env } from './env';
import { createServer } from './server';

const RENDER_PATH = /^\/renders\/([0-9a-f-]{36})\/(proof|print)\.pdf$/;

async function serveRender(env: Env, id: string, variant: 'proof' | 'print') {
  const obj = await env.RENDERS.get(renderKey(id, variant));
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="frame-${id}-${variant}.pdf"`,
      'cache-control': 'private, max-age=86400',
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const render = url.pathname.match(RENDER_PATH);
    if (render && request.method === 'GET') return serveRender(env, render[1]!, render[2] as 'proof' | 'print');

    if (url.pathname === '/mcp') {
      const refused = authorizeMcpRequest(request, env);
      if (refused) return refused;
      return createMcpHandler(() => createServer(env, url.origin))(request, env, ctx);
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

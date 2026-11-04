import { createMcpHandler } from 'agents/mcp/server';
import { authorizeMcpRequest } from './auth';
import type { Env } from './env';
import { createServer } from './server';
import { renderStore } from './storage';

/**
 * Public and cheap: says whether the server is set up, naming any missing
 * secrets but never their values, and makes no call to Google. The deploy
 * script waits on it.
 */
function health(env: Env) {
  const store = renderStore(env);
  return Response.json(
    {
      ok: true,
      auth: env.MCP_TOKEN?.trim() ? 'set' : 'missing MCP_TOKEN',
      storage: store.ok ? store.store.name : 'not-configured',
      ...(store.ok ? {} : { missing: store.missing }),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/health' && request.method === 'GET') return health(env);

    if (url.pathname === '/mcp') {
      const refused = authorizeMcpRequest(request, env);
      if (refused) return refused;
      return createMcpHandler(() => createServer(env))(request, env, ctx);
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

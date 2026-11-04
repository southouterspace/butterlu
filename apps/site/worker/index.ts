import { checkKey, createCheckout } from './checkout';
import type { Env } from './env';
import { handleEvent } from './events';
import { serveMedia } from './media';
import { handleWebhook } from './webhook';

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    const method = request.method;
    if (pathname === '/api/health') return Response.json({ ok: true });
    if (pathname === '/api/e' && method === 'POST') return handleEvent(request, env);
    if (pathname === '/api/checkout' && method === 'POST') return createCheckout(request, env);
    if (pathname === '/api/checkout/status' && method === 'GET') {
      const key = checkKey(env);
      return Response.json(key.ok ? { enabled: true, mode: key.mode } : { enabled: false, reason: key.error });
    }
    if (pathname === '/api/stripe/webhook' && method === 'POST') return handleWebhook(request, env);
    if (pathname.startsWith('/media/') && (method === 'GET' || method === 'HEAD')) return serveMedia(request, env);
    if (pathname.startsWith('/api/')) return Response.json({ error: 'not found' }, { status: 404 });
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

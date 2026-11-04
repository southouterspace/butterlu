import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nDisallow: /cart\nDisallow: /checkout\nDisallow: /api/\n\nSitemap: ${new URL('/sitemap.xml', site)}\n`, {
    headers: { 'content-type': 'text/plain' },
  });

import type { APIRoute } from 'astro';

// /cart and /checkout are not disallowed: they carry noindex, and a crawler has to
// fetch a page to see its noindex. /api/ answers JSON only. /admin/ is the private order list.

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nDisallow: /api/\nDisallow: /admin\n\nSitemap: ${new URL('/sitemap.xml', site)}\n`, {
    headers: { 'content-type': 'text/plain' },
  });

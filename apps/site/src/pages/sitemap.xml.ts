import type { APIRoute } from 'astro';
import { COLLECTIONS, PRODUCTS } from '../catalog/products';

export const GET: APIRoute = ({ site }) => {
  const paths = ['/', '/collections/all', ...COLLECTIONS.map((c) => `/collections/${c.handle}`), ...PRODUCTS.map((p) => `/products/${p.handle}`), '/pages/about', '/pages/faq', '/pages/shipping-returns'];
  const urls = paths.map((p) => `  <url><loc>${new URL(p, site)}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'content-type': 'application/xml' },
  });
};

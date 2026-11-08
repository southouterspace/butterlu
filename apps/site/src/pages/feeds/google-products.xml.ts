// Google Merchant Center product feed (RSS 2.0 with the g: namespace), built with the
// site. Merchant Center fetches it on a schedule once the owner adds it as a data source:
// https://www.butterlu.com/feeds/google-products.xml. Butterlu sells two frames; each
// design page is a variant of one of them, so items share item_group_id with their frame
// and differ by pattern (the design). Items share material, size, price and shipping.
// docs/12-serp-leadership.md §3.1.
import type { APIRoute } from 'astro';
import { CURRENCY, PRODUCTS, SHOP, frameFor, isFrame } from '../../catalog/products';
import { tagsFor } from '../../catalog/taxonomy';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tag = (name: string, value: string | number) => `      <g:${name}>${esc(String(value))}</g:${name}>`;

export const GET: APIRoute = ({ site }) => {
  const items = PRODUCTS.map((p) => {
    const url = new URL(`/products/${p.handle}`, site).href;
    return [
      '    <item>',
      tag('id', p.handle),
      tag('title', p.seoTitle),
      tag('description', `${p.seoDescription} ${SHOP.photoNote}`),
      tag('link', url),
      tag('image_link', new URL(`/products/${p.handle}.jpg`, site).href),
      tag('availability', 'in_stock'),
      tag('price', `${(p.priceCents / 100).toFixed(2)} ${CURRENCY.toUpperCase()}`),
      tag('brand', SHOP.name),
      tag('condition', 'new'),
      tag('identifier_exists', 'no'),
      tag('google_product_category', 'Home & Garden > Decor > Picture Frames'),
      // The shop's own tree, frame first, then who it's for (docs/12 §4c).
      tag('product_type', ['Picture Frames', frameFor(p).name, tagsFor(p)?.group.label, tagsFor(p)?.for.label].filter(Boolean).join(' > ')),
      tag('material', 'Wood and glass'),
      tag('is_bundle', 'no'),
      // Made to order: the handling time matches SHOP.dispatch. Transit time is set in
      // Merchant Center's shipping settings, not here.
      tag('min_handling_time', 3),
      tag('max_handling_time', 5),
      '      <g:shipping>',
      '        <g:country>US</g:country>',
      `        <g:price>0.00 ${CURRENCY.toUpperCase()}</g:price>`,
      '      </g:shipping>',
      tag('item_group_id', frameFor(p).handle),
      tag('pattern', isFrame(p) ? 'Your own words' : p.name),
      tag('custom_label_0', p.clusterId),
      '    </item>',
    ].join('\n');
  });
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '  <channel>',
    `    <title>${esc(SHOP.name)}</title>`,
    `    <link>${esc(new URL('/', site).href)}</link>`,
    '    <description>Personalized picture frames, made to order.</description>',
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};

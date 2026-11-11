// A machine-readable catalog for agents and feeds: every page, its price and its
// preset FrameSpec, in the shape the print renderer (@butterlu/frame/pdf) takes.
import type { APIRoute } from 'astro';
import { COLLECTIONS, CURRENCY, PRODUCTS, SHOP } from '../catalog/products';

export const GET: APIRoute = ({ site }) =>
  Response.json({
    shop: SHOP,
    currency: CURRENCY,
    collections: COLLECTIONS.map(({ handle, name }) => ({ handle, name, url: new URL(`/collections/${handle}`, site).href })),
    products: PRODUCTS.map((p) => ({
      handle: p.handle,
      name: p.name,
      url: new URL(`/products/${p.handle}`, site).href,
      priceCents: p.priceCents,
      collections: p.collections,
      preset: p.preset,
      etsyListingId: p.etsyListingId,
    })),
  });

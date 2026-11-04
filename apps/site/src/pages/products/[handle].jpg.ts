// /products/<handle>.jpg: the preset frame as a 1200 px square JPEG, drawn at
// build time. Used as the Product markup image and og:image until real photos
// exist for a product (then the first photo leads and this stays as a second).
import type { APIRoute, GetStaticPaths } from 'astro';
import { PRODUCTS, type Product } from '../../catalog/products';
import { frameJpeg } from '../../lib/frame-raster';

export const getStaticPaths = (() => PRODUCTS.map((product) => ({ params: { handle: product.handle }, props: { product } }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ product: Product }> = async ({ props }) =>
  new Response(new Uint8Array(await frameJpeg(props.product.preset)), { headers: { 'Content-Type': 'image/jpeg' } });

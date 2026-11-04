import { defineConfig } from 'astro/config';

// URL continuity with the Shopify store, per docs/07 "URL continuity":
// /products/<handle> must answer 200 without a trailing-slash redirect.
export default defineConfig({
  site: 'https://www.butterlu.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  compressHTML: true,
});

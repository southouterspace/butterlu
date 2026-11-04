import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// URL continuity with the Shopify store, per docs/07 "URL continuity":
// /products/<handle> must answer 200 without a trailing-slash redirect.
// UI: the shadcn/ui radix-luma look (preset b7ClQvqBE) on Tailwind v4, rendered as
// static Astro components. No UI framework ships to the browser: interactive parts
// use native elements (dialog, popover, radio, select, details) plus small scripts.
export default defineConfig({
  site: 'https://www.butterlu.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  compressHTML: true,
  vite: { plugins: [tailwindcss()] },
});

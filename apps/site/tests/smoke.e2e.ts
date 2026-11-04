import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('the home page renders the shop name', async ({ app, screen }) => {
  await app.open('/');
  await expect(screen.getByRole('heading', 'Butterlu Gifts')).toBeVisible();
});

test('an unknown path renders the 404 page with status 404', async ({ app, screen }) => {
  const res = await fetch(new URL('/products/does-not-exist', app.baseUrl));
  expect(res.status).toBe(404);
  await app.open('/products/does-not-exist');
  await expect(screen.getByRole('heading', 'Page not found')).toBeVisible();
});


test('the Worker answers /api/health ahead of static assets', async ({ app }) => {
  const res = await fetch(new URL('/api/health', app.baseUrl));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test('robots.txt lets crawlers reach noindex pages and blocks only the API', async ({ app }) => {
  const body = await (await fetch(new URL('/robots.txt', app.baseUrl))).text();
  expect(body.includes('Disallow: /api/')).toBe(true);
  expect(body.includes('Disallow: /cart')).toBe(false);
  expect(body.includes('Sitemap: https://www.butterlu.com/sitemap.xml')).toBe(true);
});

test('each product has a build-time JPEG for search and link previews', async ({ app }) => {
  const res = await fetch(new URL('/products/grandparent-pregnancy-announcement-frame.jpg', app.baseUrl));
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('image/jpeg');
  const html = await (await fetch(new URL('/products/grandparent-pregnancy-announcement-frame', app.baseUrl))).text();
  // In the Product markup's image list (real photos, once added, come first and lead og:image).
  expect(/"image":\[[^\]]*"https:\/\/www\.butterlu\.com\/products\/grandparent-pregnancy-announcement-frame\.jpg"/.test(html)).toBe(true);
  expect(html.includes('<meta property="og:image" content="https://www.butterlu.com/')).toBe(true);
});

test('product cards use the small background and defer those below the first row', async ({ app }) => {
  const html = await (await fetch(new URL('/collections/all', app.baseUrl))).text();
  expect(html.includes('/backgrounds/card/')).toBe(true);
  expect(/<image href="\/backgrounds\/[a-z-]+\.webp"/.test(html)).toBe(false);
  expect(html.includes('data-href="/backgrounds/card/')).toBe(true);
});

test('hashed build assets are cached for a year', async ({ app }) => {
  const html = await (await fetch(new URL('/', app.baseUrl))).text();
  const asset = html.match(/\/_astro\/[^"]+\.css/)?.[0];
  expect(Boolean(asset)).toBe(true);
  const res = await fetch(new URL(asset!, app.baseUrl));
  expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
});

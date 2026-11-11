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

test('collection and product pages show the shared questions; only the Questions page marks them up', async ({ app }) => {
  const get = async (path: string) => (await fetch(new URL(path, app.baseUrl))).text();
  const [collection, product, faq] = await Promise.all([get('/collections/godparent-frames'), get('/products/mimi-picture-frame'), get('/pages/faq')]);
  expect(collection.includes('"@type":"ItemList"')).toBe(true);
  const first = 'Will I see a proof before you make it?';
  for (const html of [collection, product]) {
    expect(/<h2 id="faq">Questions<\/h2>/.test(html)).toBe(true);
    expect(html.includes(first)).toBe(true);
    expect(html.includes('"@type":"FAQPage"')).toBe(false);
  }
  expect(faq.includes('"@type":"FAQPage"')).toBe(true);
  expect(faq.includes(`<h2>${first}</h2>`)).toBe(true);
});

test('the Merchant Center feed lists every product with price and free US shipping', async ({ app }) => {
  const [feed, catalog] = await Promise.all([
    fetch(new URL('/feeds/google-products.xml', app.baseUrl)).then((r) => r.text()),
    fetch(new URL('/products.json', app.baseUrl)).then((r) => r.json() as Promise<{ products: { handle: string }[] }>),
  ]);
  expect((feed.match(/<item>/g) ?? []).length).toBe(catalog.products.length);
  expect(feed.includes('<g:price>0.00 USD</g:price>')).toBe(true);
  expect(/<g:price>\d+\.\d{2} USD<\/g:price>/.test(feed)).toBe(true);
});

test('every page carries the shop-by menus, and filtered views keep the category canonical', async ({ app }) => {
  const html = await (await fetch(new URL('/collections/grandparent-frames?for=grandma', app.baseUrl))).text();
  expect(html.includes('popovertarget="menu-for"')).toBe(true);
  expect(html.includes('href="/collections/grandparent-frames?for=grandma"')).toBe(true);
  expect(html.includes('href="/collections/all?occasion=christmas"')).toBe(true);
  expect(/<link rel="canonical" href="https:\/\/www\.butterlu\.com\/collections\/grandparent-frames">/.test(html)).toBe(true);
});

test("Who It’s For uses Asli's labels and keeps weddings under Occasion", async ({ app }) => {
  const html = await (await fetch(new URL('/', app.baseUrl))).text();
  const menu = html.slice(html.indexOf('id="menu-for"'), html.indexOf('id="menu-occasion"'));
  expect(menu.includes('Pet Memorial Gifts')).toBe(true);
  expect(menu.includes('href="/collections/wedding-thank-you-frames?for=parents-of-the-couple"')).toBe(true);
  expect(menu.includes('Weddings')).toBe(false);
  expect(menu.includes('Couples')).toBe(false);
  const occasions = html.slice(html.indexOf('id="menu-occasion"'), html.indexOf('id="site-menu"'));
  expect(occasions.includes('href="/collections/wedding-thank-you-frames"')).toBe(true);
  const phone = html.slice(html.indexOf('id="site-menu"'));
  const tiles = html.slice(html.indexOf('id="for-who"'));
  for (const list of [phone.slice(0, phone.indexOf('Occasion')), tiles.slice(0, tiles.indexOf('Or by occasion'))]) {
    expect(list.includes('Pet Memorial Gifts')).toBe(true);
    expect(list.includes('Couples')).toBe(false);
    expect(list.includes('>Weddings<')).toBe(false);
  }
  // The Parents link filters the shared wedding page and keeps its canonical.
  const page = await (await fetch(new URL('/collections/wedding-thank-you-frames?for=parents-of-the-couple', app.baseUrl))).text();
  expect(page.includes('data-filter="for" data-value="parents-of-the-couple"')).toBe(true);
  expect(/<link rel="canonical" href="https:\/\/www\.butterlu\.com\/collections\/wedding-thank-you-frames">/.test(page)).toBe(true);
});

test('Shop All lists designs best selling first', async ({ app }) => {
  const html = await (await fetch(new URL('/collections/all', app.baseUrl))).text();
  const at = (h: string) => html.indexOf(`href="/products/${h}"`);
  const order = ['grandparent-pregnancy-announcement-frame', 'godmother-proposal-frame', 'personalized-grandma-frame', 'pet-memorial-frame'].map(at);
  expect(order.every((i) => i > 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
});

test('the editor screen points search at its product page and stays out of the sitemap', async ({ app }) => {
  const html = await (await fetch(new URL('/products/nana-picture-frame/personalize', app.baseUrl))).text();
  expect(html.includes('<link rel="canonical" href="https://www.butterlu.com/products/nana-picture-frame">')).toBe(true);
  expect(html.includes('data-page-type="personalize"')).toBe(true);
  const sitemap = await (await fetch(new URL('/sitemap.xml', app.baseUrl))).text();
  expect(sitemap.includes('/personalize<')).toBe(false);
  // Cards and the product page open the editor directly.
  const pdp = await (await fetch(new URL('/products/nana-picture-frame', app.baseUrl))).text();
  expect(pdp.includes('href="/products/nana-picture-frame/personalize"')).toBe(true);
});

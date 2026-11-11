import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

const PRODUCT = '/products/grandparent-pregnancy-announcement-frame';
const NAME = 'Grandparent pregnancy announcement frame';

test('the home page lists frames that link to their pages', async ({ app, screen }) => {
  await app.open('/');
  await expect(screen.getByRole('heading', 'Most loved designs')).toBeVisible();
  await expect(screen.getByRole('link', new RegExp(NAME)).first()).toBeVisible();
});

test('a category offers its designs, then a blank frame to create your own, and a wording idea fills the frame', async ({ app, screen }) => {
  await app.open('/collections/baby-frames');
  await expect(screen.getByRole('heading', 'Ready-made designs')).toBeVisible();
  await expect(screen.getByRole('heading', 'Create your own frame')).toBeVisible();
  await expect(screen.getByRole('link', 'Start your own frame')).toBeVisible();

  await app.open(PRODUCT);
  await screen.getByRole('button', /Grandparents/).first().click();
  await expect(screen.getByRole('status').getByText('Wording idea added. Edit any line to make it yours.')).toBeVisible();
  await screen.getByRole('button', 'Undo, bring my words back').click();
  await expect(screen.getByRole('status').getByText('Your words are back.')).toBeVisible();
});

test('shoppers can filter designs by who it is for, occasion and frame', async ({ app, screen }) => {
  // A menu link opens a category already filtered to one person.
  await app.open('/collections/grandparent-frames?for=grandpa');
  await expect(screen.getByRole('button', /^Grandpa/)).toHaveAttribute('aria-pressed', 'true');
  await expect(screen.getByRole('status').getByText(/^Showing \d+ of \d+ designs$/)).toBeVisible();
  await expect(screen.getByRole('link', /^Grandpa Christmas frame/)).toBeVisible();
  await expect(screen.getByRole('link', /^Mimi picture frame/)).toBeHidden();
  await screen.getByRole('button', 'Clear filters').click();
  await expect(screen.getByRole('link', /^Mimi picture frame/)).toBeVisible();

  // Shop all combines an occasion with a frame shape.
  await app.open('/collections/all?occasion=christmas');
  await expect(screen.getByRole('link', /^Gigi Christmas frame/)).toBeVisible();
  await screen.getByRole('button', /^Rounded/).click();
  await expect(screen.getByRole('link', /^Gigi Christmas frame/)).toBeHidden();
  await expect(screen.getByRole('link', /^Grandpa Christmas frame/)).toBeVisible();
});

test('the customizer previews new words and refuses a frame with none', async ({ app, screen }) => {
  await app.open(PRODUCT);
  const top = screen.getByRole('textbox', /^Top/);
  await top.fill('Best Nana Ever');
  await expect(screen.getByText('Best Nana Ever')).toBeVisible();

  for (const side of ['Top', 'Right', 'Bottom', 'Left']) await screen.getByRole('textbox', new RegExp(`^${side}`)).fill('');
  await expect(screen.getByRole('status').getByText('Add words to at least one side.')).toBeVisible();
  await expect(screen.getByRole('button', /^Add to cart/)).toBeDisabled();

  await screen.getByRole('button', 'Start over with our design').click();
  await expect(screen.getByRole('button', /^Add to cart/)).toBeEnabled();
});

// Stage runs with or without Stripe test keys, so these read the switch first.
const checkoutOn = async (baseUrl: string | URL | undefined) => (await (await fetch(new URL('/api/checkout/status', baseUrl))).json()) as { enabled: boolean; mode?: string };

test('a designed frame goes in the cart, and checkout says when it is off', async ({ app, screen }) => {
  await app.open(PRODUCT);
  await screen.getByRole('textbox', /^Top/).fill('Promoted to Nana');
  await screen.getByRole('button', /^Add to cart/).click();
  await expect(screen.getByText('Added to your cart.', { exact: false })).toBeVisible();

  await app.open('/cart');
  await expect(screen.getByRole('heading', NAME)).toBeVisible();
  await expect(screen.getByText('Top: "Promoted to Nana"', { exact: false })).toBeVisible();
  // With test keys on, a click leaves for Stripe; the API test below covers that path.
  if ((await checkoutOn(app.baseUrl)).enabled) return;
  await screen.getByRole('button', 'Check out').click();
  await expect(screen.getByText('Checkout is not switched on yet', { exact: false })).toBeVisible();
});

test('the checkout API is off without a Stripe key, and opens test-mode Stripe Checkout with one', async ({ app }) => {
  const status = await checkoutOn(app.baseUrl);
  const post = (body: unknown) =>
    fetch(new URL('/api/checkout', app.baseUrl), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!status.enabled) {
    expect((await post({ items: [] })).status).toBe(503);
    return;
  }
  // Never live from a test run.
  expect(status.mode).toBe('test');
  expect((await post({ items: [] })).status).toBe(400);
  const { products } = (await (await fetch(new URL('/products.json', app.baseUrl))).json()) as { products: { handle: string; preset: unknown }[] };
  const product = products[0]!;
  const res = await post({ fid: 'e2etest0000000002', items: [{ handle: product.handle, quantity: 1, design: product.preset }] });
  expect(res.status).toBe(200);
  const data = (await res.json()) as { url?: string; mode?: string };
  expect(data.mode).toBe('test');
  expect(data.url).toContain('https://checkout.stripe.com/');
});

test('the funnel beacon takes known events and ignores the rest', async ({ app }) => {
  const send = (body: unknown) =>
    // A test user agent, so the report counts this as a bot, not a shopper.
    fetch(new URL('/api/e', app.baseUrl), { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'butterlu-e2e-bot' }, body: JSON.stringify(body) });
  expect((await send({ n: 'view', p: 'home', f: 'e2etest0000000001' })).status).toBe(204);
  expect((await send({ n: 'order_paid' })).status).toBe(204);
  expect((await fetch(new URL('/api/e', app.baseUrl), { method: 'POST', body: 'nope' })).status).toBe(400);
});

test('old URLs redirect to the new pages', async ({ app }) => {
  const res = await fetch(new URL('/products', app.baseUrl), { redirect: 'manual' });
  expect(res.status).toBe(301);
  expect(res.headers.get('location')).toContain('/collections/all');
});

test('the order list is private: no sign-in, no orders', async ({ app }) => {
  const res = await fetch(new URL('/admin/orders', app.baseUrl));
  // 401 asks for the password; 404 means the list isn't switched on here.
  expect([401, 404].includes(res.status)).toBe(true);
  expect((await res.text()).includes('session_id')).toBe(false);
  const post = await fetch(new URL('/admin/orders/cs_test_x', app.baseUrl), { method: 'POST', body: new URLSearchParams({ status: 'shipped' }) });
  expect([401, 404].includes(post.status)).toBe(true);
});

test('a ready-made design goes into the cart as shown in one tap', async ({ app, screen }) => {
  await app.open('/collections/grandparent-frames');
  await screen.getByRole('button', 'Add to cart: Nana picture frame, as shown').click();
  await expect(screen.getByRole('status').getByText(/^Added to your cart/)).toBeVisible();
  await app.open('/cart');
  await expect(screen.getByRole('heading', 'Nana picture frame')).toBeVisible();
  await expect(screen.getByText('Top: "I Love My Nana"', { exact: false })).toBeVisible();
});

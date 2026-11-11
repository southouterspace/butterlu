import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { designFromMetadata, designToMetadata } from '@butterlu/frame/design';
import { checkCart } from '../worker/checkout';
import { placementsAtBuild } from '../src/lib/layout-build';
import { DEFAULT_MAX_PT } from '@butterlu/frame';

const PRODUCT = '/products/grandparent-pregnancy-announcement-frame';
const EDITOR = `${PRODUCT}/personalize`;
const NAME = 'Grandparent Pregnancy Announcement Frame';

test('the home page lists frames that link to their pages', async ({ app, screen }) => {
  await app.open('/');
  await expect(screen.getByRole('heading', 'Most loved designs')).toBeVisible();
  await expect(screen.getByRole('link', new RegExp(NAME)).first()).toBeVisible();
});

test('the home page leads with the best seller, ready to personalize or add as shown', async ({ app, browser, screen }) => {
  await browser.setViewport({ width: 390, height: 844 });
  await app.open('/');
  await expect(screen.getByText('Best Seller', { exact: true })).toBeVisible();
  await expect(screen.getByRole('link', `Personalize: ${NAME}`).first()).toHaveAttribute('href', `${EDITOR}`);
  await screen.getByRole('button', `Add to Cart: ${NAME}, as shown`).first().click();
  await expect(screen.getByText('Added to your cart', { exact: true })).toBeVisible();
  // Empty photo slots: placeholders on stage and previews only, never in production,
  // where an empty slot (and a photo row with no photos) isn't shown at all.
  const placeholders = () => browser.evaluate(() => [...document.querySelectorAll('[data-placeholder]')].map((el) => el.getAttribute('aria-hidden')));
  if (process.env.BUTTERLU_PLACEHOLDERS === '1') {
    await expect(screen.getByRole('heading', 'In their home')).toBeVisible();
    expect((await placeholders()).every((a) => a === 'true')).toBe(true);
  } else {
    expect(await placeholders()).toEqual([]);
    await app.open('/products/mimi-picture-frame');
    expect(await placeholders()).toEqual([]);
  }
});

test('a category offers its designs, then a blank frame to create your own, and a wording idea fills the frame', async ({ app, screen }) => {
  await app.open('/collections/baby-frames');
  // Title, intro, filter row, then the grid: no heading between the filters and the designs.
  await expect(screen.getByRole('heading', 'Ready-made designs')).toHaveCount(0);
  await expect(screen.getByRole('button', 'Filter')).toBeVisible();
  await expect(screen.getByRole('heading', 'Create your own frame')).toBeVisible();
  await expect(screen.getByRole('link', 'Start Your Own Frame')).toBeVisible();

  await app.open(EDITOR);
  await screen.getByRole('button', /Grandparents/).first().click();
  await expect(screen.getByRole('status').getByText('Wording idea added. Edit any line to make it yours.')).toBeVisible();
  await screen.getByRole('button', 'Undo, Bring My Words Back').click();
  await expect(screen.getByRole('status').getByText('Your words are back.')).toBeVisible();
});

test('shoppers can filter designs by who it is for and occasion', async ({ app, screen }) => {
  // A menu link opens a category already filtered to one person.
  await app.open('/collections/grandparent-frames?for=grandpa');
  await expect(screen.getByRole('button', 'Filter, 1 selected')).toBeVisible();
  await expect(screen.getByRole('status').getByText(/^Showing \d+ of \d+ designs$/)).toBeVisible();
  await expect(screen.getByRole('link', /^Grandpa Christmas Frame/)).toBeVisible();
  await expect(screen.getByRole('link', /^Mimi Picture Frame/)).toBeHidden();
  await screen.getByRole('button', 'Filter, 1 selected').click();
  await expect(screen.getByRole('button', /^Grandpa/)).toHaveAttribute('aria-pressed', 'true');
  await screen.getByRole('button', 'Close').click();
  await screen.getByRole('button', 'Clear Filters').click();
  await expect(screen.getByRole('link', /^Mimi Picture Frame/)).toBeVisible();

  // Shop all combines an occasion with who it's for. Shape is not a filter.
  await app.open('/collections/all?occasion=birthday');
  await expect(screen.getByRole('link', /^Godmother Baptism Frame/)).toBeVisible();
  await screen.getByRole('button', 'Filter, 1 selected').click();
  await screen.getByRole('button', /^Aunts & Uncles/).click();
  await expect(screen.getByRole('button', /^Rounded/)).toHaveCount(0);
  await screen.getByRole('button', /^Show \d+ Designs?$/).click();
  await expect(screen.getByRole('link', /^Godmother Baptism Frame/)).toBeHidden();
  await expect(screen.getByRole('link', /^Aunt & Uncle Picture Frame/)).toBeVisible();
});

test('on desktop, filters open in a drawer from the left and the designs come first', async ({ app, browser, screen }) => {
  await app.open('/collections/all');
  // No rows of chips over the grid; one Filter button opens the drawer.
  await expect(screen.getByRole('button', /^Godparents/)).toBeHidden();
  await screen.getByRole('button', 'Filter').click();
  await expect(screen.getByRole('dialog', 'Filter Designs')).toBeVisible();
  // It hugs the left edge and runs the full height, narrower than the page.
  const box = await browser.evaluate(async () => {
    const el = document.querySelector('[data-filter-sheet]')!;
    await Promise.all(el.getAnimations().map((a) => a.finished));
    const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), top: Math.round(r.top), width: r.width, height: Math.round(r.height), vw: innerWidth, vh: innerHeight };
  });
  expect(box.left).toBe(0);
  expect(box.top).toBe(0);
  expect(box.height).toBe(box.vh);
  expect(box.width).toBeLessThan(box.vw / 2);
  // Filtering is live behind the drawer.
  await screen.getByRole('button', /^Godparents/).click();
  await screen.getByRole('button', /^Show \d+ Designs?$/).click();
  await expect(screen.getByRole('dialog', 'Filter Designs')).toBeHidden();
  await expect(screen.getByRole('button', 'Filter, 1 selected')).toBeVisible();
  await expect(screen.getByRole('link', /^Godmother Baptism Frame/)).toBeVisible();
  await expect(screen.getByRole('link', /^Mimi Picture Frame/)).toBeHidden();
  // Close and Escape both shut it.
  await screen.getByRole('button', 'Filter, 1 selected').click();
  await screen.getByRole('button', 'Close').click();
  await expect(screen.getByRole('dialog', 'Filter Designs')).toBeHidden();
  await screen.getByRole('button', 'Filter, 1 selected').click();
  await browser.keyboard.press('Escape');
  await expect(screen.getByRole('dialog', 'Filter Designs')).toBeHidden();
});

test('on a phone, filters open in a sheet and the designs come first', async ({ app, browser, screen }) => {
  await browser.setViewport({ width: 390, height: 844 });
  try {
    await app.open('/collections/all');
    // Chips wait in the sheet; the grid is what shows.
    await expect(screen.getByRole('button', /^Godparents/)).toBeHidden();
    await screen.getByRole('button', 'Filter').click();
    await expect(screen.getByRole('dialog', 'Filter Designs')).toBeVisible();
    await screen.getByRole('button', /^Godparents/).click();
    // Filtering is live behind the sheet; the button says how many are left.
    await expect(screen.getByRole('button', /^Show \d+ Designs?$/)).toBeVisible();
    await screen.getByRole('button', /^Show \d+ Designs?$/).click();
    await expect(screen.getByRole('dialog', 'Filter Designs')).toBeHidden();
    await expect(screen.getByRole('button', 'Filter, 1 selected')).toBeVisible();
    await expect(screen.getByRole('link', /^Godmother Baptism Frame/)).toBeVisible();
    await expect(screen.getByRole('link', /^Mimi Picture Frame/)).toBeHidden();
    // Opening again, the sheet's Clear empties the filters; Escape closes it.
    await screen.getByRole('button', 'Filter, 1 selected').click();
    await screen.getByRole('button', 'Clear').click();
    await expect(screen.getByRole('button', /^Godparents/)).toHaveAttribute('aria-pressed', 'false');
    await browser.keyboard.press('Escape');
    await expect(screen.getByRole('dialog', 'Filter Designs')).toBeHidden();
    await expect(screen.getByRole('link', /^Mimi Picture Frame/)).toBeVisible();
  } finally {
    await browser.setViewport({ width: 1280, height: 800 });
  }
});

test('the customizer previews new words and refuses a frame with none', async ({ app, screen }) => {
  await app.open(EDITOR);
  const top = screen.getByRole('textbox', /^Top/);
  await top.fill('Best Nana Ever');
  await expect(screen.getByText('Best Nana Ever')).toBeVisible();

  // Sides the design leaves empty start folded; each opens with one tap.
  await expect(screen.getByRole('textbox', /^Right/)).toBeHidden();
  await screen.getByRole('button', 'Add Text to the Right Side').click();
  await expect(screen.getByRole('textbox', /^Right/)).toBeFocused();
  await expect(screen.getByRole('button', 'Add Text to the Right Side')).toBeHidden();
  await screen.getByRole('button', 'Add Text to the Left Side').click();
  for (const side of ['Top', 'Right', 'Bottom', 'Left']) await screen.getByRole('textbox', new RegExp(`^${side}`)).fill('');
  await expect(screen.getByRole('status').getByText('Add words to at least one side.')).toBeVisible();
  await expect(screen.getByRole('button', /^Add to Cart/)).toBeDisabled();

  await screen.getByRole('button', 'Start Over with Our Design').click();
  await expect(screen.getByRole('button', /^Add to Cart/)).toBeEnabled();
  // Starting over folds the empty sides away again.
  await expect(screen.getByRole('textbox', /^Right/)).toBeHidden();
  await expect(screen.getByRole('button', 'Add Text to the Right Side')).toBeVisible();
});

// Stage runs with or without Stripe test keys, so these read the switch first.
const checkoutOn = async (baseUrl: string | URL | undefined) => (await (await fetch(new URL('/api/checkout/status', baseUrl))).json()) as { enabled: boolean; mode?: string };

test('a designed frame goes in the cart, and checkout says when it is off', async ({ app, screen }) => {
  await app.open(EDITOR);
  await screen.getByRole('textbox', /^Top/).fill('Promoted to Nana');
  await screen.getByRole('button', /^Add to Cart/).click();
  await expect(screen.getByText('Added to your cart.', { exact: false })).toBeVisible();
  // The shopper stays in the editor, one tap from checkout.
  await expect(screen.getByRole('link', 'View Cart & Check Out')).toBeVisible();
  await expect(screen.getByRole('button', /^Add to Cart/)).toBeHidden();

  await app.open('/cart');
  await expect(screen.getByRole('heading', NAME)).toBeVisible();
  await expect(screen.getByText('Top: "Promoted to Nana"', { exact: false })).toBeVisible();
  // With test keys on, a click leaves for Stripe; the API test below covers that path.
  if ((await checkoutOn(app.baseUrl)).enabled) return;
  await screen.getByRole('button', 'Check Out').click();
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

test('the store editor and its API are private too', async ({ app }) => {
  // Encoded spellings must not reach the built page around the Worker's sign-in either.
  for (const path of ['/admin/catalog', '/admin/catalog.html', '/api/admin/catalog', '/%61dmin/catalog', '/admin%2Fcatalog', '/ADMIN/catalog']) {
    const res = await fetch(new URL(path, app.baseUrl));
    expect([401, 404].includes(res.status)).toBe(true);
    expect((await res.text()).includes('Store admin')).toBe(false);
  }
  const put = await fetch(new URL('/api/admin/templates/x', app.baseUrl), { method: 'PUT', body: '{}', headers: { 'content-type': 'application/json' } });
  expect([401, 404].includes(put.status)).toBe(true);
});

test('a ready-made design goes into the cart as shown in one tap', async ({ app, screen }) => {
  await app.open('/collections/grandparent-frames');
  // Every card offers both, even a design that prints example names (owner, 2026-11-11).
  await expect(screen.getByRole('button', 'Add to Cart: Mimi Picture Frame, as shown')).toBeVisible();
  await expect(screen.getByRole('link', 'Personalize: Mimi Picture Frame')).toBeVisible();
  await screen.getByRole('button', 'Add to Cart: Nana Picture Frame, as shown').click();
  // A toast confirms it, with the way to the cart.
  await expect(screen.getByText('Added to your cart', { exact: true })).toBeVisible();
  await expect(screen.getByRole('link', 'View Cart')).toHaveAttribute('href', '/cart');
  // Screen readers hear the message, not the toast's buttons.
  await expect(screen.getByRole('status').getByText('Added to your cart. Nana Picture Frame')).toBeAttached();
  await app.open('/cart');
  await expect(screen.getByRole('heading', 'Nana Picture Frame')).toBeVisible();
  // A line left as designed keeps the cart simple: no shape, background or words list.
  await expect(screen.getByText('Top: "I Love My Nana"', { exact: false })).toBeHidden();
});

test('the background can be made bigger and moved, from the keyboard, and the cart keeps it', async ({ app, screen }) => {
  await app.open(EDITOR);
  await screen.getByText('Background Size & Position').click();
  const size = screen.getByRole('slider', 'Size');
  const across = screen.getByRole('slider', 'Side to Side');
  // At its smallest the sheet just fills the frame's width, so it can't move sideways yet.
  await expect(across).toBeDisabled();
  await expect(screen.getByText('Make it bigger first to move it side to side.')).toBeVisible();

  await size.press('End');
  await expect(size).toHaveAttribute('aria-valuetext', '200 percent');
  await expect(across).toBeEnabled();
  await across.press('Home');
  await expect(across).toHaveAttribute('aria-valuetext', '100 percent toward the left');
  await expect(screen.getByText('Zoomed to 200%, toward the left')).toBeVisible();

  await screen.getByRole('button', /^Add to Cart/).click();
  await expect(screen.getByText('Added to your cart.', { exact: false })).toBeVisible();
  await screen.getByRole('button', 'Reset Size & Position').click();
  await expect(screen.getByRole('status').getByText('Background size and position reset.')).toBeVisible();
  await expect(size).toHaveAttribute('aria-valuetext', '100 percent');
  await expect(screen.getByRole('button', 'Reset Size & Position')).toBeHidden();

  await app.open('/cart');
  await expect(screen.getByText('(zoomed to 200%, toward the left)', { exact: false })).toBeVisible();
});

test('the product page sells the design as shown or opens the editor', async ({ app, screen }) => {
  await app.open('/products/nana-picture-frame');
  await screen.getByRole('button', 'Add to Cart').click();
  await expect(screen.getByText('Added to your cart', { exact: true })).toBeVisible();

  // A design with example names says what "as shown" prints.
  await app.open('/products/mimi-picture-frame');
  await expect(screen.getByRole('button', 'Add to Cart')).toBeVisible();
  await expect(screen.getByText('As shown, it prints the example names.')).toBeVisible();
  // Added as shown, the cart line spells out the words and says they are examples.
  await screen.getByRole('button', 'Add to Cart').click();
  await expect(screen.getByText('Added to your cart', { exact: true })).toBeVisible();
  await app.open('/cart');
  await expect(screen.getByText('As shown, it prints the example names.')).toBeVisible();
  await expect(screen.getByRole('link', 'Personalize')).toHaveAttribute('href', '/products/mimi-picture-frame/personalize');
  await app.open('/products/mimi-picture-frame');
  await screen.getByRole('link', 'Personalize').click();
  await expect(screen.getByRole('heading', 'Mimi Picture Frame')).toBeVisible();
  await expect(screen.getByText('Example names: swap in yours.')).toBeVisible();
  await expect(screen.getByRole('textbox', /^Bottom/)).toBeVisible();
});

test('the editor marks example names until they are swapped, and keeps a draft', async ({ app, screen }) => {
  await app.open('/products/mimi-picture-frame/personalize');
  await expect(screen.getByText('Example names: swap in yours.')).toBeVisible();
  await screen.getByRole('textbox', /^Bottom/).fill('Jo and Lee');
  await expect(screen.getByText('Example names: swap in yours.')).toBeHidden();
  // Typing an example name back in is the shopper's own choice: no note.
  await screen.getByRole('textbox', /^Top/).fill('Love, Ava');
  await expect(screen.getByText(/swap in yours/)).toBeHidden();
  await screen.getByRole('textbox', /^Top/).fill('Mimi’s Little Loves');

  // Leaving and coming back finds the words where they were.
  await app.open('/products/mimi-picture-frame/personalize');
  await expect(screen.getByRole('status').getByText('Your changes from last time are back.')).toBeVisible();
  await expect(screen.getByRole('textbox', /^Bottom/)).toHaveValue('Jo and Lee');
  await screen.getByRole('button', 'Start Over with Our Design').click();
  await app.open('/products/mimi-picture-frame/personalize');
  await expect(screen.getByRole('textbox', /^Bottom/)).toHaveValue('Ava, Noah and Mia');
});

// Order accuracy: on a phone, each choice in the editor reaches the cart summary and the
// checkout request unchanged, and the server's checks and the order record keep it as is.
test('on a phone, every choice in the editor is what the order prints', async ({ app, browser, screen }) => {
  await browser.setViewport({ width: 390, height: 844 });
  let posted: { items?: { handle: string; quantity: number; design: unknown }[] } | undefined;
  await browser.route(/\/api\/checkout$/, async (route) => {
    posted = JSON.parse(route.request.postData ?? '{}');
    await route.fulfill({ status: 503, json: { error: 'Held by the test: nothing was charged.' } });
  });
  try {
    await app.open(EDITOR);
    await screen.getByRole('textbox', /^Top/).fill('Promoted to Nana & Pop');
    await screen.getByRole('button', 'Add Text to the Right Side').click();
    await screen.getByRole('textbox', /^Right/).fill('Est. 2027');
    await screen.getByRole('textbox', /^Bottom/).fill('See You in June');
    await screen.getByRole('button', 'Add Text to the Left Side').click();
    await screen.getByRole('textbox', /^Left/).fill('Love You Already');
    await expect(screen.getByText('See You in June')).toBeVisible();

    // Shoppers tap the visible label; the radio itself is visually hidden.
    await screen.getByText('Rounded', { exact: true }).click();
    await expect(screen.getByRole('radio', 'Rounded')).toBeChecked();

    // On a phone the backgrounds open in a sheet.
    await screen.getByRole('button', /^Background/).click();
    await expect(screen.getByRole('dialog', 'Background')).toBeVisible();
    // The swatch's radio is visually hidden, so choose it the way a keyboard does.
    await screen.getByRole('radio', 'Blue Toile').press('Space');
    await expect(screen.getByRole('radio', 'Blue Toile')).toBeChecked();
    await screen.getByRole('button', 'Done').click();
    await expect(screen.getByRole('dialog', 'Background')).toBeHidden();

    await screen.getByText('Background Size & Position').click();
    await screen.getByRole('button', 'Make bigger').click();
    await screen.getByRole('button', 'Make bigger').click();
    await expect(screen.getByRole('slider', 'Size')).toHaveAttribute('aria-valuetext', '120 percent');

    await screen.getByText('Fonts & Color').click();
    await screen.getByRole('combobox', 'Right Font').selectOption('Montserrat');
    await screen.getByRole('combobox', 'Text Color').selectOption('Navy');

    await screen.getByRole('button', /^Add to Cart/).click();
    await screen.getByRole('link', 'View Cart & Check Out').click();
    await expect(screen.getByRole('heading', NAME)).toBeVisible();
    await expect(
      screen.getByText('Rounded frame · Blue Toile (zoomed to 120%) · Top: "Promoted to Nana & Pop" · Right: "Est. 2027" · Bottom: "See You in June" · Left: "Love You Already"'),
    ).toBeVisible();

    await screen.getByRole('button', 'Check Out').click();
    await expect(screen.getByText('Held by the test: nothing was charged.')).toBeVisible();
    const navy = '#1f2f4d';
    const design = {
      shape: 'rounded-rectangle',
      backgroundId: 'blue-toile',
      sides: {
        top: { text: 'Promoted to Nana & Pop', fontId: 'great-vibes', color: navy },
        right: { text: 'Est. 2027', fontId: 'montserrat-semibold', color: navy },
        bottom: { text: 'See You in June', fontId: 'montserrat-semibold', color: navy },
        left: { text: 'Love You Already', fontId: 'playfair-display-bold', color: navy },
      },
      backgroundFit: { scale: 1.2, x: 0, y: 0 },
    };
    expect(posted?.items).toEqual([{ handle: 'grandparent-pregnancy-announcement-frame', quantity: 1, design }]);
    // The checkout Worker accepts it unchanged, and the paid order reads it back the same.
    const checked = checkCart(posted);
    expect(checked).toEqual({ ok: true, lines: [expect.objectContaining({ handle: 'grandparent-pregnancy-announcement-frame', quantity: 1, design })] });
    if (!checked.ok) return;
    expect(designFromMetadata(designToMetadata(checked.lines[0]!.design))).toEqual({ ok: true, spec: design });
  } finally {
    await browser.unroute(/\/api\/checkout$/);
    await browser.setViewport({ width: 1280, height: 800 });
  }
});

// Asli's order-accuracy cases: the same design twice, one changed; a long line; both
// apostrophes. The cart keeps the two apart, the words reach checkout exactly, and the
// preview fits each line at the size the print file uses.
test('two of one design, long lines and apostrophes print as previewed', async ({ app, browser, screen }) => {
  await browser.setViewport({ width: 390, height: 844 });
  const handle = 'mimi-picture-frame';
  let posted: unknown;
  await browser.route(/\/api\/checkout$/, async (route) => {
    posted = JSON.parse(route.request.postData ?? '{}');
    await route.fulfill({ status: 503, json: { error: 'Held by the test: nothing was charged.' } });
  });
  try {
    await app.open(`/products/${handle}`);
    await screen.getByRole('button', 'Add to Cart').click();
    await expect(screen.getByText('Added to your cart', { exact: true })).toBeVisible();

    await app.open(`/products/${handle}/personalize`);
    // Load the frame fonts before typing, so the browser measures with the real faces.
    await browser.evaluate(() =>
      Promise.all(['400 32px "Great Vibes"', '700 32px "Playfair Display"', '600 32px "Montserrat"'].map((f) => document.fonts.load(f))).then(() => true),
    );
    const long = "The O'Sullivan-Fitzgerald Grandkids Love You to the Moon!";
    // Both lines are long enough to be fitted by width, not capped at the largest size.
    const curly = 'Grandma Mimi’s Littlest Loves, Forever and Always';
    await screen.getByRole('textbox', /^Top/).fill(curly);
    await screen.getByRole('textbox', /^Bottom/).fill(long);
    await expect(screen.getByText(long)).toBeVisible();
    const preview = await browser.evaluate(() =>
      [...document.querySelectorAll('[data-preview] text')].map((t) => ({ text: t.textContent ?? '', size: Number(t.getAttribute('font-size')) })),
    );
    await screen.getByRole('button', /^Add to Cart/).click();
    await screen.getByRole('link', 'View Cart & Check Out').click();

    // Two lines of the same design, kept apart; removing the as-shown one leaves ours.
    await expect(screen.getByRole('heading', 'Mimi Picture Frame')).toHaveCount(2);
    await screen.getByRole('button', 'Remove').first().click();
    await expect(screen.getByRole('heading', 'Mimi Picture Frame')).toHaveCount(1);
    await expect(screen.getByText(`Bottom: "${long}"`, { exact: false })).toBeVisible();
    await expect(screen.getByText('As shown, it prints the example names.')).toBeHidden();

    await screen.getByRole('button', 'Check Out').click();
    await expect(screen.getByText('Held by the test: nothing was charged.')).toBeVisible();
    const checked = checkCart(posted);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    expect(checked.lines).toHaveLength(1);
    const spec = checked.lines[0]!.design;
    expect(spec.sides.top?.text).toBe(curly);
    expect(spec.sides.bottom?.text).toBe(long);

    // The print file fits with fontkit, the preview with the browser: same words, sizes within 4%.
    for (const p of placementsAtBuild(spec)) {
      const shown = preview.find((t) => t.text === p.text);
      expect(shown, `preview shows "${p.text}"`).toBeDefined();
      expect(p.sizePt).toBeLessThan(DEFAULT_MAX_PT);
      const printed = p.sizePt / 72;
      expect(Math.abs(shown!.size - printed) / printed).toBeLessThan(0.04);
    }
  } finally {
    await browser.unroute(/\/api\/checkout$/);
    await browser.setViewport({ width: 1280, height: 800 });
  }
});

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

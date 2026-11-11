import { expect, test } from 'bun:test';
import { ADMIN_SECTIONS, SITE_HOME } from '../src/admin/nav';
import { adminBar } from './admin';

test('the Orders page bar has every admin section, View site, and Sign out', () => {
  const html = adminBar('asli@example.com');
  for (const { href, label } of ADMIN_SECTIONS) {
    expect(html).toContain(`<a href="${href}"`);
    expect(html).toContain(`>${label}</a>`);
  }
  expect(html).toContain(`<a href="${SITE_HOME}">View site</a>`);
  expect(html).toContain('<a href="/admin/orders" aria-current="page">Orders</a>');
  expect(html.match(/aria-current/g)).toHaveLength(1);
  expect(html).toContain('action="/admin/sign-out"');
  expect(adminBar(null)).not.toContain('sign-out');
});

test('the sections cover the store editor and orders', () => {
  expect(ADMIN_SECTIONS.map((s) => s.label)).toEqual(['Designs', 'Categories', 'Shop by', 'Pages', 'Questions', 'Changes', 'Orders']);
});

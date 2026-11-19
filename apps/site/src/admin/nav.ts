// The admin's sections, shared by the store editor (app.ts, hash routes) and the
// server-rendered Orders page (worker/admin.ts), so both show the same nav.
export const ADMIN_SECTIONS = [
  { href: '/admin/catalog#/designs', label: 'Designs' },
  { href: '/admin/catalog#/categories', label: 'Categories' },
  { href: '/admin/catalog#/shop-by', label: 'Shop by' },
  { href: '/admin/catalog#/pages', label: 'Pages' },
  { href: '/admin/catalog#/questions', label: 'Questions' },
  { href: '/admin/catalog#/changes', label: 'Changes' },
  { href: '/admin/orders', label: 'Orders' },
] as const;

/** Where "View site" goes: the storefront home on whichever host the admin runs on. */
export const SITE_HOME = '/';

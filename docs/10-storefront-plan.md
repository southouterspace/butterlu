# 10 · Storefront plan and handoff

Status: **in progress on `claude/butterlu-storefront`**. Everything customer-facing here is a
**proposed default** until Asli confirms it. Gate G2 (`plans/decisions.json`) stays `proposed`.

## What the store is

A Shopify-shaped store, custom-built on the stack in docs/07: Astro static pages and a
small Worker on Cloudflare, Stripe Checkout for payment. It sells one configurable product,
the small frame, through search-intent pages that each preset it. That mirrors what works
on Etsy (docs/08): many listings for one frame, each worded for a recipient and occasion.

- **Two shapes:** scalloped and rounded rectangle (`packages/frame` SHAPES).
- **44 backgrounds:** the list in `assets/`, the updated set for the site.
- **Text on any side**, a font per side, an optional text colour. These are the frame MCP's
  FrameSpec rules (`packages/frame/src/design.ts`), so the site, checkout and print files
  share one rulebook.
- **Ships without a photo** and sells as designed. Changing the wording is optional.

## Catalog and page line-up

`apps/site/src/catalog/products.ts` is the one source of truth. It's plain TypeScript, so
pages, the checkout Worker and `scripts/storefront-lineup.mjs` all read the same prices.

- **19 product pages**, picked from the top-ranked frame clusters in `plans/clusters.json`.
  Each preset copies its look and wording from its best Etsy listing.
- **7 collections** plus `/collections/all`.
- `node scripts/storefront-lineup.mjs` writes the proposed line-up into
  `plans/decisions.json`. That's 94 rows: 19 built, and 75 whose old URLs redirect to the
  nearest built page or collection. Memorial pages and cheerful pages never redirect to
  each other.
- `apps/site/scripts/redirects.mjs` builds `public/_redirects` (256 rules) from
  `listing-map.json`, `decisions.json` and the old Shopify collections.
- Large frames, brag boards and other product types wait until their shapes and
  backgrounds are in the repo.

## Product page and personalization

`/products/<handle>` server-renders the preset preview, so the page reads right before any
script runs. The customizer (`Customizer.astro`, `scripts/customizer.ts`) does three things:

1. Reads the form into a FrameSpec and checks it with `parseDesign`.
2. Fits the text with `layoutFrame`, using the same safe zones and fitting rules as the
   print renderer. Glyphs are measured in a canvas in the browser and with fontkit at
   build time.
3. Redraws the SVG preview and warns when a side's text drops below the minimum size.

The cart is browser-only (localStorage `butterlu.cart.v1`). Each line is a handle,
quantity and FrameSpec.

## Checkout (Stripe, test mode only)

`POST /api/checkout` (`worker/checkout.ts`):

- Re-prices every line from the catalog and re-checks every design.
- Creates a Checkout Session over the REST API with free US shipping.
- Stores each line's design as product metadata: `frame_shape`, `frame_background` and
  `frame_<side>`. No database is needed yet.
- Refuses `sk_live_` and `rk_live_` keys unless `STRIPE_ALLOW_LIVE=true`. Only the owner
  turns that on.
- Returns 503 with a friendly message when `STRIPE_SECRET_KEY` is unset. The cart shows
  that message.
- `GET /api/checkout/status` reports whether checkout is on, and in which mode.

## Order flow into the frame MCP

Stripe `checkout.session.completed` → `POST /api/stripe/webhook`:

1. Verifies the HMAC signature with a 5-minute tolerance, using `STRIPE_WEBHOOK_SECRET`.
2. Fetches the line items, decodes each design and logs the order.
3. Next steps:
   - Write the order to D1 (`orders`, `order_lines`).
   - An agent calls the frame MCP: `plan_site_order` with the line's metadata, then
     `render_frame` for the print PDF.
   - The proof goes to Asli for review, then to print.

The frame MCP now requires a bearer token (`MCP_TOKEN`, fail-closed).

## Agent-run operations

- **Catalog updates:** an agent edits `products.ts`, reruns the line-up script and opens a
  PR. The preview is the review surface. Nothing reaches production without a merge and a
  Release.
- **Order handling:** the webhook queues the order, and an agent plans and renders it
  through the MCP. A human approves each proof until the fonts and backgrounds are final.
- **Customer messages:** an agent drafts replies (shipping, wording fixes) for approval.
  Sending uses Resend later, and only after the owner says yes.
- **Feeds for agents:** `/products.json` lists every page, price and preset in the
  FrameSpec shape `render_frame` takes.

## Defaults to confirm (customers will notice these)

- The 19-page line-up and 7 collections. No large frames or brag boards yet.
- Prices match Etsy ($35.95 or $37.95).
- Free US shipping, US addresses only.
- Made to order, ships in 3 to 5 business days.
- No returns on personalized items. Damaged or wrong frames are made right.
- Preset wording and brand voice on every page. All of it was written by the agent.
- The three fonts are placeholders until Asli's real font list arrives.
- Product description: "8.4 × 6.4 inch wood frame with glass and an easel back".
- Six text colours, plus "best for this background".
- Clean new URLs, with 301s from the old Shopify and Etsy-mapped URLs.

## Gaps

There's no Etsy review text and no per-listing sales data. G5 is blocked, and sales need
Etsy OAuth. The line-up ranks by favourites and listing counts instead.

## Owner steps before launch

- Enable R2 on the Butterlu Cloudflare account. The frame MCP needs it.
- Set the `MCP_TOKEN` secret on the frame MCP Worker.
- Set Stripe **test** keys on the site Worker: `STRIPE_SECRET_KEY` and
  `STRIPE_WEBHOOK_SECRET`. Point a test webhook at `/api/stripe/webhook`.
- Confirm the defaults above, then mark G2 decided.
- Later, and only on the owner's yes: live Stripe keys plus `STRIPE_ALLOW_LIVE`, the
  production deploy (a GitHub Release) and DNS.

## Handoff: what's left on this branch

Built and passing locally:

- the site build plus lint-dist (34 pages)
- `check:worker`
- worker unit tests (13)
- frame package tests
- frame MCP validate

Left to do:

1. e2e tests in `apps/site/tests/` for the store:
   - the home page lists frames
   - the product page preview updates when a side's text changes
   - add to cart, then the cart shows the line
   - checkout without a key shows the "not switched on" message
   - `POST /api/checkout` with an unknown handle is a 400
2. Run root `bun run validate` and fix anything it finds.
3. Push. In an environment with `CLOUDFLARE_API_TOKEN`, the site-gate hook deploys the
   branch Preview after the push. Otherwise use the repo's `deploy:preview` script.
   Never call wrangler deploy directly.
4. Open a **draft** PR (Before/After description) and subscribe to its activity.
5. Report back in the project thread with the PR link and preview URL.

Limits for whoever picks this up:

- Draft PR and preview deploy only.
- No merge to main, no GitHub Release, no production deploy, no DNS changes.
- No Stripe live mode or live payment links.
- No emails, and no Etsy posts.
- Nothing in Justin's or Asli's accounts changes without Justin's yes in the project
  thread.
- No secrets in the repo or in chat.

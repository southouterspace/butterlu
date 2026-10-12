# 07 — Replatform off Shopify onto Cloudflare and Stripe

An explanation, not a plan. It answers one question. Should Butterlu's off-Etsy web
presence leave Shopify for a store built on Cloudflare Workers and Stripe, run by an
agentic development loop where the owner sets the vision, reviews UX on preview URLs, and
keeps a backlog. The first goal is traffic.

Written 2026-10-11. Prices and product facts were checked against vendor documentation
that day. Everything marked *guess* is unmeasured.

## The short answer

Yes, move, but not for the reason in the brief. Cost is not the argument. Shopify Basic
is $39 a month ($29 billed yearly) and Cloudflare's Workers Paid plan is $5 a month, so
the saving is about $350 a year. Card fees are the same on both sides at 2.9% + 30¢.
At zero orders a year that saving decides nothing.

The real argument is that Shopify is the wrong shape for an agent-run store. Every hard
constraint in `CLAUDE.md` §3 exists because Shopify holds the state and the agent cannot
own it. Bulk edits have no undo. The connector cannot write the live theme. The 100
variant cap already truncates three products. There is no personalisation field. The
manifest-loop machinery in `docs/05` is scaffolding around a platform that does not keep
history. On Cloudflare the catalog is files in git, a change is a pull request, a pull
request gets a preview URL, and `git revert` is the undo. The agentic loop the brief
describes needs that shape. Shopify does not have it.

The second real argument is that a replatform does not create traffic. It makes the
things that create traffic cheap to ship. Keep those two facts apart or the project will
be judged on the wrong number.

## What creates traffic, and what the stack has to do with it

`docs/01` and `docs/03` established that butterlu.com is invisible in search because of
authority, not content. GiftsForYouNow ranks with 150 words and one review. Butterlu does
not rank with 477 words and no reviews. The one winnable territory is pet loss, where
small Shopify stores rank on collection pages. Those findings do not change with the
platform.

Four things move traffic for a store of this size. The table says which the stack
touches.

| Lever | Does the stack matter? | Why |
|---|---|---|
| Content: pet-loss collection pages with copy and FAQ, a blog with posts | Yes, a lot | On Shopify this is theme sections plus Admin API writes with no undo. In git it is Markdown files in a pull request. The agent can ship a page a day with the owner reviewing a preview on a phone. |
| Technical SEO: titles, meta, JSON-LD, 301s, Core Web Vitals, sitemap | Yes | On Shopify each of these is a separate loop (L1, L2) or a theme edit a human publishes. In a custom site they are code paths tested in CI. Cloudflare's edge gives the Core Web Vitals for free. |
| Reviews: fresh native reviews after delivery, `aggregateRating` markup | Partly | The native half of `docs/04` works on either stack. The Etsy import stays blocked on G5 on either stack. |
| Authority: backlinks, the 75,903 past Etsy buyers, Pinterest and TikTok | No | This is marketing, not engineering. Pinterest already sends as much as Google. A brand URL on the packing slip reaches every Etsy buyer; see the Etsy caveat below. |

The honest version of the traffic promise is this. The rebuild removes the engineering
cost from the first three rows. It does nothing for the fourth, and the fourth is the
largest unknown in the whole analysis because no backlink data was ever measured.

## Three options

| | A. Stay on Shopify, run Waves 0 to 3 | B. Hybrid: Cloudflare storefront, Shopify as backend via Storefront API | C. Cloudflare and Stripe, cancel Shopify |
|---|---|---|---|
| Platform cost per month | $39 | $39 + $5 | $5 to $10 (Workers Paid; D1, R2, Images within free allotments at this scale) |
| Card fees | 2.9% + 30¢ (Shopify Payments) | same | 2.9% + 30¢ (Stripe); Stripe Tax adds 0.5% per taxed transaction |
| Who owns product data | Shopify admin; agent writes via Admin API, no undo | Shopify admin; same problem, now behind a second API | Git. Pull request is the manifest, revert is the undo. |
| Undo for a bad bulk change | Manifest backup, per `docs/05` | Same | `git revert` |
| Theme or UI changes | Duplicate theme, human publishes | Agent owns the front end | Agent owns the front end |
| Personalisation input | Needs an app or line-item property theme work | Collected on the custom PDP, passed as cart attributes | Collected on the custom PDP, stored on the order |
| Variant limit | 100 per product (three products already truncated) | 100, inherited | None. Model options as options, not a variant matrix. |
| Checkout | Shopify checkout, unconfirmed end to end | Shopify checkout on a Shopify-managed subdomain (Shopify's docs require checkout in the same root domain as the storefront) | Stripe Checkout, hosted, with Link, Apple Pay, Google Pay, Stripe Tax |
| Back office for the owner | Shopify admin, shipping labels, tax | Shopify admin | Stripe Dashboard for payments and refunds; a small order list behind Cloudflare Access; labels bought by hand at this volume |
| Agentic commerce channels | Shopify Agentic Storefronts, on by default for eligible US merchants since 2026-03 (secondary sources) | Same | Stripe's seller path over ACP/UCP, US only, plus a product feed upload |
| Preview per pull request | No | Yes (Workers Builds) | Yes (Workers Builds) |
| Build effort before first sale | Days of loops, already planned | Front end plus Storefront API integration plus Shopify's checkout domain rules | Front end plus Stripe Checkout plus a webhook and an order table |
| Risk to existing rankings | None | Low if paths are kept | Low if paths are kept |

Reject B. It pays for both platforms, keeps product data in the system that has no undo,
and the Storefront API integration is about the same work as the Stripe one. It earns its
place only if the owner wants Shopify's admin as the back office. At zero orders a year
that is not worth $39 a month plus a second system of record.

Reject A on velocity, not on merit. The Wave plan in `docs/05` is sound and would work.
It is also a plan for making an agent safe inside a platform that fights it. Each loop
exists to give Shopify an audit trail it does not provide. Choose C and the loops L1, L2,
L3 and L8 stop being work at all.

## What C looks like

### Three layers

Astro renders, React edits, a Worker charges. One repo, one build, one deployment,
three layers with a hard boundary between each.

| Layer | Owns | Runs |
|---|---|---|
| Astro, static generator only, no Cloudflare adapter | Every public page: products, collections, blog, sitemap, feeds, JSON-LD | At build time. The output is plain HTML in `dist/`, served as static assets. |
| React island on the product page | The personalisation editor: live frame preview, name and date, photo upload with crop, colour and layout | In the browser only, mounted with `client:only`. One island covers the whole purchase column. |
| Hand-written Worker, Hono or plain `fetch` | `/api/*` and `/admin/*`: create checkout, Stripe webhook, design save, photo upload URL, review submit, order list | Per request, routed before static assets with `run_worker_first`. Tests call it directly. |

The adapter is left out on purpose. It had three major versions in nineteen months, a
v15 beta out as of October 2026, and a June 2026 fix for builds that exited 0 while
emitting truncated HTML. It also provisions KV and Images bindings on deploy unless told
not to. None of the site's dynamic parts need it. Without it, every SEO page is a file in
`dist/` that a script can check before anyone opens a preview, and the money path is
ordinary Worker code that never changes when Astro does.

### Data shape first

Everything else follows from four types. They live in one TypeScript file and every
other module imports from it.

```
Product                     # a file in git
  handle            string   # URL slug, kept identical to the Shopify handle
  title, seoTitle, seoDescription
  collections       string[]
  options           Option[] # e.g. colour: [walnut, black, white]
  personalisation   Field[]  # e.g. { key: "name", label: "Name on frame", max: 40, required: true }
  price             integer  # cents, at Etsy parity
  images            ImageRef[]  # { key: R2 key, width, height, alt } all four required
  body              markdown

Design                      # a row in D1, photo in R2, written by the editor's save route
  id, productHandle, options, text fields, photo key, crop, layout, createdAt

Order                       # written only by the Stripe webhook
  id, stripeSessionId, email, shipping, items[] each with a designId, status

Review                      # written by the signed post-delivery link, then landed in git
  orderId, productHandle, rating, body, createdAt, status
```

`Product` is a file in git. `Design`, `Order` and `Review` are rows in D1. The catalog
changes through pull requests the owner can read. The other three change at runtime
through write paths with one caller each.

Two consequences of this shape that the first draft got wrong:

- **Personalisation does not travel in Stripe metadata.** Stripe caps metadata at 50
  keys of 500 characters, and a design with a photo crop and layout overflows it. The
  editor saves a `Design` row first and Checkout carries only the `designId`. The render
  spec (fonts, coordinates, layout) is one pure module shared by the live preview in the
  island and the fulfilment proof in admin, so what the customer saw is what gets made.
- **Reviews must land in git to reach a static page.** `aggregateRating` has to be in the
  first HTML a crawler sees, and a static page cannot read D1 at request time. Astro's
  server islands load after the page and need the adapter, so they do not help. A
  scheduled job opens a pull request that adds approved `Review` rows to a content
  collection. Merging rebuilds the site. The owner gets moderation for free.

The catalog is born from the Etsy shop, not from the Shopify store (owner decision,
2026-10-12). `plans/etsy-listings.json` holds every active Etsy listing and
`plans/clusters.json` groups them into designs. The owner makes the G2 keep/kill decisions
and only the survivors are imported. Shopify contributes only its URLs, for 301s.
`docs/02` finding 3 (43% of products chase one theme) is a content problem that a new
stack would faithfully reproduce if imported wholesale.

### Services

| Need | Cloudflare or Stripe piece | Note |
|---|---|---|
| Pages | Astro as a static generator, output served as Worker static assets | `output` left at the static default. Only API routes live in the Worker. |
| Catalog, collections, blog | Astro content collections, Markdown and JSON in git | Schemas validate text fields at build and a bad file fails the build. They do not validate R2 keys, so `ImageRef` requires width, height and alt, and CI HEADs every key. |
| Images | R2 for storage, Astro's build-time image pipeline or `/cdn-cgi/image/` URLs over R2 | Re-host once from Etsy's CDN. Measure the first full build against the 5,000 free transformations a month. About 100 products with 5 photos at 3 widths in 2 formats is roughly 3,000 before blog and collection images. |
| Editor | React island, `client:only`, one island for the purchase column | Cart state shared through a nanostore, not React context, which does not cross islands. Saves a `Design` through the Worker. |
| Cart and checkout | Worker route validates the cart against the catalog, then creates a Stripe Checkout Session with `price_data` line items and the `designId` | Stripe's own custom fields are capped at three, so collect everything on the product page. The cart itself is client-side. No sessions, no KV. |
| Tax, shipping options, wallets | Stripe Tax, Checkout `shipping_options`, Link, Apple Pay, Google Pay | All inside hosted Checkout |
| Orders | `checkout.session.completed` webhook writes one row to D1 and sends two emails | Idempotent on the session id |
| Email | Resend (already connected) or Cloudflare Email Service (public beta) | Order confirmation, owner notification, post-delivery review request |
| Reviews | Signed link in the review email, Worker route validates and writes D1; a scheduled job opens the moderation pull request | Verified purchase by construction |
| Admin | One Worker page behind Cloudflare Access listing orders and designs | The Worker verifies the Access token itself; static-assets Workers do not get it for free |
| Product feeds | Prerendered static endpoints for Google Merchant Center and Pinterest; Stripe's catalog CSV | Replaces the Google and Facebook channel apps. No Worker needed. |
| Bots and analytics | Cloudflare Web Analytics with bot filtering | Fixes `docs/01` finding 9 for free |
| CI | `astro check && astro build`, Cloudflare's Vitest plugin for the Worker, a post-build lint over `dist/`, Playwright against the preview URL | The preview URL is posted to the pull request by Workers Builds |
| Deploy | Workers Builds on merge to main | The merge is the one irreversible click. The owner holds it. |

### URL continuity

Keep `/products/<handle>` and `/collections/<handle>` exactly. The one page that ranks,
`/collections/aunt-uncle-frames` at #7 on a six-word query, must answer at the same path.
Two defaults break that promise and both are fixed in config:

- Astro writes `/products/p1/index.html` by default and Workers static assets then
  answer `/products/p1` with a 307 to `/products/p1/`. Measured on Astro 7.3.8. Set
  `trailingSlash: 'never'`, `build.format: 'file'`, and `html_handling:
  "drop-trailing-slash"` in the Wrangler assets block. After that the slash-less path
  returns 200.
- Astro's own `redirects` setting emits a meta-refresh page without an adapter, not a
  301. Generate `public/_redirects` from `plans/redirects.json` with explicit 301s. The
  static-assets layer applies it, with a limit of 2,000 rules. It does not apply to paths
  the Worker serves.

CI crawls the sitemap on the preview and fails on any 3xx, and checks that every archived
handle returns a 301. Cut DNS over only when that crawl matches the live sitemap.

## The agentic loop

The loop the brief describes exists on Cloudflare today and was verified against the
Workers docs on 2026-10-11.

1. The owner writes a backlog item as a GitHub issue. Vision and UX, no implementation.
2. A Claude Code session takes the issue, branches, and opens a pull request.
3. Workers Builds builds the branch and posts a stable preview URL to the pull request.
4. CI runs the schema build, unit tests, and Playwright against that preview. The agent
   fixes red checks itself.
5. The owner opens the preview on a phone and comments. The agent revises.
6. The owner merges. Workers Builds deploys. `git revert` and merge is the rollback.

What the models do in that loop. Opus 5.5 is the right default for a routine feature pull
request such as a collection page, a blog post, or a feed route. Fable 5.1 is for the
three places where a wrong shape is expensive. Those are the `Product` schema, the checkout
and webhook path, and the review gate on anything that touches money. That split matches pstack's role
defaults and costs nothing to change later.

What the loop cannot do. It cannot know whether a frame photo looks right or whether
copy sounds like the brand. That is the UX feedback job, and it is the owner's whole
job in this design. The loop also cannot earn links. Nobody has built the lever for that.

Guardrails that make the loop safe to run unattended:

- Stripe stays in test mode until the owner places one live order. CI places a test-card
  order on every pull request that touches checkout, against a preview bound to its own
  D1 and R2. Previews share production bindings by default, so this binding is explicit.
- Deploy happens only on merge. No agent deploys from a session.
- The `Product` schema rejects a title over 60 characters, a missing SEO description, a
  price below Etsy parity, a handle not in the survivor list, or an image without width,
  height and alt. The build fails instead of a loop halting at 10%.
- A post-build lint over `dist/` checks what schemas cannot: rendered `<title>` length
  including the suffix, valid JSON-LD, one canonical, OG tags, and that every survivor
  handle has its HTML file. It only works because every public page is prerendered.
- Astro and its integrations are pinned to the exact versions in the baseline table below. Astro 6 and 7 removed the
  APIs agents reach for from memory (`Astro.locals.runtime`, `Astro.glob`,
  `getEntryBySlug`, `ViewTransitions`, legacy collections), and one of them fails at
  request time rather than at build. A CI grep fails the build on any of them, and the
  repo's agent guide names the replacements.
- `compressHTML` is set explicitly. Astro 7's default can delete the space between
  adjacent inline elements, which no test catches. Rendered-text snapshots over `dist/`
  cover the rest.
- Secrets are Worker bindings. The repo keeps `.env.example` as it does now.

## Framework decision record

Astro was challenged on 2026-10-11 by two independent adversarial reviews, one reading
docs and the npm registry, one building a 100-product probe on Astro 7.3.8 and
measuring. TanStack Start and a Vite React single-page app were the named alternatives,
raised because of the editor. Both reviews kept Astro, for one reason. The site is about
300 content pages and one editor route. Astro ships zero JavaScript on the content pages
and mounts the editor as an ordinary React app in one island. TanStack Start, still
labelled release candidate in its own docs and without content collections, an image
component, a sitemap or a redirect map, would make every content page pay React
hydration to help one route. A single-page app costs the traffic goal directly, since
Pinterest, Facebook and TikTok crawlers read the first HTML and Cloudflare's SPA mode
would turn the 129 archived 404s into soft 404s.

The reviews changed this document in six places: the adapter is gone, the money path is
a plain Worker, reviews land in git, personalisation is a `Design` row rather than Stripe
metadata, the trailing-slash and redirect defaults are overridden, and previews get their
own database.

Conditions that reverse the verdict:

- The editor grows to three or more client-routed screens with shared state, or
  accounts and saved designs arrive. Even then the first move is a client-routed React
  app mounted under one Astro path, not a framework switch.
- The image spike shows R2 plus Images cannot be driven reliably from the Astro build.
- Astro 7's Markdown processor change breaks the blog pipeline and cannot be pinned
  around.

Still unverified: whether a content-collection `reference()` rejects a missing entry at
build time. Test it before relying on it for the survivor-list rule.

## Pinned baseline, checked 2026-10-11

Every version below is the newest stable release on the npm registry on 2026-10-11, or
the newest the rest of the stack allows. The first scaffold pins these exactly. Bumps
arrive as their own pull requests, each with the preview crawl and lint green.

| Package | Pin | Published | Note |
|---|---|---|---|
| Node.js | 24 (`.nvmrc`) | | Workers Builds defaults to 24.18.0 since 2026-07-30. Astro needs 22.12 or later. |
| `astro` | 7.3.8 | 2026-10-08 | 7.4 is in beta. No adapter. |
| `@astrojs/react` | 7.0.1 | 2026-10-06 | |
| `@astrojs/mdx` | 8.0.3 | 2026-10-06 | Needs `astro` 7.2.10 or later and the Sätteri Markdown package. |
| `@astrojs/sitemap` | 3.7.4 | 2026-08-31 | |
| `@astrojs/check` | 0.9.10 | 2026-07-27 | Runs in the build script. |
| `typescript` | 6.0.3 | 2026-04-16 | Not 7.0.2. `@astrojs/check` accepts TypeScript 5 or 6 only. Revisit when it accepts 7. |
| `react`, `react-dom` | 19.3.0 | 2026-09-09 | |
| `nanostores` | 1.5.5 | 2026-10-06 | Cart state shared between islands. |
| `@nanostores/react` | 2.0.1 | 2026-09-02 | |
| `react-easy-crop` | 6.2.4 | 2026-10-06 | Photo crop in the editor. Swap freely; it is one component. |
| `hono` | 4.13.13 | 2026-10-04 | Not the 5.0 release candidate. |
| `stripe` | 23.0.0 | 2026-10-01 | New major on 2026-10-01. Pin the API version in the client too. |
| `zod` | 4.6.5 | 2026-09-13 | Shared schemas for `Product`, `Design` and the checkout request. |
| `wrangler` | 4.149.0 | 2026-10-08 | |
| `@cloudflare/workers-types` | 5.20261011.1 | 2026-10-11 | Date-stamped. Bump with Wrangler. |
| `vitest` | 5.0.3 | 2026-09-30 | |
| `@cloudflare/vitest-plugin` | 1.4.0 | 2026-10-08 | Accepts Vitest 4.1 or 5. The old `vitest-pool-workers` package is deprecated and renamed to this. |
| `@playwright/test` | 1.64.0 | 2026-10-07 | Against the preview URL. |
| `resend` | 6.32.1 | 2026-10-06 | If Resend is chosen over Cloudflare Email Service. |

Two packages the doc names but does not install: `@astrojs/cloudflare` (14.3.4, with a
15.0 beta out) is the adapter this design leaves out, and `sharp` (0.35.5) arrives as
Astro's build-time image dependency without being pinned directly.

## What does not change

- **G5 stays open.** The Etsy review import is blocked by Etsy's terms, not by Shopify.
  `docs/06` applies word for word. Native reviews are the durable half on either stack.
- **G2 is still the hinge.** The consolidated survivor list is the input to the new
  catalog. Wave 0's snapshot and cluster report are still the first step.
- **Price parity with Etsy** (`docs/01` finding 6) is a schema rule now, not a loop.
- **The Cloudflare account is authorised** (G4). It already hosts other Workers, so the
  new ones take distinct names as `README.md` asks.

## What changes in the gate table

- **G1 becomes moot.** Do not place the Shopify test order. The money path to prove is
  Stripe's.
- Loops L1, L2, L3, L4, L5 and L8 become schema rules, a static redirect map, and a
  one-time export script. L6 and L7 wait on G5 as before.

## Costs, in numbers

| Item | Shopify today | Cloudflare and Stripe |
|---|---|---|
| Platform | $39/mo | $5/mo Workers Paid |
| Images | included | $0 at under 5,000 transformations/mo; Images Paid above |
| Database and storage | included | $0 at this scale (D1 and R2 free allotments; D1 enforces free-tier daily limits from 2026-09) |
| Card processing | 2.9% + 30¢ | 2.9% + 30¢ |
| Sales tax | included | 0.5% per taxed transaction (Stripe Tax) |
| Email | app | Resend free tier or Cloudflare Email Service |
| Shipping labels | Shopify Shipping rates | Bought by hand (Pirate Ship or similar) until volume justifies an integration |

Effort is a guess, since nothing has been built. Expect one to two weeks of agent sessions for
the storefront, editor, checkout, webhook, order list and feeds, with the owner reviewing
previews daily. Spend the first hour on the image pipeline against a real R2 bucket. Content is a programme, not a build, and runs for as long as traffic is
the goal.

## The Etsy caveat on the biggest traffic lever

Etsy's seller terms forbid using Etsy to direct buyers to buy the same items elsewhere.
Secondary sources say a brand URL on a packing insert is allowed and a discount for buying
direct is not. Etsy's own policy text on inserts was not found. Treat an insert as "visit
butterlu.com", never "buy this cheaper on butterlu.com", and confirm with Etsy Seller
Support before printing. This lever reaches 75,903 past buyers and costs a print run. It
is the only traffic source in this document that does not depend on Google.

## Sources checked 2026-10-11

- Cloudflare Workers Builds, preview URLs per branch, and the preview examples page in
  the Workers docs.
- Cloudflare Workers, D1, R2 and Images pricing pages.
- Stripe docs: Checkout custom fields (three-field cap), Agentic commerce seller
  integrations, the catalog feed spec.
- Shopify docs: bring-your-own headless stack, customer privacy API's same-root-domain
  rule for checkout.
- Shopify Basic price and Stripe Tax rate from third-party pricing round-ups, not the
  vendors' own pages.
- Etsy off-site linking: an Etsy community thread quoting the fee-avoidance rule and a
  2014 Etsy staff clarification reported by EcommerceBytes.
- Two adversarial reviews of the Astro choice, checked against Astro's v6 and v7 upgrade
  guides, the Cloudflare adapter changelog and docs, the npm registry, Cloudflare's
  static-assets routing, redirects and previews docs, Stripe's metadata limits, TanStack
  Start's docs and Cloudflare's TanStack guide, and a probe project built on Astro 7.3.8.

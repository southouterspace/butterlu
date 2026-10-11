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

### Data shape first

Everything else follows from three types. They live in one TypeScript file and every
other module imports from it.

```
Product
  handle            string   # URL slug, kept identical to the Shopify handle
  title, seoTitle, seoDescription
  collections       string[]
  options           Option[] # e.g. colour: [walnut, black, white]
  personalisation   Field[]  # e.g. { key: "name", label: "Name on frame", max: 40, required: true }
  price             integer  # cents, at Etsy parity
  images            ImageRef[]  # R2 keys
  body              markdown

Order                       # written only by the Stripe webhook
  id, stripeSessionId, email, shipping, items[], personalisation per item, status

Review                      # written only by the signed post-delivery link
  orderId, productHandle, rating, body, createdAt
```

`Product` is a file in git. `Order` and `Review` are rows in D1. That split is the
design. The catalog changes through pull requests the owner can read. Orders and reviews
change at runtime through two write paths, each with one caller.

The catalog is born from the consolidated list, not from the 243 products as they are.
Run the Wave 0 snapshot, make the G2 keep/kill decisions, and export only the survivors.
`docs/02` finding 3 (43% of products chase one theme) is a content problem that a new
stack would faithfully reproduce if imported wholesale.

### Services

| Need | Cloudflare or Stripe piece | Note |
|---|---|---|
| Pages | Astro, built as a Worker with static assets | Static where possible, server-rendered where a cart needs it |
| Catalog, collections, blog | Astro content collections, Markdown and JSON in git | The product schema is validated at build; a bad file fails the build |
| Images | R2 for storage, Images transformations for sizes | Re-host once from Etsy's CDN. 5,000 unique transformations a month are free. |
| Cart and checkout | A Worker route creates a Stripe Checkout Session with `price_data` line items and the personalisation in session metadata | Stripe's own custom fields are capped at three, so collect personalisation on the product page, not in Checkout |
| Tax, shipping options, wallets | Stripe Tax, Checkout `shipping_options`, Link, Apple Pay, Google Pay | All inside hosted Checkout |
| Orders | `checkout.session.completed` webhook writes one row to D1 and sends two emails | Idempotent on the session id |
| Email | Resend (already connected) or Cloudflare Email Service (public beta) | Order confirmation, owner notification, post-delivery review request |
| Reviews | Signed link in the review email, Worker route validates and writes D1 | Verified purchase by construction |
| Admin | One page behind Cloudflare Access listing orders and personalisation | Enough to fulfil by hand at this volume |
| Product feeds | Worker routes emitting Google Merchant Center and Pinterest feeds, and Stripe's catalog CSV | Replaces the Google and Facebook channel apps |
| Bots and analytics | Cloudflare Web Analytics with bot filtering | Fixes `docs/01` finding 9 for free |
| CI | Vitest with the Workers pool, Playwright against the preview URL | The preview URL is posted to the pull request by Workers Builds |
| Deploy | Workers Builds on merge to main | The merge is the one irreversible click. The owner holds it. |

### URL continuity

Keep `/products/<handle>` and `/collections/<handle>` exactly. The one page that ranks,
`/collections/aunt-uncle-frames` at #7 on a six-word query, must answer at the same path.
`plans/redirects.json` still drives the 301s for the 129 archived handles and the merged
duplicates; it just becomes a static map served by the Worker instead of Shopify
`urlRedirects`. Cut DNS over only when a crawl of the preview matches the live sitemap.

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
  order on every pull request that touches checkout.
- Deploy happens only on merge. No agent deploys from a session.
- The `Product` schema rejects a title over 60 characters, a missing SEO description, a
  price below Etsy parity, or a handle not in the survivor list. The build fails instead
  of a loop halting at 10%.
- Secrets are Worker bindings. The repo keeps `.env.example` as it does now.

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
the storefront, checkout, webhook, order list and feeds, with the owner reviewing
previews daily. Content is a programme, not a build, and runs for as long as traffic is
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

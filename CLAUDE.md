# Butterlu — agent operating guide

You are working on **Butterlu Gifts**, a personalised picture-frame and keepsake-gift
business. Read this file fully before touching anything. It exists so you do not have to
re-derive what has already been established, and so you do not repeat mistakes that are
expensive here.

---

## 1. What this business actually is

| | Etsy | butterlu.com |
|---|---|---|
| Reviews | **13,687** (4.9★, Star Seller) | 0 |
| Sales | **76,244** | **0, all time** |
| Listings / products | 619 active | 243 (99 live) |

Etsy figures from the API on 2026-10-12 (`plans/etsy-listings.json`).

**The successful business is on Etsy. The website is a broken photocopy of it.** Product
descriptions on the .com still open *"Welcome to Boutique ButterLu!"*, images are served
from Etsy's CDN as `il_fullxfull.*`, and ~83 product pages link back to Etsy. Two of the
top five listings on Etsy's `/market/aunt_picture_frame` page (which ranks #1 for
"aunt gift personalized frame") are ButterLu's. The brand already ranks — as `etsy.com`.

Shop domain: `da0e1b-6c.myshopify.com` · Storefront: `www.butterlu.com`

**Decision (owner, 2026-10-12): leave Shopify.** butterlu.com moves to the custom site in
`site/` (Astro + Cloudflare Worker + Stripe, `docs/07`). The new catalog is built from the
**Etsy shop**, not the Shopify store. Shopify is kept only as the list of current URLs, so
the new site keeps the paths that rank and 301s the rest. Shopify Waves 1–3, loops L1–L8
as Shopify loops, and the Wave 0 write test are dropped.

**The product (owner, 2026-10-12).** A frame is one of **two shapes** (rounded rectangle or
scalloped, both 8.375" wide, `assets/frame-drawing.pdf`) plus **one of 44 backgrounds**
(`assets/background-images/`), with **100% custom text**. The hundreds of Etsy listings
are the same product dressed for different searches. On the new site they become
search-intent pages, each a preset of the one configurable frame, not separate products.
Options are in `plans/product-options.json`. The opening takes a 4x6 photo (owner, not
yet measured). The 44 uploaded backgrounds are the set; Etsy's numbered colour chart is
not carried over. The two plain rectangles in the drawing are out of scope for now. About
80 Etsy listings are other products (brag boards, a $62 large frame, car coasters and
charms, add-ons).

---

## 2. Ground truth — verified, do not re-derive

Established via the Shopify Admin API and ShopifyQL. Trust these:

- **243 products**: 99 active, 15 draft, **129 archived**. Published 99 / unpublished 144.
- **0 orders, all time.** Conversion 0.0% every month on record.
- **Plan history (audit time):** store was on **"Pause and Build"**, which disabled
  checkout. Apr-2026 onward, 58 cart additions produced **zero** checkout sessions.
- **Current (2026-10-10, via Shopify connector):** plan reads **"Basic"** and the shop is
  switched on. Still **0 sales**. A live test order has NOT been placed, so checkout is
  unconfirmed end to end.
- **Traffic is bot-dominated** (owner agrees): the 20,126 "direct" sessions are crawlers.
  Treat real traffic as ~200 sessions/year.
- **`urlRedirects` is completely empty.** No 301 has ever been created on this store, so
  all 129 archived products are hard 404s.
- **`seo.title` and `seo.description` are null on all 243 products.** The theme falls back
  to `title | truncate: 70`, so every `<title>` cuts mid-word.
- **Traffic (365d): 20,344 sessions — 20,126 "direct", 75 Google organic**, 68 Pinterest,
  31 Facebook, 24 TikTok. The "direct" mass is crawler traffic walking `?variant=` URLs
  (hundreds of variant URLs each at a near-identical 13–17 sessions). **Real human traffic
  is roughly 200 sessions/year.**
- **Variant split is total**: every top-performing product has **42 variants / 1 option**;
  every underperformer has **exactly 100 / 2 options** (Shopify's per-product cap). Three
  of them need 34×3 = 102 combinations and were truncated to 100, so selectable options
  exist that cannot be purchased.
- **No personalisation input field exists.** The purchase form is Color → Quantity → Add
  to cart, while the copy tells buyers to use Etsy's "note to seller" field. Any order that
  completed would ship un-personalised.
- **Only product metafield in use** is `mc-facebook.google_product_category`. No review
  app, no review metafields.
- Canonicals are correct — no `?variant=` leakage. This one thing is already right.

**Corrections from the 2026-10-12 exports** (`plans/catalog.json`, `plans/etsy-listings.json`):
- 23 products are truncated at 100 variants, not 3: 12 need 34×3 = 102, 11 need 7×16 = 112.
  The split is also not total: variant counts seen are 42, 41, 100, 84, 82, 2 and 1.
- `seo.description` is set on 1 product (`soul-sisters-picture-frame-best-70252`).
- An ACTIVE product has the handle `test`.
- Etsy has **619** active listings, not the 635 recorded earlier (§1 is updated).

### Etsy Open API v3 — verified against the live docs
- `GET /v3/application/shops/{shop_id}/reviews` — **`x-api-key` only, no OAuth.**
- Returns: `listing_id`, `transaction_id`, `buyer_user_id`, `rating`, `review`, `language`,
  `image_url_fullxfull`, `create_timestamp`. **No reviewer display name.**
- Rate limits: **150 QPS / 100,000 QPD**. Not a constraint.
- **There is no review webhook.** The complete event list is `order.paid`,
  `order.canceled`, `order.shipped`, `order.delivered`. Available to personal apps,
  HMAC-signed, retried with backoff to ~10h.

---

## 3. Hard constraints — these will bite you

1. **Bulk edits have no undo.** 243 products. Always dry-run, always write a backup to the
   manifest before overwriting content, always stop at a 10% error rate.
2. **The Shopify connector cannot write to the live theme.** Theme-file writes are
   permitted on **unpublished themes only**. Build on a duplicate; a human publishes.
3. **`appInstallations` is outside the connector's scope** — it returns `access denied`.
   Detect installed apps by their metafield namespaces instead.
4. **Etsy API Terms restrict what you may do with review data.** See
   `docs/06-etsy-tos-constraints.md`. Short version: §9 prohibits screen-scraping Etsy
   *"even if such data is not available in the Etsy API"*, and §1/§4 restrict caching
   Member Content and driving traffic off-platform. **Do not scrape Etsy. Do not build the
   review migration until Etsy answers the pending question.**
5. **Never treat imported Etsy reviews as verified Shopify purchases**, never restamp their
   dates, never map a review onto a product other than the listing it was written about.
6. **Secrets live in the environment, never in this repo.** See `.env.example`. The Etsy
   keystring and shared secret exist but are deliberately not stored here.

---

## 4. Gate status

| Gate | What | Owner | Status |
|---|---|---|---|
| **G1** | Enable checkout (leave "Pause and Build") | Human | **DROPPED** 2026-10-12 — leaving Shopify; checkout moves to Stripe |
| **G2** | Line-up decisions (which search-intent pages to build, and each page's preset) | Human | **OPEN** — input ready in `plans/clusters.json` |
| **G3** | Etsy app credentials | Human | **DONE** — keystring + shared secret obtained |
| **G4** | Cloudflare connector authorised | Human | **DONE** — reaches the Butterlu account (`5fa93654…`), the only account Butterlu deploys to |
| **G5** | Etsy's answer on review republishing | Etsy | **OPEN** — email DRAFTED (now says "my own website"), not confirmed sent (see docs/06) |

G2 is the hinge — it decides which search-intent pages the new site launches with and
where each old Shopify URL 301s.

---

## 5. Where to start

Wave 0 and the Shopify waves are dropped. The exports are done and rerunnable:

- `scripts/etsy-export-listings.mjs` → `plans/etsy-listings.json` (Etsy, read-only)
- `scripts/shopify-catalog-from-pages.mjs` → `plans/catalog.json` (Shopify URLs, read-only)
- `scripts/lineup-draft.mjs` → `plans/listing-map.json`, `plans/clusters.json`
- `scripts/product-options.mjs` → `plans/product-options.json` (shapes, backgrounds)

The record behind these (decisions, Etsy API quirks, findings) is `docs/08`.
Market research (Etsy listings, competitors on and off Etsy, the Claude-run API stack)
is `docs/09`, with track reports in `docs/research/`. Etsy forbids using Etsy buyers or
packaging to drive traffic to butterlu.com; read `docs/09` §3 before any Etsy integration.

Next: the owner rules on `plans/clusters.json` in `plans/decisions.json` (G2). Do not
build the site catalog until that file is filled in. Do not import Etsy reviews until G5
resolves. Never write to Shopify.

---

## 6. Conventions

**Manifest-driven loops.** Every bulk operation reads its work list from a JSON file in
`plans/` and marks each row `applied: true` as it goes. Nothing lives in agent context.
A dead session resumes by reading the file. Re-running is always safe.

```
for batch in manifest.rows.where(applied == false).chunk(BATCH):
    for row in batch:
        result = mutate(row)               # one API call per item
        assert verify(row)                 # read back, confirm
        row.applied = true                 # checkpoint immediately
        log(run-log.jsonl, row, result)    # append-only audit trail
    persist(manifest)                      # flush before next batch
    if error_rate(batch) > 0.1: HALT       # circuit breaker
```

**A loop never derives its work list at runtime.** It reads a manifest a human or an
earlier step produced, so the plan is auditable before a single mutation fires.

Loops are `L1`–`L8`, gates `G1`–`G5`. Use the same identifiers in manifests, commits and
`run-log.jsonl`.

---

## 6a. The site and the PR loop

`site/` is the Cloudflare storefront from `docs/07`, currently a walking skeleton. It is
separate from the Shopify waves above and changes nothing on the live store.

- Three environments. Each pushed branch gets a Preview. Stage is `main`, deployed with
  `bun run deploy:stage`. Production ships only when a human publishes a GitHub Release.
- CI runs in the session, not GitHub Actions. A hook validates before any push that
  changes `site/` and blocks it on failure, then deploys the Preview and e2e-tests it.
- Before calling a site change done, follow `.claude/skills/verify/SKILL.md`. A cloud
  session's SessionStart hook installs Node 24, Bun and the dependencies.
- New behavior ships with a test in `site/tests/`. New SEO rules go in
  `site/scripts/lint-dist.mjs`.
- Open setup items and first runs are in `TODO.md`. Until its owner items are done, a
  push reports `deploy-setup-blocked`: report it, never work around it.

## 7. Unverified — do not assume either way

- **Whether the live theme already emits Product JSON-LD.** If it does, adding review
  markup will collide. The crawler used for the audit strips `<script>` tags, so this was
  never confirmed. Check with Google's Rich Results Test.
- **Backlink profile.** No Ahrefs/Moz access was available. The domain-authority argument
  in `docs/03` is inferred from SERP composition, not measured. Largest single unknown.
- **Keyword volumes.** "Winnable" in `docs/03` reflects competitive difficulty only, not
  traffic value.
- **Orphaned products.** A crawl found ~120 URLs against 99 live products plus collections.
  `plans/catalog.json` has 99 published products and 17 collections; the gap is unexplained.
- **Real per-listing Etsy sales.** The line-up ranks by favourites and views. Sales by
  listing need Etsy OAuth (`transactions_r`), as do variation prices (`listings_r`).

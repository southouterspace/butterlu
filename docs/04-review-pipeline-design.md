# 04 — Etsy -> Shopify review pipeline design

One-time migration of completed Etsy reviews into Shopify, plus ongoing sync. Built
in-house on the Etsy Open API v3, Cloudflare Workers and Shopify metaobjects — no
third-party review app.

**Status: BLOCKED pending G5.** See `06-etsy-tos-constraints.md`. The design is sound and
verified; whether it may be built is an open question with Etsy. Do not implement Waves 2
or 3 until that resolves.

Published artifact: https://claude.ai/code/artifact/b6c997e8-5be5-4c63-8539-2e001ae1eb3a

## Verified API facts

| | |
|---|---|
| Review endpoints | `x-api-key` only — **no OAuth** |
| Rate limits | **150 QPS / 100,000 QPD** — not a constraint |
| Review webhook | **Does not exist** |
| Missing field | **Reviewer display name** |

```
GET /v3/application/shops/{shop_id}/reviews
GET /v3/application/listings/{listing_id}/reviews
```

Returns `listing_id`, `transaction_id`, `buyer_user_id`, `rating`, `review`, `language`,
`image_url_fullxfull`, `create_timestamp`, `update_timestamp`.

`listing_id` on every review means **product mapping is fully automatable**.
`image_url_fullxfull` means customer photos come along.

## The webhook correction

There is no `review.created` event. Etsy's complete list is `order.paid`,
`order.canceled`, `order.shipped`, `order.delivered` — verified against the live docs.

**Turn this into an advantage:** `order.delivered` fires exactly when a review becomes
possible. Use it to schedule a narrow, targeted poll for that one transaction rather than
sweeping the whole shop on a blind cron.

## Architecture

Both entry points converge on one idempotent write path:

```
Etsy API (backfill, once) ─┐
                           ├─> CF Worker ─> dedupe on ─> Shopify ─> recalc
order.delivered webhook ───┘   HMAC verify   transaction_id  metaobject   reviews.rating
                                                                          + rating_count
```

Storage is **Shopify metaobjects, not an external database**. No DB to run, native
moderation in the Shopify admin, survives theme changes, readable through the same Admin
API connector. The Worker stays stateless apart from its scheduling alarms.

## Phase 1 — migration (one-time script, not infrastructure)

1. Page through `getReviewsByShop`. Entire history costs well under 200 calls.
2. Filter to reviews with non-empty `review` text. **Cap deliberately** — the useful
   threshold is 10–75 per product, so take the most recent N per listing.
3. Map listing -> product by title similarity (the .com descriptions were copied from
   Etsy, so most resolve unattended). Below a confidence threshold, queue for a human.
4. Write metaobjects keyed on `etsy_transaction_id`, then recalculate rating metafields.
   Re-running must be safe.

## Phase 2 — sync (event-triggered polling)

1. Subscribe to `order.delivered` in Etsy's Webhook Portal. Available to **personal apps**.
2. Verify HMAC-SHA256 over `webhook-id + "." + webhook-timestamp + "." + raw_body`, using
   the signing secret base64-decoded after stripping its `whsec_` prefix. Compare to the
   `webhook-signature` header. Reject timestamps more than 300s off. **Verify against raw
   bytes, before JSON parsing.**
3. Delivery is not a review — store `receipt_id`, set a Durable Object alarm ~14 days out,
   then check `getReviewsByShop` for a matching `transaction_id`. Re-arm a couple of times.
4. **Nightly sweep fallback** over the last 30 days. Costs single-digit calls and closes
   every gap webhooks miss. The dedupe key makes overlap harmless.

## The one gap: reviewer names

The API returns `buyer_user_id` as an integer and **no display name**.

| Option | Names from | Risk |
|---|---|---|
| **A. API only** | None — "Verified Etsy buyer" | **None** |
| **B. Manual** | You reading your own Etsy dashboard | Low |
| **C. Scraping** | Public Etsy shop page | **Explicitly prohibited — see `06`** |

**Ship A.** Option C is named and forbidden by Etsy ToS §9.

### Schema consequence
Google's `Review` type **requires an `author`**, which you will not have. `aggregateRating`
does not. So drive star snippets from `aggregateRating` (ratingValue + ratingCount) and
render individual reviews on-page without marking each as a `Review`. You get the stars and
stay compliant.

## Data model

```
metaobject: product_review
  etsy_transaction_id   number_integer     # dedupe key — unique, required
  etsy_listing_id       number_integer
  product               product_reference
  rating                number_integer     # 1-5
  body                  multi_line_text
  photo_url             url                # image_url_fullxfull, rehosted
  reviewed_at           date_time          # from create_timestamp — never "now"
  source                single_line_text   # "etsy" | "native"
  display_name          single_line_text   # empty on the API-only path
  status                single_line_text   # "approved" | "pending" | "hidden"

product metafields (Shopify standard — themes already understand these)
  reviews.rating        rating
  reviews.rating_count  number_integer
```

## Controls that apply either way

1. **Never mark imported reviews "Verified Purchase"** — they were Etsy orders. Store
   `source: "etsy"` and label them on the page.
2. **Preserve `create_timestamp`.** A wall of reviews dated the import day reads as
   fabricated to shoppers and to Google.
3. **Never remap a review to a different product** than the listing it was written about.
   This is the line between importing and fabricating.
4. **Minimise personal data.** First name plus initial at most; do not retain
   `buyer_user_id` beyond the dedupe window.
5. **Build a takedown path.** One metaobject delete plus a recalculation.
6. **Keep secrets in Worker bindings** — never in the theme or browser.

## Build order

| # | Step | Proves | Est. |
|---|---|---|---|
| 1 | Register Etsy app, pull one listing's reviews | Key works, payload matches spec | 1 h |
| 2 | Define metaobject + metafields, write one review by hand | Schema renders in admin | 1-2 h |
| 3 | Title-match listings to handles, output mapping file | Coverage %, what needs a human | 2-3 h |
| 4 | Migration script with dedupe + aggregate recalc | Idempotent on re-run | 4-6 h |
| 5 | Theme section + `aggregateRating` JSON-LD | Passes Rich Results Test | 1 d |
| 6 | Worker: signature verify, replay guard, alarms | Etsy's test event round-trips | 1 d |
| 7 | Nightly sweep + monitoring | Gaps close unattended | 3-4 h |

~4 working days. Steps 1-4 deliver the migration; 5 makes it visible; 6-7 make it
self-maintaining.

## Native reviews — unaffected by G5

Collecting **fresh** reviews on Shopify post-checkout is entirely yours and always
available. Post-purchase email (Resend) with an HMAC-signed link containing order + product
ID, so only real buyers can submit. That earns genuine verified-purchase status the Etsy
imports can never have. **This was always the durable half of the design.**

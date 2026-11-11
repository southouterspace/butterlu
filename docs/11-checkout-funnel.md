# 11 · Checkout funnel: Shopify-caliber, measured

Status (2026-11-04): research done; funnel events, checkout recovery settings and the
abandoned-checkout decision are built for stage, in Stripe **test mode** (see the stage
run for the commit that added this file). No
email is sent to anyone. Everything customer-facing is a proposed default until Justin
and Asli confirm it. The decisions only the owner can make are at the end.

## 1. What makes Shopify's checkout convert

Sources read 2026-11-04. Vendor figures are marked as vendor claims; none has a published
method.

| Claim | Source | Weight |
|---|---|---|
| Shopify checkout converts up to 36% better than competitors, 15% on average | [Shopify enterprise blog](https://www.shopify.com/enterprise/blog/shopify-checkout), study commissioned by Shopify, firm unnamed | Vendor claim |
| Shop Pay lifts conversion up to 50% vs guest checkout, and is 4x faster | same | Vendor claim |
| Link lifts conversion by over 7% | [Stripe Checkout](https://stripe.com/payments/checkout) | Vendor claim |
| 70.22% of carts are abandoned on average | [Baymard](https://baymard.com/lists/cart-abandonment-rate), 50 studies, 2006 to 2025 | Independent |
| Why shoppers leave checkout: extra costs 40%, slow delivery 20%, don't trust the site with a card 19%, forced account 18%, too long 17%, errors 17%, returns policy 13%, total not shown up front 12% | Baymard, US shoppers, excluding "just browsing" | Independent |
| Fixing documented checkout usability issues can lift conversion ~35% on large sites | Baymard | Independent |
| Shopify's abandoned-checkout email waits 10 hours by default and goes only to marketing subscribers; its abandoned-cart flow skips anyone emailed in the last 30 days | [Shopify re-engagement automations](https://www.shopify.com/blog/reengagement-automations), [Flow trigger](https://help.shopify.com/en/manual/shopify-flow/reference/triggers/customer-abandons-checkout) | Shopify docs |

Shopify's own list of why it wins: an identity network (Shop Pay recognises 100M+ buyers
and pre-fills them), one-page checkout, field order and button tuning, express wallets,
discounts and gift cards, delivery promises, post-purchase offers, and recovery
automations. Strip out the parts that only a network of millions can have and the lesson
is: **no surprise costs, no account, fewest fields, wallets first, a delivery promise, trust
at the pay button, and a polite, consented follow-up.**

### What Stripe Checkout already gives us, and what we build

| Shopify technique | Butterlu today | Who does it |
|---|---|---|
| One-click identity (Shop Pay) | **Link**: returning Link shoppers pay in one click | Stripe, free |
| Express wallets | **Apple Pay, Google Pay** on the hosted page, no domain setup | Stripe (turn on in Dashboard → Payment methods) |
| Guest checkout, no account | Stripe Checkout never asks for an account | Stripe |
| Address autocomplete, card and email typo checks | Built in | Stripe |
| One-page checkout | Stripe Checkout is one page | Stripe |
| No surprise costs | Free US shipping, shown on product, cart and checkout. Tax isn't collected | Built (`SHOP.shipping`) |
| Delivery promise | "Made to order and shipped within 3 to 5 business days" on the product page, the cart and now beside the pay button; Stripe shows a 5 to 10 business day delivery estimate | Built (this change adds the pay-button copy) |
| Trust signals | Pay-button copy says how a typo gets fixed. Etsy's 13.7k reviews can't be shown until G5 | Built in part; reviews blocked on G5 |
| Discount codes | Stripe promotion codes, behind `CHECKOUT_PROMO_CODES` (off) | Owner's call (decision 3) |
| Abandoned checkout recovery | Stripe collects consent, expires the session, and hands us a 30-day recovery link; **we send the email** | Built up to the send; sending waits for decision 1 |
| Funnel analytics | Shopify Analytics. Cloudflare Web Analytics has **no custom events**, so we record our own | Built (section 2) |
| Cart drawer, "Buy it now", upsells | Not yet | Proposed next (section 5) |

Stripe also has a no-code "Cart Recovery Emails" beta that sends the emails itself, but it
is invite-only, live mode only and sends from Stripe's domain, so it doesn't fit stage
testing or the brand. We use the API route instead.

## 2. The funnel and what we measure

Steps, the event that marks each, and where it is recorded. Browser events are beaconed
to `POST /api/e` (`src/scripts/track.ts`, under 1 KB); server events are recorded by the
Worker itself (`worker/events.ts`).

| Step | Event | Recorded by | Detail / value |
|---|---|---|---|
| Landing and browsing | `view` | browser, every page | page type (`home`, `collection`, `product`, `personalize`, `cart`, `success`, `content`, `not_found`), handle, referrer host on landing |
| Open the editor | `personalize_click` | browser, a Personalize tap | `product` (product page), `card` (a design card), `create` (Start Your Own Frame); h is the design. Followed by a `view` of page type `personalize` |
| Customize | `customize` | browser, first edit in the editor | handle |
| Add to cart | `add_to_cart` | browser | `customized` or `as_designed` from the editor, `as_shown` from the product page's Add to Cart, `as_shown_card` from a card's one-tap add, `as_shown_home` from the homepage hero's Add to Cart (h is the design added) (the Etsy lesson: most buy as designed) |
| Start checkout | `checkout_click` | browser | cart subtotal in cents |
| Checkout failed to open | `checkout_error`, `checkout_refused` | browser and Worker | `http_503`, `checkout_off`, `cart_invalid`, `stripe_error` |
| Checkout opened | `checkout_created` | Worker | order amount, Stripe mode |
| Paid | `order_paid` | Stripe webhook, only once the order is read and `payment_status` is paid | amount; `recovered`, `opted_in` or `direct` |
| Abandoned | `checkout_expired` | Stripe webhook | recovery decision (section 3) |

The product page and the editor are two screens (owner, 2026-11-11). The product page
sells the design as shown, with Personalize and Add to Cart side by side, Personalize first on every design ("anything can be personalized", owner), and keeps room
below for photos and, later, reviews. Personalize opens `/products/<handle>/personalize`,
whose canonical is the product page. The editor ends in its own Add to Cart and then
offers View Cart & Check Out in place, never a trip back. Its changes are kept on the
device (`localStorage`, `butterlu.draft.v1:<handle>`, 30 days) and dropped once the
form is back to our design or the frame goes in the cart; nothing of it is sent anywhere.

**Privacy.** No cookies and no third-party script. A random funnel id lives in
`sessionStorage`, so it is per tab and gone when the tab closes; it rides to Stripe as
`client_reference_id` so a paid or abandoned session joins its visit. No email, name,
address, IP or full URL is recorded. Shoppers with Global Privacy Control on send no
browser events. Crawlers and headless browsers are marked `bot` (user agent) and left out
of the report, and so is e2e traffic (it sends a bot user agent). Returning from Stripe's
page isn't counted as a referral. The store sells to the US only, where this needs no cookie banner; revisit
before selling to the EU or UK.

**Where the events go.**
1. **Now:** every event is a JSON line in Workers Logs (`{"funnel":"add_to_cart",...}`),
   searchable in the Cloudflare dashboard (Workers → butterlu-site-stage → Logs, filter
   `funnel`). Logs keep a few days only.
2. **With the `EVENTS` binding** (Workers Analytics Engine, dataset
   `butterlu_funnel_stage`, 3 months of data, SQL): the Worker writes each event there as
   well. The code is ready; the binding is not in `wrangler.jsonc` yet because a deploy
   with it failed on 2026-11-04 (Cloudflare code 10089: Analytics Engine isn't enabled on
   the Butterlu account). Once Justin enables it, re-add
   `"analytics_engine_datasets": [{ "binding": "EVENTS", "dataset": "butterlu_funnel_stage" }]`
   at the top level and `butterlu_funnel` under `env.production`. Column contract: `blob1` event, `blob2` page, `blob3` handle, `blob4` funnel id,
   `blob5` detail, `blob6` referrer, `blob7` who (`human`, `bot`, `server`), `double1` value.

### Funnel report

Visits that reached each step in the last 7 days (Analytics Engine SQL API, needs a token
with Account Analytics Read):

```sql
SELECT blob1 AS step, count(DISTINCT blob4) AS visits, sum(_sample_interval) AS events
FROM butterlu_funnel_stage
WHERE timestamp > NOW() - INTERVAL '7' DAY AND blob7 != 'bot' AND blob4 != ''
GROUP BY step
```

Read it top to bottom as: product views → customize → add to cart → checkout click →
checkout created → paid, with abandoned and recovered beside it. The ratios to watch:

- **Add-to-cart rate** = `add_to_cart` / product `view` visits.
- **Checkout start rate** = `checkout_click` / visits with `add_to_cart`.
- **Checkout completion** = `order_paid` / `checkout_created`. Stripe's page is the only
  part we can't tune, so this is the check on it.
- **Recovery rate** = `order_paid` with `recovered` / `checkout_expired` with `eligible`.
- **As designed vs customized** share of adds, to tell Asli which presets sell.

A one-page report at `/admin/funnel` behind Cloudflare Access is the next step once D1 exists
(docs/07 already plans Access for admin).

## 3. Abandoned checkout follow-up

**Capture point.** Stripe Checkout, not our cart. Shoppers type their email on Stripe's
page; Stripe shows a promotional-email opt-in box (`consent_collection[promotions]=auto`,
US only) and returns the email on expiry **only for shoppers who ticked it**. We never
store or email anyone who didn't.

**Timing.** Each Checkout Session now expires **2 hours** after it opens
(`CHECKOUT_EXPIRES_HOURS`, 0.5 to 24, Stripe's default is 24). Expiry is the abandonment
signal and fires `checkout.session.expired` with a recovery link that works for 30 days
and reopens the same cart. Proposed send schedule, modelled on Shopify's:

| Message | When | Content |
|---|---|---|
| 1 | 10 hours after checkout opened (Shopify's default) | "Your frame is saved": the design preview, the recovery link. No discount |
| 2 (optional) | 48 hours, only if 1 wasn't opened or clicked | Same, plus a typo-check reassurance. Discount only if decision 3 says so |

**Controls.**

| Control | Where | Default |
|---|---|---|
| Recovery on or off | `RECOVERY_EMAILS` in `apps/site/wrangler.jsonc` `vars` (`off`, `log`) | `log`: decides and records, sends nothing |
| Abandonment window | `CHECKOUT_EXPIRES_HOURS`, same place | 2 |
| Promotion codes in checkout and recovered checkouts | `CHECKOUT_PROMO_CODES`, same place | `false` |
| Consent records | Stripe Dashboard → Settings → Emails (download or upload opt-in CSV) | Stripe holds them |
| Frequency cap | one recovery email per address per 30 days (Shopify's rule), and none once that address has paid | Needs the D1 table |
| Opt-out | one-click unsubscribe link and `List-Unsubscribe` header in every email; unsubscribes go to a suppression table checked before every send | Needs D1 and the email provider |
| Kill switch | set `RECOVERY_EMAILS` to `off` in `wrangler.jsonc` and push (stage deploys in about two minutes; production at the next Release). A value set only in the Cloudflare dashboard is dropped by the next deploy, so the file is the source of truth. Before sending exists, a faster dashboard switch backed by D1 replaces this | |

Later, an admin page (behind Access) can show the queue and pause it, so Asli doesn't need
the Cloudflare dashboard.

**The decision today** (`recoveryDecision` in `worker/webhook.ts`, tested): an expired
session is `eligible` only with a recovery link, `opt_in` consent and an email; otherwise
`no_consent`, `no_email`, `no_recovery_link` or `recovery_off`. It's recorded as the
`checkout_expired` event with no email address and no link in the logs. Paid sessions
carry `recovered_from` when they came back through a recovery link, recorded as
`order_paid` / `recovered`.

**Pre-checkout cart abandonment** (people who add to cart but never reach Stripe) has no
email to follow up, by design. The option, if Justin wants it: a "Email me my design"
link on the cart, with its own explicit opt-in. It also helps gift buyers who design on a
phone and pay later on a laptop.

## 4. What changed in this step

- `worker/events.ts`, `POST /api/e`, `src/scripts/track.ts`: the events above.
- `worker/checkout.ts`: the Session now sets `client_reference_id`, `expires_at`,
  `consent_collection[promotions]=auto`, `after_expiration[recovery][enabled]`, the
  pay-button message, and promotion codes behind the flag.
- `worker/webhook.ts`: handles `checkout.session.expired` (decision and event only) and
  records `order_paid`.
- `wrangler.jsonc` `vars`: the three controls in section 3, for stage and production.
- Tests: `worker/events.test.ts`, new cases in the checkout and webhook tests, and a beacon
  check in `tests/store.e2e.ts`.

## 5. Next, in order

1. Owner steps below, then a test-mode run end to end on stage: add to cart, open checkout,
   tick the opt-in, abandon, wait out the window, see `checkout_expired` / `eligible`.
2. D1 table `checkout_followups` (session id, email hash, consent, scheduled time, sent,
   suppressed) and a Worker cron that sends message 1 at 10 hours, honouring the cap and
   suppression list. Sends only once decision 1 is made, and on stage only to Justin's own
   address until he says otherwise.
3. Product page "Buy it now" button that opens Stripe Checkout for the one frame
   (Shopify's dynamic checkout button). Most shoppers buy one frame.
4. Add-to-cart confirmation as a native `<dialog>` with "Check out" and "Keep shopping"
   (Shopify's cart drawer, without a framework).
5. Funnel report page behind Access.
6. Order bump on the cart, once more products exist (a second frame for the other
   grandparents is the obvious one), measured against the report.

## Owner steps

- Cloudflare dashboard (Butterlu account) → Workers → Analytics Engine: enable it, so the
  funnel keeps 3 months of events instead of a few days of logs.

- Stripe test webhook endpoint at `/api/stripe/webhook` subscribed to **both**
  `checkout.session.completed` and `checkout.session.expired`.
- Stripe Dashboard → Settings → Payment methods: Link, Apple Pay and Google Pay on (test
  mode first).
- Secrets on the stage Worker: `STRIPE_SECRET_KEY` (test), `STRIPE_WEBHOOK_SECRET`.
- For the report: an API token with **Account Analytics Read** for whoever runs the SQL.
- Later: create the D1 database and add the email provider's key as a Worker secret.

## Decisions only Justin (and Asli) can make

1. **Email provider and sender.** Resend is already connected to this workspace and has a
   Workers-friendly API; Cloudflare Email Service is the other option. The sender address
   (for example `hello@butterlu.com`) needs DNS records, which only Justin adds.
2. **Consent wording.** Stripe's opt-in box has fixed wording. If we add a cart-page
   "Email me my design", its wording is ours to write and needs Asli's yes.
3. **Discount policy.** Shopify-style stores often add a code to the second recovery email.
   Baymard warns a visible coupon field sends shoppers hunting for codes. Default: no
   discount, no code field.
4. **Recovery timing:** 10 hours then 48 hours, or one email only.
5. **Trust claim:** may the site say something like "76,000+ orders from our Etsy shop"?
   It is true per the Etsy API, but it is Asli's brand call.
6. **Buy it now and the add-to-cart dialog** (next steps 3 and 4) change the product page
   Asli will see.

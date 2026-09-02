# 01 — Diagnostic findings

14 findings, ordered by severity against level of effort. Sources: Shopify Admin API,
ShopifyQL, live page crawls, SERP checks. Published artifact:
https://claude.ai/code/artifact/05997c76-5be1-41cc-b8e5-596b9db62f3a

## Headline

| Metric | Value |
|---|---|
| Etsy shop | 13,635 reviews · 4.9★ · 75,903 sales |
| This website | **0 orders, all time** · 0 reviews |
| Google organic | **75 sessions in a full year** |
| Catalog | 243 products — 99 live, 15 draft, 129 archived |

## The content thread — hypothesis rejected

The working hypothesis was that top-performing products had better page content than
underperformers. **This is false.** Three of the five top performers run *byte-identical*
boilerplate to five of the six underperformers. Copy quality does not separate them.

The only clean 11-for-11 split is **variant architecture** (42/1 versus 100/2). And the
top performers are not winning on search either — the store drew 75 organic sessions all
year, so their traffic is social and referral. Comparing description quality was never
going to surface a search signal, because neither group is in search.

---

## Tier 1 — blocks revenue outright

### 01 · Checkout is switched off at the plan level
`CRITICAL` · effort: trivial
Plan reads `Pause and Build`. Cart adds by month: Apr 4, Jun 30, Jul 25, Aug 3 — with
**0** sessions reaching checkout in each. Through Mar-2026 they reached checkout normally.
~60 people since April showed purchase intent and hit a wall.
**Fix:** move to a plan that enables checkout, then place one live test order.

### 02 · A custom-frame store with nowhere to enter the customisation
`CRITICAL` · effort: low
The purchase form is Color → Quantity → Add to cart. No name, date or engraving input
exists. Copy instructs buyers to leave details *"in the 'note to seller' area during the
checkout process"* — an Etsy field that does not exist here. By the copy's own fallback,
every completed order ships **un-personalised**.
**Fix:** add required line-item property fields before re-enabling checkout, and strip the
"note to seller" instruction from all descriptions.

### 03 · ~83 product pages send buyers to Etsy
`HIGH` · effort: low
PDPs carry `Check out all of our designs at: www.boutiquebutterlu.etsy.com` and a link to
`etsy.com/listing/601590680/rush-order-processing`. Descriptions open *"Welcome to
Boutique ButterLu!"*; images are `il_fullxfull.*` Etsy CDN exports.
**Fix:** global find-and-replace to remove Etsy URLs; re-host images on Shopify's CDN.
**Caveat:** Etsy's API Terms *require* linking back to Etsy where an application uses
Etsy product content. Removing Etsy links from your own Shopify descriptions is unrelated
to that — but see `06-etsy-tos-constraints.md` before building anything that displays
Etsy-sourced content.

## Tier 2 — cheap wins

### 04 · SEO title and description empty on all 243 products
`HIGH` · effort: low
`seo.title` and `seo.description` are null on 243/243. Theme falls back to
`title | truncate: 70`, so every `<title>` cuts mid-word: *"…Custom Gift For Aunt Birthda
– Butterlu Gifts"*, *"…I Love My Grea"*. Product names themselves run ~140 characters of
repetition — the top product says "Aunt" five times.
**Fix:** populate `seo.title` (<60 chars) and `seo.description` per product, independent
of the product name. Highest effort-to-impact fix on the site.

### 05 · 13,635 real reviews exist and none are on the website
`HIGH` · effort: low
`etsy.com/shop/ButterLu` holds 4.9★ / 13,635 reviews / 75,903 sales / Star Seller.
butterlu.com shows zero reviews, no ratings, no `aggregateRating` markup. Among niche DTC
competitors the working threshold is only **~10–75 reviews**.
**Fix:** blocked pending Etsy's answer — see `06-etsy-tos-constraints.md`. Collecting
fresh native reviews post-checkout is unaffected and always available.

### 06 · The website undercuts its own Etsy listings by 35–55%
`HIGH` · effort: trivial
butterlu.com prices at **$16.06**; the same shop's Etsy listings run **$24.88–$35.55**.
DTC band: PersonalizationMall $27.99, Pet Memory Shop $29.99–49.99, Grandparent Gift Co
$49, Precious Moments $64.50.
**Fix:** raise to at least Etsy parity. No competitive reason to sit below it.

### 07 · 129 archived products are hard 404s with zero redirects
`HIGH` · effort: low
`urlRedirects` is completely empty — not one 301 has ever been created.
**Fix:** bulk-import 301s from each archived handle to its nearest live equivalent.

### 08 · Test and one-off products are publicly live
`MEDIUM` · effort: trivial
Live and crawlable: `/products/test` (empty description),
`custom-order-for-kevin-c-personalized-97874`, `mama est. 2025`,
`Print out photo and place in frame`, plus a duplicate `mom-dad-frames-1` collection.

### 09 · 99% of reported traffic is bots
`MEDIUM` · effort: low
Of 20,344 sessions: direct 20,126, google 75, pinterest 68, facebook 31, tiktok 24. The
direct mass resolves to hundreds of `?variant=` URLs each at a near-identical 13–17
sessions — a crawler walking the variant matrix.
**Fix:** judge performance on search and social segments only. True baseline is ~200
human sessions/year.

## Tier 3 — restructure

### 10 · Every product with 100 variants draws zero humans
`HIGH` · effort: medium

| Product | Variants | Options | Human landings |
|---|---|---|---|
| aunt-gift-personalized-aunt-picture-frame | 42 | 1 | 84 |
| dog-loss-gift-rainbow-bridge-dog | 42 | 1 | 70 |
| birthday-gift-for-grandpa-personalized | 42 | 1 | 51 |
| today-a-bride-tomorrow-a-wife-forever | 42 | 1 | 47 |
| auntie-photo-frame-aunties-bestie | 42 | 1 | 43 |
| gift-for-great-grandma-personalized-gift | 100 | 2 | 0 |
| personalized-great-grandma-gift-gift | 100 | 2 | 0 |
| great-grandma-gift-picture-frame-for | 100 | 2 | 0 |
| great-aunt-gift-birthday-gift-for-great | 100 | 2 | 0 |
| ill-love-you-forever-ill-like-you-for | 100 | 2 | 0 |
| baby-loss-gift-miscarriage-gift | 100 | 2 | 0 |

100 is Shopify's hard cap. Three products (`49561`, `66545`, `55825`) need 34×3 = 102
combinations and were truncated to 100 — selectable options exist that cannot be bought.
Each 100-variant product absorbs ~1,400 crawler sessions while attracting no one.
**Caveat:** a clean correlation across 11 products, not proven causation. The content
audit ruled out copy quality as the differentiator, which strengthens it without closing it.

### 11 · Cannibalisation at catalog scale — 43% of products chase one theme
`HIGH` · effort: medium
**~104 of 243 products (~43%)** target godmother/godfather/godparent. The great-grandma
cluster is **six** products, not four — `43378` and `49865` differ by the single word
"Birthday" in an otherwise identical 116-character title. Byte-identical title clusters run
5×, 5×, 4×, 4×, 4×, 4× plus twelve 2× pairs: **≥62 products (~26%) share a title** and ~83
(~34%) share one of three verbatim descriptions. With SEO fields null, identical title =
identical `<title>`, `<h1>` and image alt.

### 12 · Collection pages are empty shells — and they're what actually ranks
`MEDIUM` · effort: medium
`/collections/aunt-uncle-frames`: title *"Aunt & Uncle Frames"* with no keywords, empty
meta description, 5 products, zero words of copy, no FAQ. Etsy's equivalent carries 42
listings plus intro and FAQ and ranks **#1**. In pet-memorial queries **7 of the top 10
results are niche DTC collection pages**. Butterlu's own best organic result is already a
collection page — `/collections/aunt-uncle-frames` at **#7** on a six-word long tail.

### 13 · Fewer than half the products are live, and the crawl finds fewer still
`MEDIUM` · effort: medium
243 products: 99 active, 15 draft, 129 archived. A site crawl surfaced only ~120 URLs,
suggesting some live products are orphaned — reachable by direct URL but not linked from
any collection or menu.

## Tier 4 — the strategic call

### 14 · Marketplaces own these SERPs — except one category
`CRITICAL` · effort: high
butterlu.com is absent from all 8 queries tested (one exception: #7 on a six-word long
tail). Domain authority, not content length, is the barrier — **GiftsForYouNow ranks #3
with 1 review and 150 words**; PersonalizationMall #6 with 2 reviews; Precious Moments #3
showing "Write the First Review"; Amazon's #2 result has 4 ratings and is out of stock.
Butterlu's 477-word pages lose to 150-word pages on authority alone.

| Theme | Who owns the SERP | Verdict |
|---|---|---|
| Dog loss / rainbow bridge | Only **1** marketplace result in top 12 | **Winnable** |
| Pet memorial frames | 7 of 10 are niche DTC collection pages | **Winnable** |
| Long-tail aunt phrases | Already #7 on a six-word query | **Winnable** |
| "Today a bride tomorrow a wife" | Etsy holds 4 of 12; those shops carry 54,500–55,100 reviews | Marginal |
| Grandpa birthday gifts | **Zero product pages rank at all** | Hopeless |
| Personalized great grandma | Google collapses it to "grandma"; 1 of 12 results is great-grandma-specific | Hopeless |

**Recommendation:** rebuild as a **pet-loss / rainbow-bridge memorial authority**. It is
the only tested theme where marketplaces do not own the SERP, the winners there are
structurally identical small Shopify stores, and the category rewards content — while
`/blogs/news` currently has **zero posts**.

Note the six duplicate great-grandma SKUs chase an intent Google does not recognise as
distinct. Consolidate them for hygiene, not for traffic.

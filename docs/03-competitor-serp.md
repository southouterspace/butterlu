# 03 — Competitor SERP analysis

Who ranks for Butterlu's target queries, and why they outrank butterlu.com.
Published artifact context: `docs/01` finding 14.

## The buried lede

**Butterlu already ranks for these queries — as etsy.com, not butterlu.com.**

`etsy.com/shop/ButterLu`: **4.9★, 13,635 reviews, 75,903 sales, 635 listings, Star
Seller.** On Etsy's `/market/aunt_picture_frame` page — which ranks **#1** for "aunt gift
personalized frame" — **two of the top five listings are ButterLu's**. A
`site:etsy.com ButterLu` search returned 10 indexed, ranking ButterLu aunt listings.

Meanwhile butterlu.com is a thin duplicate of that same content: product copy literally
opens *"Welcome to Boutique ButterLu!"* and images are `il_fullxfull.*` Etsy CDN exports.

## butterlu.com in SERPs: confirmed absent

Zero appearances across all 8 primary and variant queries. **One exception:**
`/collections/aunt-uncle-frames` ranks **#7** on the six-word long tail *"personalized aunt
picture frame gift for aunt from niece 4x6"*. Indexation is fine (`site:` check passes) —
the problem is relevance and authority, not crawlability.

## Who dominates, by page-type mix

- **Aunt queries:** 8 of 11 slots are Amazon / Etsy / Walmart / Zazzle /
  PersonalizationMall / GiftsForYouNow. Marketplace **category** pages, not PDPs.
- **Grandpa:** **zero PDPs in the top 12** — 100% national-brand departments (Shutterfly,
  Mark & Graham, PersonalizationMall, Things Remembered) plus Oprah Daily editorial at #3.
- **Bride:** Etsy holds 4 of 12; those shops carry **54,500–55,100 reviews**. Precious
  Moments #3 at $64.50.
- **Pet loss:** the outlier — **only 1 marketplace result in the top 12.** Small Shopify
  DTC stores plus a *blog post* (whiskerandfang.com #11).
- **Pet memorial frames:** **7 of 10 are niche DTC collection pages**, not PDPs.

## The five biggest gaps

1. **Truncated title tags.** Every product `<title>` cuts mid-word at ~69 chars —
   *"…Personalized Gift For P – Butterlu Gifts"*. A theme `truncate` fallback firing
   because `seo.title` is null.
2. **0 reviews and no `aggregateRating` JSON-LD** — while holding 13,635 real reviews on
   Etsy. No star rich-results possible. PersonalizationMall renders `4.9 (55)` and
   "Ships In: 1-2 days" directly in its snippet.
3. **Collection pages are empty shells.** `/collections/aunt-uncle-frames`: no keywords in
   title, empty meta description, 5 products, **0 words of copy, no FAQ**. Etsy's
   equivalent: 42 listings + intro + FAQ, ranks #1. Pet Memory Shop ranks **#2 with 75
   reviews and zero copy** — a matchable profile.
4. **Cannibalisation:** 6 near-duplicate great-grandma URLs, 4 near-duplicate pet-loss
   URLs, all $16.06, near-identical boilerplate. Plus a live `/products/test`.
5. **Price and trust:** $16.06 versus ButterLu's **own Etsy price of $24.88–$35.55**, and
   versus the DTC band ($27.99–$64.50).

## Review thresholds — not what you would expect

Content length is not the gap: Butterlu runs 477 words; **GiftsForYouNow ranks #3 with 150
words.** Neither is review count for the big players — **GiftsForYouNow #3 with 1 review;
PersonalizationMall #6 with 2; Precious Moments #3 showing "Write the First Review";
Amazon's #2 has 4 ratings, BSR 648,683, and is out of stock.** That is domain authority,
pure.

But for the one archetype Butterlu can imitate — **niche Shopify DTC collection pages —
the working threshold is ~10–75 reviews.** Trivially achievable. On Etsy the currency is
*shop* reviews: 41.3k / 13.6k / 9.8k / 7.2k in the top 5.

## Winnable vs hopeless

- **Winnable:** dog loss / rainbow bridge (best), personalized dog memorial frames,
  "first mom then grandma now great grandma" (**4 of its top 10 are hacked-domain spam** —
  weak SERP), long-tail aunt phrases.
- **Marginal:** "today a bride tomorrow a wife".
- **Hopeless:** grandpa birthday gifts (no PDPs rank at all); "personalized great grandma
  gift" (Google collapses it to "grandma" — only 1 of 12 results is great-grandma-specific,
  so those 6 duplicate SKUs chase an intent Google does not recognise).

## Highest-leverage recommendation

**Rebuild butterlu.com as a pet-loss / rainbow-bridge memorial authority.** Pet loss is the
only theme where marketplaces do not own the SERP; the winners there are structurally
identical to Butterlu; the category rewards content (Butterlu's `/blogs/news` has **zero
posts**). Pair with review social proof — subject to `docs/06`.

## Unverified

- **No backlink data** (no Ahrefs/Moz in the analysis environment) — the biggest gap, and
  the basis of the "domain authority" claim is SERP composition, not measurement.
- **No keyword volume data** — "winnable" reflects difficulty only, not traffic value.
- Rankings come from a crawler's index rather than a geolocated logged-out Google session.
  **Trust the page-type mix over exact ordinals.**
- PersonalizationMall's body copy would not render (JS); its figures come from SERP
  snippets.
- `firecrawl_map` returned ~120 URLs against 243 products — possible orphans.

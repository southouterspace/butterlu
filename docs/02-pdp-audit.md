# 02 — Product detail page content audit

Audit of 5 top-performing and 6 underperforming PDPs, plus catalog-wide duplicate
detection. Sources: Shopify Admin API and live page crawls.

## The finding: there is no content difference

All 11 PDPs are built from the same recycled blocks. Three of the five "top performers"
(`43453`, `66288`, `20613`) run the **byte-identical** legacy Etsy boilerplate as five of
the six underperformers. **Copy quality does not separate the groups.**

The one clean 11-for-11 split is variant architecture — see finding 10 in `01`.

**Important reframe:** `43453` shows 84 human landings, but the whole store had 75 Google
organic sessions all year. The top 5 are not ranking — they are linked to from social and
referral. Comparing description quality was never going to find a search signal, because
neither group is in search.

## Defects, by impact

### 1. `seo.title` and `seo.description` are null on 243/243
The theme falls back to `title | truncate: 70`, chopping every `<title>` mid-word:
`…Custom Gift For Aunt Birthda – Butterlu Gifts` · `…Gift From G` · `…I Love My Grea`.
Store-wide. Single highest effort-to-impact fix available.

### 2. Mass duplicate titles and descriptions
- **>=62 products (~26%)** share a character-identical title. Largest clusters: 5x, 5x,
  4x, 4x, 4x, 4x, plus twelve 2x pairs.
- **~83 products (~34%)** run one of three verbatim descriptions. ~63 share this one:

  > "Thank you so much for your support of our family owned business! Hello! Welcome to
  > Boutique ButterLu!…"

With SEO fields null, identical title = identical `<title>` = identical `<h1>` = identical
image alt text.

### 3. ~104 of 243 products (~43%) target godmother/godfather/godparent
Catalog-scale self-cannibalisation. **Unverified count** — from this audit, not a
first-party enumeration. Wave 0 confirms or corrects it.

### 4. No personalisation input on a made-to-order product
Form is Color -> Quantity -> Add to cart. Copy says to leave details *"in the 'note to
seller' area during the checkout process"* — Etsy's field, which does not exist here. Per
the copy's own fallback, every order ships un-personalised.

### 5. ~83+ PDPs link buyers to Etsy
`Check out all of our designs at: www.boutiquebutterlu.etsy.com` and
`http://www.etsy.com/listing/601590680/rush-order-processing…`. Plus dead references to
nonexistent "shop announcements" and a "shipping and policies tab" — so turnaround and
shipping are answered **nowhere** on the site.

## Cluster counts

- **Great grandma: 6 products, not 4.** `43378` vs `49865` differ by one word ("Birthday")
  in an otherwise identical 116-character title. Plus `49561`, `06763`, `14941`, `07916`.
- Godparent cluster: ~104.
- Byte-identical title clusters: 5/5/4/4/4/4/3/3/3/3 plus twelve 2x pairs.

## Also observed

- Zero reviews, ratings, trust badges, turnaround copy, sizing, or related-products
  rendering on any PDP.
- Junk products live: `test` (empty description),
  `custom-order-for-kevin-c-personalized-97874`, `mama est. 2025`,
  `Print out photo and place in frame`.
- **One thing correct:** canonicals are self-referential and clean, no `?variant=` leakage.

## Unverified

**JSON-LD Product schema / `aggregateRating` presence.** The crawler strips `<script>`
tags (confirmed by control scrape) and direct HTTP to the domain was blocked from the
analysis environment. **Do not assume it is missing** — check with Google's Rich Results
Test. The absence of *reviews* is confirmed independently via metafield inspection.

# 09 · The store's SEO shape

Written 2026-11-04. How Butterlu's Etsy search strength carries over to butterlu.com, what the site does about it today, and what is left. Builds on docs/01 (diagnostic), 02 (product page audit), 03 (competitor search results), 06 (Etsy terms), 07 (stack) and 08 (catalog), plus fresh reading of Google Search Central and the Etsy Seller Handbook (links in §9).

Status words: **Shipped** means it is on main and stage. **Plan** means the work is described here and not built yet. **Owner** means Justin or Asli has to decide or supply something.

## 1. The short version

- Etsy rewards a listing that matches many phrases (title, 13 tags, attributes) and then converts. Google rewards one clear page per search intent, fast pages, real images and links from elsewhere. So Etsy tags become **body copy and FAQ topics**, never title stuffing.
- Grandparents, pregnancy announcements, godparents and weddings carry about 80% of Etsy favourites. The site already has a page for each. The biggest gaps are **Mom and Dad** and a **Christmas** page across recipients.
- Product pages could not appear in Google's merchant listings because they had no product image. **Shipped:** every product now has a 1200 px JPEG drawn at build time from its preset, used in the Product markup and as the link preview image. Asli's own photos will lead once she sends them.
- Performance is the other half of the shape, and it is measured, budgeted and tested (§7).
- Which searches to lead, what the winners look like and how rank is tracked: docs/12 (2026-11-08).

## 2. Where the demand is (Etsy, lifetime, 619 active listings)

2,033,261 views and 73,538 favourites in total. There are no sales figures in the repo (that needs Etsy OAuth, docs/08) and no Google volumes yet.

| Cluster | Favourites | Store page |
|---|---|---|
| Grandparents-to-be announcement | 10,604 | products + `new-grandparent-to-be` |
| Grandma (incl. Mimi, Gigi, Nana) | 10,486 (+3,883 large frames) | products, `grandparent-frames` |
| Parents of the couple (wedding) | 8,958 | product, `wedding-thank-you-frames` |
| Godmother | 8,713 | products, `godparent-frames` |
| Grandpa (incl. Papa) | 8,050 | products, shared collection |
| Godfather | 5,008 | product |
| Christmas, all recipients | 4,920 | **no collection** |
| Mom and Dad | 2,552 | **none** |
| Great-grandparents | about 2,100 | one announcement product |
| Baby | 2,442 | products, `baby-frames` |
| Aunt and uncle | 2,186 (+1,756 brag boards) | product, `aunt-uncle-frames` |
| Memorial (pet, baby loss, "in heaven") | 953 | pet only, `pet-loss-memorial` |

The 19 built products cover 76% of favourites. 28 unbuilt intents (3,818 favourites, including baby loss and grandparent memorials) currently redirect to `/collections/all`, which is a weak landing for that intent.

Note on docs/01 and docs/03: they propose pet loss as the way into Google. Etsy data puts pet frames at 0.7% of views. Both can be true (Google competition differs from Etsy demand), so test it with Google Trends and Search Console (§8) before writing memorial content at scale.

## 3. Page and URL structure

Shipped and kept:

- `/products/<handle>`: one page per preset design. Each is its own Product (sku = handle). Shape and background are buyer choices at the same price, so no ProductGroup or variant URLs.
- `/collections/<handle>`: one per search intent. `/collections/all` lists everything.
- `/pages/faq`, `/pages/about`, `/pages/shipping-returns`.
- Shopify URLs are kept or 301-redirected (`scripts/redirects.mjs`, 256 rules), no trailing slashes (docs/07 "URL continuity").
- `/products/<handle>.jpg`: the build-time product image (new).

Plan:

- Add `/collections/mom-dad-frames` (the old Shopify handle, so its redirect becomes a page) with first Father's Day and "daddy's little girl" designs.
- Add `/collections/christmas-frames`: one evergreen URL kept live all year, promoted in season.
- Add a memorial collection that covers more than pets, and point the baby loss and "in heaven" redirects there instead of `/collections/all`.
- Point low-volume redirects (teacher, nanny, coach) at the closest real page rather than `/collections/all`.
- Great-grandparents: docs/03 found Google folds "great grandma" into "grandma". Test before building a page.

## 4. Titles, meta descriptions and copy (Etsy listing → page)

The rules, applied per search-intent page using its preset listing plus the two or three most-favourited listings in its cluster:

1. **Title tag** (60 characters or fewer with " | Butterlu", enforced by `scripts/lint-dist.mjs`): recipient or occasion phrase plus the item noun, taken from the cluster's most-favourited phrase. One recipient, one occasion, "frame" once. No "gift idea" or "personalized gift" filler (Etsy's own guidance now drops them too). The brand is only the suffix. All 26 current titles pass.
2. **H1** (the product name): human, close to the title but not a copy of it. Exactly one H1 per product page (linted).
3. **Meta description** (about 140 to 160 characters, linted at 160): who it is for, the occasion, the price, "holds a 4x6 photo", ship time and free US shipping. Today 18 of 26 repeat "44 backgrounds" and none mention price. **Plan:** rewrite them to these rules.
4. **Intro and body:** the cluster's secondary tag phrases as real sentences (for example "pregnancy reveal", "first grandchild", "sonogram"), and nickname options (Mimi, Gigi, Nana, Abuela, Papa, Pop) as wording ideas the customizer accepts.
5. **FAQ on the page:** three to five questions per cluster from what buyers ask on Etsy (wording length, photo size, due date wording, ship time). Keep it as visible content. Google stopped showing FAQ rich results in May 2026, so the markup earns nothing; the text still helps.
6. **Alt text:** describe the actual image ("Scalloped sage-stripe frame reading Promoted to Grandparents"). Never reuse Etsy alt text: only 16% of Etsy images have it and the samples are wrong.
7. **Collection copy:** 150 to 300 words per collection: intro, occasions, wording ideas, a short FAQ.
8. **Etsy terms (docs/06):** write fresh. Never pull titles, descriptions or reviews through the Etsy API at runtime or republish them, and never scrape Etsy. Asli's own wording is hers to rewrite.

## 5. Structured data

On every product page (shipped, linted):

- `Product`: name, description, sku, brand, **image** (photos first, then `/products/<handle>.jpg`), **material** ("Wood and glass", as the page says), url.
- `Offer`: price, currency, `MadeToOrder`, new condition, free US shipping (`shippingDetails`), `MerchantReturnNotPermitted`.
- `BreadcrumbList`: Shop › collection › product, matching the visible breadcrumbs.

Site-wide: `Organization` (now named "Butterlu" to match the site name, with "Butterlu Gifts" as `alternateName`), `WebSite`, and `CollectionPage` on collections.

Not added, on purpose:

- **Etsy reviews in `aggregateRating`:** Google's rules say "Don't aggregate reviews or ratings from other websites." Only reviews collected on butterlu.com and shown on the page may be marked up (docs/04).
- **ProductGroup and variants:** see §3.

Plan, needs an owner answer first:

- `shippingDetails.deliveryTime`: handling is 3 to 5 business days (still marked PROPOSED in `SHOP.dispatch`); Google also wants **transit time**, which only the owner knows.
- Organization `logo` (needs a square raster logo, 112 px or larger) and `sameAs` to the Etsy shop (check Etsy's house rules on linking first).
- Organization-level shipping and return policy markup on the home page.

## 6. Images and media pipeline

Two kinds of image, each with the tool that suits it:

- **Frame art** (backgrounds behind the live SVG preview): `scripts/prepare-assets.mjs` with sharp makes three sizes from the 2550×3300 print sources: 1200 px (q66) for the product page preview, **520 px (q65, about 29 KB) for product cards and cart lines**, and 160 px thumbnails for the picker. These are referenced from SVG `<image>` elements, which Astro's `<Image>` cannot handle, so a prepare step is the right tool.
- **Photos** (Asli's product shots, video posters): Astro's built-in image pipeline (`astro:assets` with sharp). Put files in `src/assets/media/<handle>/` and list them in `src/catalog/media.ts` with alt text. At build time Astro writes AVIF and WebP at several widths with `srcset` and `sizes`, under hashed `/_astro/` names that are cached for a year. A missing file fails the build.
- **Product images for search** (`/products/<handle>.jpg`): drawn at build time by `src/lib/frame-raster.ts`. Text becomes outlines from the same print fonts (fontkit), so no browser is needed and the image matches the print layout.
- **Videos:** `bun run media:video <file> <handle> <name>` (ffmpeg) writes an H.264 MP4 (at most 1080 px tall, faststart, no audio unless asked) to `public/media/<handle>/` and a poster still into the photo pipeline. Workers static assets cap each file at 25 MiB; the script warns over 20 MB. The Worker serves `/media/*` itself (`worker/media.ts`) so byte-range requests get `206 Partial Content`, which Safari and iOS need to play video; static assets alone answer with the whole file.

How loading works:

- Product cards: the first row loads at once; the rest wait until scrolled near (an IntersectionObserver in `Layout.astro`, since SVG `<image>` has no `loading="lazy"`).
- Background picker: only the selected swatch loads with the page. Once the page is idle, the other swatches queue so the sheet opens painted. Hovering, pressing or focusing a swatch starts its full image early, and the preview keeps the old background until the new one has decoded, so it never flashes blank.
- Gallery: only 64 px thumbnails load with the page. Once idle, the full photos and video posters queue (the browser picks the size for the screen), so the viewer opens with them already downloaded. Video files load only when played. Ambient loops (`LazyVideo.astro`, for below-the-fold sections) load when near the screen, pause off screen and never autoplay for reduced motion.
- All idle queueing is skipped under Data Saver.

When Cloudflare Images would be worth it instead: if photos number in the hundreds and build time suffers, if customer uploads ever need resizing at request time, or if Asli wants to swap photos without a deploy. It costs money and an account setting, so it is an owner decision; build-time processing is free and cache-forever today.

## 7. Performance budget (measured)

Local measurement, phone profile (390 px, 3x, 4x CPU slowdown) and desktop (1366 px), transfer sizes:

| Page | Before (phone) | After (phone) | After (desktop) |
|---|---|---|---|
| Home | 621 KB | 206 KB | 293 KB |
| Shop all | 2,002 KB | 282 KB | 436 KB |
| Product page | 541 KB | 184 KB before idle (about 290 KB once the picker swatches queue) | 289 KB |
| FAQ | 91 KB | 87 KB | 87 KB |

LCP under 0.5 s locally on every page, CLS 0. Google's "good" thresholds are LCP within 2.5 s, INP under 200 ms and CLS under 0.1. A new site will have no field data for months, so use Lighthouse on stage and Cloudflare Web Analytics.

What made the difference: card-size backgrounds (they had been loading 1200 px images at about 170 KB each), lazy card art below the first row, WOFF2 frame fonts, and `public/_headers` caching (`/_astro/*` for a year, immutable; backgrounds and fonts for a week).

Rules that keep it there: no UI framework in the browser (native dialog, popover, details and select; see the UI section of the app README); the product page ships about 8 KB of script; justify any new dependency against these numbers.

## 8. Sitemap, robots and internal linking

- `sitemap.xml` lists every page with absolute canonical URLs. No `lastmod` until it can come from real content changes (Google ignores inaccurate dates; `priority` and `changefreq` are ignored).
- `robots.txt` now blocks only `/api/`. `/cart` and `/checkout` carry `noindex`, and a crawler must be allowed to fetch a page to see its `noindex` (shipped, tested).
- Canonical tag on every page, one title, one description (linted). Fixed 2026-11-04: canonicals and og:url had carried the build file name (`/index.html`, `/products/<handle>.html`) because of `build.format: 'file'`; they now match the served URLs, and a lint rule keeps it that way.
- Internal links today: header nav to the main collections, breadcrumbs, four related products from the same collection, home page to collections and best sellers. **Plan:** add the memorial and aunt-and-uncle collections to the footer, link each collection to two or three sibling collections ("Also for…"), and link product intros to their collection with a descriptive phrase.

## 9. Research to run next

All free and official; each one decides something.

1. **Etsy Stats, "How shoppers found you"** (Asli's login): the real queries behind each listing. Best input for §4.
2. **Etsy Marketplace Insights** (in Stats): search counts per keyword. Sizes Mom and Dad, Christmas, great-grandparents and memorial.
3. **Google Trends:** tests the pet-loss idea against the grandparent theme, sets publish dates for seasonal pages, compares Mimi, Gigi and Nana.
4. **Google Search Console** once the new site is verified: queries and impressions per page; which redirected intents deserve pages.
5. **Google Merchant Center free listings:** the Shopping tab at no cost, now possible with product images.
6. **Pinterest Trends:** Pinterest was the old site's second-largest human source.
7. **Rich Results Test on stage** for the Product markup.
8. **Etsy OAuth `transactions_r`** (docs/08): rank pages by sales instead of favourites.

Sources: Google Search Central on [product](https://developers.google.com/search/docs/appearance/structured-data/product) and [merchant listing](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing) markup, [review snippets](https://developers.google.com/search/docs/appearance/structured-data/review-snippet), [breadcrumbs](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb), [images](https://developers.google.com/search/docs/appearance/google-images), [title links](https://developers.google.com/search/docs/appearance/title-link), [snippets](https://developers.google.com/search/docs/appearance/snippet), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro), [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals) and [updates](https://developers.google.com/search/updates); Etsy Seller Handbook on [how search works](https://www.etsy.com/seller-handbook/article/how-etsy-search-works/375461474487) and [keywords](https://www.etsy.com/seller-handbook/article/keywords-101-everything-you-need-to-know/382774281517).

## 10. Owner decisions

1. **Photos and videos:** Asli sends originals (not Etsy downloads, which are compressed and fall under docs/06), with a line on what each shows. They go in `src/assets/media/` and `public/media/`. Videos are committed after transcoding (usually 1 to 5 MB); say if you would rather host them in R2 or Cloudflare Stream.
2. **Transit time** for shipping markup, and confirm the 3 to 5 day handling time.
3. **New collections:** Mom and Dad, Christmas, and a wider memorial page. Each needs a preset design or two.
4. **Meta description rewrite** to §4 rules (price, 4x6, ship time): proceed by default unless you want to review the wording first.
5. **Square logo** for Organization markup, and whether to link the Etsy shop from the site.

# 12 · Leading Google results

Written 2026-11-08. Goal (Justin, 2026-11-08): make butterlu.com a leading result for
its searches, with agents measuring and iterating. Builds on docs/03 (September search
check) and docs/09 (the SEO shape). Raw data: `plans/serp/` (tracked searches, the first
snapshot, and the research files under `research/2026-11-08/`).

How sure this is: medium. Results come from a crawler's index (Firecrawl, location United
States), not a logged-out Google session, so trust the kind of page that ranks more than
exact positions. Google Trends is relative, not volume. There's no backlink data. Search
Console after launch replaces all of this with real impressions and positions (§6).

## 1. The short version

- **Where we stand.** butterlu.com is in the top 10 for 2 of 62 tracked searches (the old
  Shopify aunt and uncle page at #8 for "uncle picture frame", and the homepage at #4 for
  "boutique butterlu", where the ButterLu Etsy shop is #1). One ButterLu Etsy listing
  appears (#5 for "love at first sight ultrasound frame"). Google corrects "butterlu" and "butterlu gifts" to "butterfly":
  **it doesn't know Butterlu as a brand yet.**
- **Authority.** butterlu.com has 58 ranking keywords against 3k (Pet Memory Shop) to 70k
  (Personalization Mall). We can't win broad gift searches ("grandpa gift", "engagement
  gift") for a long time. Those go to marketplaces, national brands and gift listicles.
- **Where we can lead.** Exact frame searches where small shops already rank with weak
  pages: godparent frames, grandma nicknames (Mimi, Gigi, Nana, Papa), "personalized
  grandpa frame", "promoted to grandparents frame", "father of the bride picture frame",
  "daddy's little girl picture frame", personalised mom frames, pet and baby memorial,
  Christmas frames for grandparents. Small shops win these with **an exact-match product
  page or a tight collection page**, $20 to $40, and a ship-time line, often with broken
  titles and zero reviews.
- **What beats them.** Our markup is already more complete than almost every competitor
  (§3). The gaps are thin collection pages, no reviews shown, missing nickname and
  seasonal pages, and the brand itself.

## 2. What the winners look like (70 pages audited, 34 taken apart)

| | Collection page winners | Product page winners | butterlu.com today |
|---|---|---|---|
| Words of copy | median 90; the best 300 to 1,600 | median 345 | collections about 30; products about 340 with the configurator |
| FAQ | 2 of 13 (the #1 for "father of the bride gift" has 7) | 1 of 15 | none on collections or products; one FAQ page |
| Products listed | median 33 (12 to 140) | — | 2 to 5 per collection |
| Links to sibling collections | median about 60 (0 to 200) | — | header nav only |
| Exact search phrase in title start | 6% to 9% of all pages | | most titles start with it |
| Product markup | | 15 of 15 | yes, with Offer |
| Shipping and return markup | 0 of 13 | 0 of 15 | **yes** |
| Rating markup | rare, often broken | 5 of 15 (from 1 to 33 reviews) | **no reviews** |
| Description with price, shipping or reviews | 3%, 12% to 18%, 0% | | shipping no, price no |
| Delivery promise visible | nearly all | nearly all | yes, on the page |
| Live personalisation preview | | 1 to 2 of 15 | **yes, every product** |

Notes from the audit:
- Things Remembered serves `noindex, nofollow` on two pages that still rank; national brand
  pages here are fragile.
- Hallmark ranks a frame marked out of stock, and Target ranks bare search pages. Google
  is short of good pages for these searches.
- Title truncation and mismatched titles are common on Shopify shops; ours are linted to 60
  characters.
- Count titles ("140 Wedding Day Gifts for Dad", Etsy's "60+ Gift Ideas for 2026") win
  the broad gift searches. They suit a gift-guide article, not a product page.

## 3. Moves our store can make that Etsy can't

1. **Merchant listings and free Shopping results.** Our own Product markup with price,
   free shipping, returns and (once confirmed) delivery time makes product pages eligible
   for merchant listing rich results and the Shopping tab. Etsy's listings rank as Etsy.
   A Merchant Center account with a product feed (`/feeds/google-products.xml`, build it
   from the catalog) puts every preset in free Shopping listings. **Owner:** create the
   Merchant Center account and verify the domain.
2. **One page per exact search, at no extra stock cost.** Every page is a preset of one
   configurable frame, so a page for "Mimi picture frame", "Nana picture frame", "Papa
   picture frame", "Abuela picture frame" or "first Christmas as grandparents frame" is a
   new preset plus copy, not a new product. Etsy listings compete with each other for the
   same shop slot; our pages each target one phrase.
3. **The live preview.** Only 1 or 2 of 15 winning product pages show a preview. Lead with it in
   titles and descriptions ("see your words before you buy") and in the product image.
4. **Copy and FAQs that answer the buyer.** Wording ideas for a godmother proposal, what to
   write on a grandparent announcement, Spanish nicknames for grandma, how to frame an
   ultrasound. Etsy listings can't hold this; it's how the best collection pages win and
   how we take the "ideas" searches that lean to Pinterest, The Bump and What to Expect.
5. **Reviews on our own pages.** Stars show in results from as few as 1 to 4 reviews.
   Etsy's 13,687 reviews can't be copied over (docs/06), so collect our own: a review
   request after delivery from the first orders. **Owner:** pick the review tool; until
   then, nothing is marked up.
6. **A real brand.** Google treats "butterlu" as a typo. Fix it with one name everywhere
   ("Butterlu"), Organization markup with `sameAs` to the Etsy shop, Instagram and Facebook
   pages, links to butterlu.com from those profiles (check Etsy's rules before linking from
   the shop, docs/06), and branded searches over time. **Owner:**
   confirm which profiles are hers and what `boutiquebutterlu.com` is: it ranks #3 for
   "boutique butterlu" with "7–14 day delivery" and splits the brand if it's a second store.
7. **Pinterest.** Pinterest is in the top 10 for 54 of 62 searches. Pins that link to our
   pages, with the build-time product image, rank in Google and send traffic that Etsy
   pins send to Etsy.
8. **Speed.** Already shipped and measured (docs/09 §7): product pages about 200 KB on a
   phone. Competitor page weight wasn't measured in this pass.

## 4. Where to lead first

Scored on beatability from the snapshot (1 hard to 5 easy), Etsy demand (favourites) and
Google Trends demand.

| Wave | Searches | Page | Why |
|---|---|---|---|
| 1 | godmother/godfather proposal and baptism frames, "godparents gift personalized" | godparent collection + 4 products (exist) | Beatability 3 to 5 (mean 3.75); shops ranking have 0 reviews; Etsy 8,700 + 5,000 favourites |
| 1 | Mimi, Gigi, Nana, Papa, Abuela picture frame | **new nickname presets** under grandparent frames | Beatability 4 to 5; Hallmark's Nana page is out of stock |
| 1 | "personalized grandpa frame", "papa picture frame" | grandpa products (exist) | Small shops at #1, #2, #5 |
| 1 | "father of the bride picture frame", "mother of the groom gift frame" | wedding collection, add a mother of the groom preset | 28 Collective #1 with a thin page |
| 1 | "promoted to grandparents frame" | grandparents-to-be collection | Beatability 5, thin pages at 6 to 10 |
| 2 | "daddy's little girl picture frame", "first fathers day picture frame", "mom picture frame personalized" | **new** `mom-dad-frames` collection | Small engravers hold 5 slots; Father's Day spike is 5x |
| 2 | pet memorial, rainbow bridge, miscarriage memorial | pet memorial + **new** baby memorial page | Small specialists lead; year-round demand; needs caring copy |
| 2 | "personalized christmas frame for grandparents", "first christmas as grandparents" | **new** `christmas-frames` | No real winner; too late for 2026, live by September 2027 |
| 3 | "aunt brag board frame", great aunt | aunt and uncle collection | No exact match on page 1, but the brag board isn't a product on the site yet |
| skip | "grandma picture frame", "grandpa birthday gift", "engagement gift", "first grandchild announcement gift" | — | Marketplaces, big brands or editorial; revisit with a gift guide once the domain has authority |

Timing (Trends peaks, allow 3 to 4 months to rank): Mother's Day 2027 pages by early
February; godparent spring season by January; first Father's Day by early March;
Christmas 2027 by September; pregnancy announcement pages for the January peak by
October 2027.

## 4b. One product, many designs (Justin, 2026-11-08; one frame since 2026-11-11)

Butterlu sells one product: a personalized picture frame. Shape, background and the
words are choices on it, not things the store sells (owner, 2026-11-11). The store is
shaped around that:

- **One frame page** (`/products/personalized-picture-frame`, shown as "Create your own
  frame"): the customizer from plain wording, one price, and every design below it.
  Marked up as a `ProductGroup` (`variesBy` pattern) whose variants are the designs. The
  old `/products/scalloped-picture-frame` and `/products/rounded-picture-frame` 301 here
  (`src/catalog/retired.ts`), and a cart saved under either still checks out.
- **Design pages** keep one page per exact search (godmother, Mimi, ultrasound), because
  those are what rank. Each opens the frame with the design loaded and offers 8 wording
  ideas to tap. Marked up as a `Product` with `isVariantOf` the frame's group and
  `pattern` set to the design.
- **Categories are hubs**: "Ready-made designs" first, then "Create your own frame",
  then the copy and questions.
- **One price** for the frame and every design (`FRAME_PRICE_CENTS`, $39 with free US shipping, set by the owner 2026-11-08).
- **Shopping feed**: one item per page, `item_group_id` = the frame, `pattern` = the design.

## 4c. Shop-by taxonomy (owner said build it, 2026-11-08)

Shoppers browse an organized tree instead of one long list of designs. The source is
`apps/site/src/catalog/taxonomy.ts`; the build fails on an untagged design or a tag that
contradicts its category.

- **Who It’s For** (first menu): Grandparents (Grandma, Grandpa, Both Grandparents,
  Great-Grandparents), Godparents (Godmother, Godfather, Both Godparents), Parents of
  the Bride or Groom, Aunts & Uncles, New Baby, Pet Memorial Gifts (Asli's labels,
  2026-11-11). Each group opens its existing category page; a person opens it filtered
  (`?for=grandma`). Parents of the bride or groom share the wedding page with couple
  frames, so that link opens it filtered. Couple frames sit under the Wedding and
  Engagement occasions only, in a group kept out of the menus.
- **Occasion** (second menu): only occasions with a design. Pregnancy Announcements,
  Baptisms & Christenings, Weddings and Pet Memorials open the category page that holds those designs (the
  build checks each tagged design is on it); the rest open Shop all filtered (`?occasion=christmas`). Pet Memorials becomes
  "In Memory" once other memorial designs exist.
- **Shape is not a filter** (owner, 2026-11-11): every design can switch shape in the editor.
- **Labels are Title Case and use "&" for "and"** (owner, 2026-11-11), as in "Baptisms & Christenings".
  This covers menu and chip labels, buttons and button links, nav and footer links and form labels.
  Product and category names (so their h1s) follow it too (owner, 2026-11-11), matching the admin's check; descriptive headings like "Ready-made designs" stay
  in sentence case. One `toLabel` in `src/catalog/check.ts` defines it for the store and the admin, and
  `scripts/lint-dist.mjs` fails the build on a label that breaks it.
- **Personalize is the only way into the editor** (owner, 2026-11-11): every design card, product page and create-your-own block says Personalize, never "Add Your Words". `scripts/lint-dist.mjs` fails the build on that phrase in any case. Headings and helper text frame it as the whole design, not just the words ("Your design, start to finish").
- Each design is tagged once with a person and with the occasions in its "good for" list.
- **No new indexed pages.** A filtered view keeps its category's canonical URL and is
  built from the same HTML, so filters never split ranking. A new indexable category is
  added only for a searched term with 3 or more designs that no category covers yet
  (wave 2 adds Parents, Christmas and memorial designs this way).
- Where it shows: header menus (desktop panels, phone sheet sections), filter chips on
  every category page (painted with the page and applied before first paint, so no
  layout shift), a "Who is it for?" block on the home page, "Shop more designs" links on
  each design page (only links that open more than that design), and the feed's `product_type`
  (Picture Frames > frame > group > person).

## 5. Page standards (what every page ships with)

Collection page:
- Title starts with the search phrase; description under 160 characters with the free
  shipping promise and the live preview.
- 300 to 600 words below the grid: who it's for, the occasions, wording ideas, how the
  photo fits.
- A 5 to 8 question FAQ, visible on the page (no FAQ rich results expected; Google limits
  them to authoritative health and government sites, but the answers are what searchers
  ask).
- CollectionPage plus ItemList markup; BreadcrumbList.
- Links to 4 to 8 sibling collections and nickname pages.

Product page:
- The exact phrase in the URL, H1 and title.
- 3 FAQs specific to the design; the delivery line; the live preview.
- Product, Offer, shipping, returns and delivery time (waits on the owner's transit days);
  AggregateRating only from real reviews on our site.

## 6. Measuring and iterating

- **Rank tracking** (shipped): `plans/serp/queries.json` lists 62 searches, the first
  snapshot is `plans/serp/snapshots/2026-11-08.json`, and `node scripts/serp-report.mjs`
  compares snapshots. The loop is in `plans/serp/README.md`. Baseline: butterlu.com is top
  10 on 4% of searches weighted by priority, top 3 on none.
- **Search Console and Bing Webmaster Tools**: the ground truth for impressions, clicks
  and position per query. **Owner:** verify the domain (a DNS record, or a meta tag we
  add once you have the code). Submit `/sitemap.xml`.
- **Funnel events** (shipped, docs/11): landing views record the referrer host, so Google
  visits can be followed to checkout and orders.
- **Merchant Center**: Shopping impressions and clicks once the feed is live.
- A weekly snapshot needs a routine; the main chat sets it up on Justin's word.

## 7. Change log

Record each change that could move rankings, so the next snapshot can be read against it.

| Date | Change | Pages |
|---|---|---|
| 2026-11-08 | Baseline snapshot taken; nothing changed yet | all |
| 2026-11-08 (stage only) | Wave 1: about 330 words of copy and 6 FAQs under each collection grid, CollectionPage with ItemList and FAQPage markup, sibling collection links; new Mimi, Nana, Papa, Abuela and mother of the groom pages with 3 FAQs each; Organization `sameAs` to the Etsy shop; Merchant Center feed at `/feeds/google-products.xml`. Not public until a Release. | 7 collections, 5 new products, home |
| 2026-11-08 (stage only) | Two products, many designs (§4b): frame pages, designs as variants with wording ideas, category hubs, one price, feed grouped by frame. | all products and collections |
| 2026-11-08 (stage only) | Price set by the owner: $39 with free US shipping for both frames and every design (was $35.95 proposed). Product pages, checkout and the Shopping feed read the one constant. | all products, feed |
| 2026-11-08 (stage only) | Shop-by taxonomy (§4c): who-it's-for and occasion menus, filter chips on categories, home page block, design-page links, feed product_type. No new indexed URLs. | all pages, feed |
| 2026-11-11 (stage only) | Asli's menu labels (§4c): Pets renamed Pet memorial gifts; Weddings leaves Who it's for and stays an occasion; Parents of the bride or groom becomes its own group. Feed product_type follows; home tiles drop their design counts (owner). No new indexed URLs. | menus, home, feed |
| 2026-11-11 (stage only) | Category pages lead with "Ready-made designs"; each card adds the design as shown in one tap (designs with no names or dates, PROPOSED list in products.ts) or opens it to personalize; the blank frames follow as "Create your own frame". Cards show the $39 price. | all collections, home, design pages |
| 2026-11-11 (stage only) | The scalloped and rounded frames merge into one Personalized picture frame (owner); the old pages 301 to it. Shape is no longer a filter chip on Shop all. | frame page, Shop all, feed |
| 2026-11-11 (stage only) | Labels go Title Case with "&" (owner), checked at build. Product and category names follow it too (owner), so product h1s, Product markup `name`, cart and Stripe line items, and the feed's `product_type` change case (e.g. "Aunts & Uncles"). Collection and design intros cut to one line; the home hero becomes three short items. No URL or page title changes. | menus, chips, buttons, home, all collections and designs |
| 2026-11-11 (stage only) | The editor moves to its own screen, `/products/<handle>/personalize`, canonical to the product page and left out of the sitemap. Product pages lose the editor and "How it works", and gain a preview with Add to Cart and Personalize side by side, plus room for photos and reviews. No URL, title or markup change on product pages. | all design and frame pages |
| 2026-11-11 (stage only) | Personalize is the first, main button on every product page and design card (owner: "anything can be personalized"); Add to Cart as shown sits beside it where offered. | all design pages, all collections, home |

# C — The off-Etsy online market for personalised frames, and a channel playbook for butterlu.com

Research date: 2026-10-12. Scope: online only (butterlu.com plus online marketplaces). No physical
retail, no wholesale (owner scope update, 2026-10-12). This file builds on `docs/03-competitor-serp.md`
and does not repeat it. That doc covers who ranks on Google. This one covers what competitors sell,
at what price and speed, the size and timing of demand, and which channels to use.

No etsy.com page was fetched. Amazon and Walmart product pages blocked automated fetches (HTTP 500 and
a bot check), so figures for those two come from search-result snippets and are marked that way.
Firecrawl hit its free rate limit early on, so this work used WebSearch and WebFetch.

Each section separates **Verified** (seen on the cited page or snippet on 2026-10-12) from
**Inference** (my reading of the facts). Prices are what the page showed that day. Most of these
sites run permanent "sale" pricing, so list prices mean little.

---

## 0. Five findings that change the plan

1. **The big national personalised-gift DTC brands have lost most of their value.** 1-800-Flowers
   paid $245M for PersonalizationMall.com in 2020. On 2026-09-29 it agreed to sell PersonalizationMall
   *and* Things Remembered to PlanetArt for about **$45M** combined. (Verified, see §1.3.)
2. **Nobody else sells ButterLu's product.** Almost every competing frame is engraved wood or engraved
   glass with one or two lines of text. ButterLu's full-colour printed background with fully custom
   text is unusual off Etsy. Zazzle and Shutterfly print in colour, but they sell generic templates,
   not occasion-specific keepsakes. (Inference from §1.)
3. **Fast shipping is expected.** PersonalizationMall, Lifetime Creations, 28 Collective and
   GiftsForYouNow all say "ships in 1–2 (business) days". (Verified.) ButterLu's own production time
   is not recorded in the repo. **That is a gap the owner has to fill.**
4. **Cold paid traffic costs more than one frame earns.** The median Meta cost per purchase is
   $38–49 (2025–26 benchmarks), against a ButterLu order of about $25–38. Paid social can only pay
   off through repeat orders, bundles, or a second frame for the other set of parents.
   (Verified benchmarks, inferred economics, §4.)
5. **The best repeat-purchase signal is a date the customer gives you.** A buyer who orders a
   grandparents-to-be frame has also told you the due date. From that date follow new-baby, baptism or
   godparents, first-Christmas, Grandparents Day and Mother's Day gifts. 1-800-Flowers built
   "Celebrations Reminders" for this. (Verified that the program exists; inferred for ButterLu.)

---

## 1. Direct competitors

### 1.1 Comparison table (comparable personalised tabletop photo frame)

| Competitor | Comparable product and price (2026-10-12) | Personalisation UX | Production / shipping | Reviews | Positioning |
|---|---|---|---|---|---|
| **PersonalizationMall** | "Special Grandma" 4x6 frame, **$27.99**, personalisation included. Memorial glass 4x6 frame, **$24.49** (list $34.99). | Two-line sentiment, block or script font. A Groupon page says you can view the design before buying. Character limits not stated. | **Ships in 1–2 days**, express options available. | Special Grandma: **4.9★ / 24**. Memorial frame: **4.7★ / 672**. | "Always free personalization", "Fast turnaround 1–2 days" (marketing emails). Also sold on Target.com as a third-party seller ($34.99, 0 reviews, out of stock). |
| **Things Remembered** | Wedding frames from **$19.99** (sale) to $195. | Engraved, with "Write Your Own Message" options. No limits or preview shown. | Not stated. Free shipping over $99. | Wedding category: **4.8★ / 316** in total. | Ran mall stores until its 2019 Chapter 11. Now online only, run inside PersonalizationMall. |
| **Shutterfly** | Text Overlay Border tabletop framed print, 4x6/5x7/8x10, **$24.99** (list $34.99). Crosshatch wood frame from $17.99. | Photo-first online designer; customisable colours and text overlay; "Ask Paige" AI helper. | Not stated. Free economy shipping over $99 with code. | Not shown. | Prints your photo in a frame. Generic templates, not themed by recipient. "Made and personalized in the USA." |
| **Zazzle** | 21,354 frame results. Themed frames mostly **$26.91–$50.45** after a standing 15% off ("Newborn Picture Frame Keepsake" $26.91; "Promoted to Grandpa" $31.03; "Any Text Godparents" magnetic frame $26.91). | Design tool, "Create your own", any-text templates. | Third-party sources: made in about 24h, then 4–7 business days standard shipping. Not checked for frames. | None shown on category pages. | A print-on-demand marketplace for independent designers. Zazzle Plus (about $19.95/yr) gives free shipping. **Closest structural copy of ButterLu: occasion pages over generic blanks.** |
| **Mark & Graham** (Williams-Sonoma) | Classic Photo Frame **$49–$119**; Silver Message frame **$59**; leather frames $125–$139. | Engraving or monogram, "50+ monograms and type treatments". | "Quick Shipping" banner, no times. | Not shown. | Premium monogram brand. Above ButterLu's price band. |
| **Uncommon Goods** | "Breaking News" personalised photo frame, **$45**. | Two text lines, **45 characters each**, photo upload with a crop note. Live preview not confirmed. | Made to order by the artist. "Ships no later than 10/15/2026" for an order on 10/12, so about 3 days. Not returnable. | 0 on this product (the "1,502" in one snippet looks like another item). | A curated maker marketplace. Its personalised prints run $75–$175. |
| **Minted** | Custom text art from about **$32–$38** (old snippet, page is 10+ years old). Pages returned 403. | — | — | — | Framed art and stationery, not tabletop keepsake frames. A weak direct competitor. |
| **Amazon (regular and Handmade)** | Grandparent ultrasound frame **$24.99** (snippet). Over 20,000 results for "personalized picture frames". | Amazon Custom: text fields, image upload, dropdowns. | Seller-fulfilled. Personalised items cannot use FBA. | Handmade grandparent frames seen: **The Gifted Oak 10 and 3 ratings, Granite City Gift Co. 2** (snippets). | Fragmented. No high-review leader for this niche in the snippets. |
| **Walmart** | Personalised grandparent frames **$17.99–$79.95**; "Baby Announcement Frame for Grandma" **$49.79** (snippets). | Two personalised lines on some items. | Not seen. | Not seen. One frame showed 21 reviews at $95.88. | Third-party marketplace sellers. Ranks on SEO weight (see `docs/03`). |
| **Precious Moments** | "Love at first sight" elephant 4x6 frame **$32**, *not personalised*. `docs/03` recorded a $64.50 bride frame. | Mostly fixed sentiments. | Free shipping over $79.99. | **5.0★ / 1**. | Figurine-brand gift frames. Little personalisation. |
| **Hallmark** | No personalised frame found on hallmark.com. Photo-frame products are Keepsake ornaments (about $23). | — | — | — | Not a competitor for custom frames. Its photo-frame ornaments compete for first-Christmas and new-baby gifts. |

Sources: [PersonalizationMall Special Grandma](https://www.personalizationmall.com/Personalized-4x6-Picture-Frames-Special-Grandma-i43265.item?productid=16234) ·
[PersonalizationMall memorial frame](https://www.personalizationmall.com/Personalized-Glass-Memorial-Picture-Frame-We-Shall-Meet-Again-p10896.prod) ·
[PersonalizationMall emails on Milled](https://milled.com/personalizationmall-com/fridays-free-shipping-uSxjdizMMpWRdv2I) ·
[Groupon PM page](https://www.groupon.com/deals/personalization-mall-1440) ·
[PM on Target](https://www.target.com/p/personalization-mall-blush-bloom-4x6-photo-frame-horizontal/-/A-1012792343) ·
[Things Remembered wedding frames](https://www.thingsremembered.com/Engraved-Wedding-Gallery-5x7-Opening-Picture-Frame-p46872.prod) ·
[Shutterfly Text Overlay](https://www.shutterfly.com/p/personalized-gifts/tabletop-framed-prints/text-overlay-border-tabletop-framed-prints) ·
[Shutterfly wooden frames](https://www.shutterfly.com/a/wooden-photo-frame/) ·
[Zazzle frames](https://www.zazzle.com/c/frames) · [Zazzle grandma frames](https://www.zazzle.com/grandma+picture+frames) ·
[Zazzle Plus pricing (third party)](https://www.topbubbleindex.com/blog/zazzle-plus-worth-it/) ·
[Mark & Graham frames (search snippets)](https://www.markandgraham.com/products/silver-5x7-photo-frame/) ·
[M&G Silver Message](https://www.markandgraham.com/products/silver-message-photo-frame/) ·
[Uncommon Goods Breaking News frame](https://www.uncommongoods.com/product/breaking-news-personalized-photo-frame) ·
[Minted custom art (old)](https://www.minted.com/custom-art) ·
[Amazon ultrasound frame](https://www.amazon.com/Grandparents-Ultrasound-Pregnancy-Announcement-Personalized/dp/B0CWLVN9LH) ·
[Amazon Handmade Gifted Oak](https://www.amazon.com/Personalized-Great-Grandparents-Picture-Frame/dp/B01ES0PODA) ·
[Walmart grandma announcement frame](https://www.walmart.com/ip/Personalized-Baby-Announcement-Frame-Custom-Pregnancy-Reveal-for-Grandma-New-Grandma-Gift-Ultrasound-Baby-Photo-Frame-Due-Date-Reveal/18822666693) ·
[Precious Moments elephant frame](https://www.preciousmoments.com/products/love-at-first-sight-elephant-4-x-6-photo-frame-resin-glass)

### 1.2 Niche DTC brands that rank for ButterLu's recipient searches

These turned up when I searched the specific recipient queries (grandparents-to-be, parents of the
bride, godparents). They are the true peer set: small sites, one product type, organised by
recipient.

| Brand | Example and price | UX | Speed | Reviews on PDP | Positioning |
|---|---|---|---|---|---|
| **Lifetime Creations** (lifetimecreations.net, Merrillville IN) | Godparents frame **$24.99**. Parents of bride/groom frame (black) **$32.99–$44.99**. | Size and orientation picker, recipient dropdown, 40-character "Bottom Line" field, a "view your personalization" control. | "Engraved and shipped within **1–2 business days**", delivery 3–5 days. | None shown. | "Personalized in Indiana • Ships Fast • Satisfaction Guaranteed", 60-day guarantee. Laser-engraved alder. **A whole store laid out as recipient pages, structurally the closest peer.** |
| **LifeSong Milestones** (Ohio) | Grandparents baby announcement double frame **$69.88**. "Promoted to Grandparents" sonogram frame **$39.99**. "Loving Parents" wedding frame $69.99. | Free laser engraving of name, date, weight, size. No preview. | 3–4 business days production plus 2–3 shipping. | None shown. Many colours sold out. | "Hand-made in the USA", family-owned. Premium price. |
| **28 Collective** | Godparents glass frame **$49.99**. "To Our Loving Parents" wedding frame. | Child's name in a fixed verse. No preview stated. | "Ships in 1–2 business days". Free shipping and personalisation. | None shown. | Gift-boxed glass frames for faith occasions and weddings. |
| **GiftsForYouNow** | "To My Godparent" glass frame **$27.99**, gift box +$4.99. | **The most complete UX found**: free personalisation, a "View Your Personalization" preview with "Regenerate", photo crop/sepia/B&W/rotate, a colour-clash warning, and a required "I accept the personalization" checkbox. | "Ships in 1–2 days" (Woodridge IL). | None shown. | Free shipping over $65, Afterpay, standing 20%-off code. `docs/03` found it at #3 for aunt searches with 1 review. |
| **Alterd Industries** | "When a Child Is Born So Are Grandparents" wood frame **$28.50**. | Engraved name or year. | — | — | Suggests using a sonogram photo for the announcement. |
| **Callie** | Wooden ultrasound frame **$18**. | Engraved name and due date. | 1–5 business days processing. | 5.0 / 1. | App-driven gift marketplace, 99-day returns. |

Sources: [Lifetime Creations godparents](https://www.lifetimecreations.net/personalized-godparents-picture-frame/) ·
[Lifetime Creations parents frame](https://www.lifetimecreations.net/personalized-parents-of-bride-groom-picture-frame-black/) ·
[LifeSong grandparents double frame](https://www.lifesongmilestones.com/products/only-the-best-parents-get-promoted-to-grandparents-personalized-new-baby-birth-announcement-picture-frame-for-newborn-boys-and-girls-photo-frame-for-expectant-mom-holds-2-4x6-photos) ·
[LifeSong sonogram frame](https://www.lifesongmilestones.com/products/only-the-best-parents-get-promoted-to-grandparents-personalized-new-baby-birth-announcement-picture-frame-for-newborn-boys-and-girls-custom-engraved-photo-frame-for-new-nana-mimi-and-grandpa-cherry) ·
[LifeSong wedding parents](https://www.lifesongmilestones.com/products/personalized-wedding-picture-frame-for-bride-and-groom-for-parents-mom-and-dad-thank-you-gift-exclusively-from-lifesong-milestones) ·
[28 Collective godparents](https://28collective.com/products/personalized-godparents-glass-picture-frame) ·
[28 Collective parents](https://28collective.com/products/personalized-to-our-loving-parents-wedding-picture-frame) ·
[GiftsForYouNow godparent](https://www.giftsforyounow.com/to-my-godparent-glass-picture-frame-g915721.aspx) ·
[Alterd Industries](https://alterdindustries.com/products/when-a-child-is-born-so-are-grandparents-wood-frame) ·
[Callie](https://www.callie.com/personalized-wooden-ultrasound-picture-frame-with-baby-name-and-date-pregnancy-baby-announcement-gift-for-grandparents-new-parents)

### 1.3 Market structure: consolidation and lost value (verified)

- Feb 2020: 1-800-Flowers agreed to buy PersonalizationMall.com from Bed Bath & Beyond for $252M,
  later amended to $245M. The deal closed 2020-08-03. PM revenue was about $171.2M in its FY2020.
  ([BusinessWire](https://www.businesswire.com/news/home/20200803005731/en/1-800-FLOWERS.COM-Inc.%C2%AE-Completes-Its-Acquisition-of-PersonalizationMall.com%C2%AE),
  [SEC 8-K/A](https://www.sec.gov/Archives/edgar/data/1084869/000143774920021273/ex_207318.htm))
- 2019: Things Remembered filed Chapter 11 with about 400 stores, and Enesco bought most of it
  ([Bloomberg Law](https://news.bloomberglaw.com/bankruptcy-law/things-remembered-files-for-chapter-11-bankruptcy-in-delaware)).
  Jan 2023: 1-800-Flowers bought Things Remembered's e-commerce assets for **$5.0M**
  ([vectorshift summary](https://vectorshift.ai/research/deals/1-800-flowers-com-things-remembered-e-commerce-assets-2023)).
- **2026-09-29: both brands go to PlanetArt for about $45M cash**, expected to close within weeks.
  PlanetArt already owns Personal Creations, Gifts.com, CafePress, FreePrints, SimplytoImpress and
  I See Me!. 1-800-Flowers' Q4 revenue fell 12.9% year over year.
  ([Retail Dive, 2026-09-30](https://www.retaildive.com/news/1-800-flowers-sells-personalizationmallcom-things-remembered/831762/),
  [ASI Central, 2026-10-01](https://members.asicentral.com/news/industry-news/october-2026/planetart-to-buy-personalizationmallcom-things-remembered-from-1-800-flowerscom/),
  [Chain Store Age](https://chainstoreage.com/1-800-flowerscom-inc-sells-personalizationmallcom-things-remembered))

**Inference.** A national brand selling a wide catalogue of personalised gifts, bought for $245M and
sold for about $45M six years later, means the broad-catalogue model is losing ground. The likely
winners are marketplaces (Etsy, Amazon) and focused niche brands. That favours ButterLu's plan: one
hero product, many recipient pages. The threat is that PlanetArt runs many brands on one cheap
production base and promotes hard, which puts downward pressure on price in the $25–35 band.

### 1.4 What the competitor set tells ButterLu (inference)

- **Price.** National and niche frames comparable to ButterLu cluster at **$25–$50**. Mark & Graham
  and LifeSong sit above $50. ButterLu's $25–38 is mid-market. There is no case for the $16.06
  Shopify price, and room exists for a premium two-pack (both sets of parents, or both grandparents
  households).
- **Product.** Engraved wood or glass with fixed verses is the norm. ButterLu can differentiate on
  **colour and pattern (44 backgrounds) plus fully custom text**. That only shows up in a **live
  preview**. GiftsForYouNow's preview, regenerate, accept-proof flow sets the bar. Uncommon Goods
  shows the character-limit norm (2 × 45 characters).
- **Speed.** "Ships in 1–2 business days" is what peers promise. If ButterLu's real production time
  is longer, the site should show a dated "arrives by" estimate rather than hide it.
- **Reviews.** Off Etsy, review counts on product pages are tiny: 0–24 for most, 672 at best for an
  old PM product. 13.7k Etsy reviews would be an overwhelming advantage if they could be shown.
  That waits on G5 (`docs/06`). Without them, ButterLu starts at zero like everyone else.

---

## 2. Other marketplaces and platforms

| Channel | Fees (verified unless noted) | Access | Fit for ButterLu |
|---|---|---|---|
| **Amazon Handmade** | 15% referral fee. Sources disagree on the minimum ($1.00 or $0.30). The $39.99/mo Professional fee is waived once approved, but the first month is paid regardless. No listing fees. | Application and approval; sources quote 7–14 business days or 2–3 weeks. Must fit one of 13 Handmade categories. | Grandparent frames do sell there, but the top Handmade listings found had **2–10 ratings** (snippets). Discovery is weak: Handmade is not flagged in search. Amazon pushes delivery speed, which is hard for made-to-order. **A test channel, not a growth engine.** |
| **Amazon Custom** (non-Handmade) | Program is free but needs a Professional account (about $39.99/mo, third-party figure). Standard category referral fees. | Approval usually within 1–24 h. Personalised items must ship from the seller (no FBA). Needs its own listing. | Supports text fields, image upload and dropdowns, which covers 2 shapes × 44 backgrounds plus text. Use the Handmade route to avoid the monthly fee. |
| **Walmart Marketplace** | Home decor referral fee **15%**, charged on the total including shipping. A 2026-06-22 cut across 14 categories was reported but not confirmed for decor. No monthly fee (secondary source). | Seller application. Personalisation is limited to some sellers (see `personalizeditems-cps.walmart.com`). | Walmart ranks on SEO weight (`docs/03`), but its personalisation tooling is limited. **Low priority, 12-month review.** |
| **TikTok Shop** | Standard referral fee **6%** including payment processing. One source reports **8% from 2026-08-04**, while TikTok's May-2026 table still shows 6%. New sellers get 1.8–3% for 30–90 days. Creator commission 5–25%, set by the seller. | Made-to-order products allowed, with a **3–14 business day** handling window per SKU. | Grandparents filmed opening a pregnancy reveal is a native TikTok format (inference). Content is the hard part, not the fees. **Start with organic content, add Shop later.** |
| **Pinterest** | Organic Product Pins are free from a catalog feed. Ads cost whatever you bid. | A catalog is a product data feed (CSV or XML). It does not require Shopify. On-Pinterest checkout is limited to Verified Merchants on Shopify (sources disagree). | People plan gifts weeks or months ahead on Pinterest. A secondary report of Pinterest's 2026 holiday guidance says campaigns running 6+ months see **~33% higher ROAS** than those under 3 months, and Performance+ catalog campaigns cut cost per action by about 20%. **A core channel.** |
| **Google free listings and Shopping** | Free listings cost nothing. Shopping ads cost per click. | Merchant Center feed with id, title, link, image, price, availability and shipping (US). Custom products use `identifier_exists=no`. | Puts recipient pages on the Shopping tab, Images and Lens at no cost. **Core channel, set up at launch.** |
| **Faire** | — | — | Wholesale only. **Out of scope** per the owner. |
| **Etsy Share & Save** (for comparison) | Etsy refunds **4%** of the order total from its transaction fee on sales that come through the seller's own share links. | Free, no application. | If ButterLu sends its own audience to Etsy instead of butterlu.com, Etsy's fee falls from 6.5% to about 2.5%. This narrows the fee gap that motivates going DTC (see §4.2). |

Sources: [Amazon Handmade](https://services.amazon.com/handmade) ·
[beBOLD Handmade 2026](https://www.bebolddigital.com/blog/sell-on-amazon-handmade) ·
[Craftybase](https://app.craftybase.com/blog/how-to-apply-for-amazon-handmade) ·
[Amazon Custom](https://sell.amazon.com/programs/custom) · [Merchize on Custom](https://merchize.com/amazon-custom/) ·
[Handmade vs Etsy, Listadum (seller-tool vendor)](https://www.listadum.com/fr/blog/amazon-handmade-vs-etsy-which-one-is-right-for-your-shop) ·
[Walmart fees, Enrich Labs](https://www.enrichlabs.ai/blog/walmart-marketplace-complete-guide-2026) ·
[Walmart June-2026 cuts, Beancount](https://beancount.io/blog/2026/07/26/walmart-marketplace-referral-fee-cuts-seller-guide) ·
[TikTok fees, FastMoss](https://www.fastmoss.com/blog/tiktok-shop-seller-costs-in-the-us-2026-fees-creator-commissions-fulfillment-returns-real-profit/) ·
[TikTok 8% report, beBOLD](https://www.bebolddigital.com/news/tiktok-shop-8-percent-referral-fee) ·
[TikTok made-to-order, AfterShip](https://support.aftership.com/en/articles/15325904-sell-made-to-order-products-on-tiktok-shop) ·
[Pinterest + Shopify, Charle](https://www.charleagency.com/articles/how-to-sell-on-pinterest-shopify/) ·
[Pinterest holiday 2026 guidance (secondary)](https://www.globaldatinginsights.com/featured/pinterest-urges-brands-to-begin-christmas-2026-planning/) ·
[Google free listings](https://support.google.com/merchants/answer/13889434) ·
[Etsy Share & Save terms](https://www.etsy.com/legal/policy/etsys-share-save-terms-program-terms/1162874007996) (search result only, not fetched) ·
[Share & Save explainer](https://blog.marmalead.com/etsy-share-and-save/)

---

## 3. Search demand and seasonality

### 3.1 Volume estimates (all ESTIMATES)

Source: rankhero.com keyword pages. RankHero brands itself as Etsy keyword data and does not name its
source. The values fall on Google Keyword Planner's bucket steps (6,600 / 8,100 / 12,100 / 14,800 /
18,100 / 22,200 / 27,100…), which suggests **Google Ads volume ranges, not exact counts.** Treat these
as order-of-magnitude figures. Volumes are global unless noted.

| Keyword | Avg / mo | Low month | Peak month | Shape |
|---|---|---|---|---|
| personalized picture frame | 22,200 | 14,800 (Feb) | 27,100 (Aug, Nov, Dec) | Flat. Year-round gifting plus a holiday lift. |
| gift for grandparent | ~22–23k | 6,600 (Feb–May, Jul–Aug) | **135,000 (Dec)**, 60,500 (Nov) | Very strong December spike, about 20× the trough. |
| grandparents gift | 5,400 | 1,300 (Apr–Jul) | 27,100 (Dec) | Same as above. |
| grandma gift | ~12–13k | 5,400 (Jun–Jul) | 49,500 (Dec), **12,100 (May)** | December plus a Mother's Day bump. |
| new grandma gift | ~1,000 | 880 | 2,400 (Dec), 1,300 (Apr–May) | Small but high intent. |
| aunt gift | 22,200 | 12,100 | 74,000 (Dec) | December. |
| godparent gift | 6,600 | 4,400 (Jun) | 9,900 (Dec) | Fairly flat. Baptisms happen all year. |
| baptism gift | 22,200 | 14,800 (Dec) | **33,100 (Apr)** | Peaks around Easter, a second high Aug–Oct. Low in December. |
| parents of the bride gift | no data | — | — | — |
| pregnancy announcement grandparents | page 404 | — | — | — |

Pages: [personalized picture frame](https://www.rankhero.com/keywords/personalized-picture-frame) ·
[gift for grandparent](https://www.rankhero.com/keywords/gift-for-grandparent) ·
[grandparents gift](https://www.rankhero.com/keywords/grandparents-gift) ·
[grandma gift](https://www.rankhero.com/keywords/grandma-gift) ·
[new grandma gift](https://www.rankhero.com/keywords/new-grandma-gift) ·
[aunt gift](https://www.rankhero.com/keywords/aunt-gift) ·
[godparent gift](https://www.rankhero.com/keywords/godparent-gift) ·
[baptism gift](https://www.rankhero.com/keywords/baptism-gift) ·
[parents of the bride gift](https://www.rankhero.com/keywords/parents-of-the-bride-gift)
(rankhero pages updated between 2026-02-03 and 2026-09-25, data through Aug 2026.)

Other demand signals (verified, secondary):
- Mother's Day searches start climbing in early April and peak in late April, with a last-minute
  surge in the final week ([Semrush on Trends](https://www.semrush.com/blog/google-trends/),
  [Think with Google Mother's Day PDF](https://www.thinkwithgoogle.com/_qs/documents/7090/Mothers_day-Infographic-A4.pdf)).
- A framed-photo retailer's 2026 Mother's Day cutoffs were 4/29 standard and 5/3 quick-ship
  ([Frameology](https://frameology.com/blogs/resources/best-mothers-day-gifts-2026)).
- Amazon shows 20,000+ results for "personalized picture frames" (listing supply, not searches).

### 3.2 ButterLu's demand calendar (inference from the above)

| Window | Occasion | Recipient pages it drives |
|---|---|---|
| **Nov–Dec (peak)** | Christmas | Grandma, grandparents, aunt/uncle, great-grandma, "first Christmas as grandparents". The ordering cutoff, not the holiday itself, sets the real peak. |
| Late Mar–Apr | Easter and baptism season (Easter 2027 = **Mar 28**) | Godparents, baptism |
| Mid-Apr to early May | Mother's Day (2027 = **May 9**) | Grandma, new grandma, mom from bump |
| May–Oct | Wedding season | Parents of the bride/groom |
| Early Sep | Grandparents Day (2027 = **Sep 12**) | Grandparents |
| All year | Pregnancy announcements, births | Grandparents-to-be, new baby, aunt/uncle-to-be. The announcement is tied to the customer's own timeline, not a holiday, so it is the flattest and most dependable demand. |

**Gaps.** No measured volumes for "grandparents to be gift", "pregnancy announcement frame" or
"parents of the bride frame". Get them from a Google Ads account's Keyword Planner (free with an
account) before G2 picks pages.

---

## 4. Etsy sellers who went DTC, and what channels work for personalised gifts

### 4.1 Case evidence (thin, mostly vendor blogs)

- **Festive Gal** (custom gifts and party supplies) started on Etsy in 2019 and added a second brand on
  Shopify. The owner says Etsy limits personalisation to "two dropdown menus and one text box", while
  her own site allows unlimited options. This is dual-running, not leaving Etsy.
  ([Shopify blog](https://www.shopify.com/blog/etsy-and-shopify)). This is the same reason ButterLu
  needs one configurable product.
- **Old World Kitchen** (wooden homewares) credits Etsy with building the brand and says conversion
  rose after moving to Shopify. No numbers given.
  ([Shopify migration story](https://www.shopify.com/blog/211686281-moving-from-etsy-to-shopify))
- **Strange Bedfellas** closed its Etsy shop after 7,000+ sales to concentrate on its own channels
  ([Shuttle](https://shuttleapp.io/use-cases/expanding-to-shopify/why-etsy-sellers-adding-shopify)).
- Lessons that recur: Etsy supplies trust and discovery and the seller's own site has to build both
  from nothing; the motive for going DTC is owning customer data and email; policy and algorithm
  changes are the risk of staying marketplace-only.
- Etsy's own off-Etsy storefront, Pattern, gets little support according to seller forum threads. No
  shutdown has been announced
  ([Etsy community](https://community.etsy.com/t5/Technical-Issues/Pattern-Site-Still-Not-Working-No-Technical-Support-or-Response/m-p/145825794/highlight/true)).

**Inference.** No public case study shows a high-volume Etsy personalised-gift seller *replacing*
Etsy revenue with DTC. The pattern that works is **Etsy stays the main revenue source and the
seller's own site adds margin and repeat orders.** ButterLu should set targets on that basis. A
realistic year-1 goal is DTC at 5–15% of Etsy revenue, with an owned email list as the real asset.
This is an estimate, not a benchmark.

### 4.2 Unit economics: why channel choice matters (inference on verified inputs)

Assume a $32 order (mid of $25–38).

| | Etsy, organic | Etsy, via Offsite Ads | butterlu.com (Stripe ~2.9% + $0.30) |
|---|---|---|---|
| Marketplace fees | 6.5% + 3% + $0.25 + $0.20 listing ≈ **$3.49** | + 12–15% Offsite Ads ≈ **$7.3–8.3** | ≈ **$1.23** |
| Customer acquisition | Etsy brings the buyer | Etsy brings the buyer | **ButterLu pays** |

Etsy fee inputs: [Craftybase](https://app.craftybase.com/blog/the-complete-guide-to-etsy-fees),
[checkoutpage](https://checkoutpage.com/blog/etsy-fees). Etsy's Offsite Ads rate is 12% for shops
over $10k/yr and mandatory, capped at $100 per order.

The DTC saving is about **$2–7 per order**. Paid-acquisition benchmarks, all industries unless noted:

| Benchmark | Figure | Source |
|---|---|---|
| Meta median ecommerce CPM | $14.19 (Triple Whale 2025); $13.52 (15-brand DTC panel, Jul 2025–Jun 2026) | [Coupler](https://blog.coupler.io/facebook-ads-statistics/), [TopGrowth](https://topgrowthmarketing.com/what-is-good-cpm-for-facebook-and-instagram-ads/) |
| Meta median cost per purchase | **$38.19** (Triple Whale); **$49.04** (DTC panel) | same |
| Meta median ROAS | 1.86 (Triple Whale); 2.96 (DTC panel) | same |
| Meta ecom conversion CPC | $0.57–$0.87 median | same |
| Google Ads avg CPC | $5.26–$5.42 (WordStream 2025) | [Search Engine Land](https://searchengineland.com/google-ads-costs-keep-rising-but-conversion-rates-improved-in-2025-477927) |
| Google Ads CVR, "Shopping, Collectibles & Gifts" | **3.83%** vs 7.52% all-industry median (via a WordStream citation; primary not opened) | [Segwise](https://segwise.ai/blog/google-ads-benchmarks-industry-insights) |
| Ecommerce CAC, broad | $68–84 typical, $50–90 range | [MobiLoud](https://www.mobiloud.com/blog/average-customer-acquisition-cost-for-ecommerce) |
| Gifting cohorts | "80–85% never return post-holiday" (secondary claim) | [Retainful](https://www.retainful.com/blog/customer-acquisition-cost-ecommerce) |
| Klaviyo email | Flows earn about 41% of email revenue from 5.3% of sends; flow click rate 5.58% vs 1.69% for campaigns | [Klaviyo benchmarks](https://klaviyo.com/products/email-marketing/benchmarks) |
| AOV, personalised gift shops | No credible public benchmark. One "$57" figure comes from a financial-model template and is not market data. | [financialmodelslab](https://financialmodelslab.com/blogs/kpi-metrics/personalized-gift-shop) |

No public CPC was found for these gift keywords. Get it from Keyword Planner.

**Inference.** Spending $38–49 on Meta to win a $32 order with perhaps a $15–20 gross margin (the
cost of goods is not in the repo) loses money on the first order. On Google Search, a $1–2 CPC at
about a 4% conversion rate gives a $25–50 CPA, also break-even at best. **Paid acquisition only pays
if** (a) AOV rises through 2-packs, set bundles and gift add-ons, (b) the customer orders again on
the next occasion, or (c) ads target buyers already searching for a specific recipient (Shopping and
Search on "grandparents to be frame", not broad prospecting). Organic Pinterest, Google free listings
and email carry the first year.

### 4.3 How competitors drive repeat purchase across occasions (verified where cited)

- **1-800-Flowers** (PM's owner until the PlanetArt sale): **Celebrations Reminders** lets shoppers
  save birthdays, anniversaries and upcoming weddings. **Celebrations Passport** is a paid
  free-shipping membership across its brands. The company credits it with more frequent purchases
  and better retention (its own claim).
  ([Loyalty360](https://loyalty360.org/content-gallery/daily-news/simply-chocolate-encourages-social-customer-engage),
  [App Store](https://apps.apple.com/us/app/-/id1580789093))
- **Zazzle Plus**: about $19.95/yr for unlimited free shipping
  ([third party](https://www.topbubbleindex.com/blog/zazzle-plus-worth-it/)).
- **PersonalizationMall**: constant promotion emails (free-shipping Fridays, 30–50% off sitewide,
  Grandparents Day pushes) ([Milled archive](https://milled.com/personalizationmall-com/grandparents-day-is-almost-here-ilbkkTiYIo6TlJ7i)).
- **Uncommon Goods**: Perks rewards (10% back shown on the PDP).
- **Shutterfly**: no reminder service was found in this research.

**Inference for ButterLu.** The product follows a family's life events in order:
*pregnancy announcement (grandparents-to-be, aunt/uncle-to-be) → new baby → baptism/godparents →
first Christmas / first Mother's Day / Grandparents Day → years later, the wedding (parents of the
bride/groom).* Each order already holds names and dates (due date, baby's name, wedding date). Ask
at checkout, with explicit opt-in, "Want a reminder before [baby]'s due date / baptism / first
Christmas?" That turns those details into timed, consented emails, which is a stronger trigger than
1-800-Flowers' generic reminders. Also offer a "matching frame for the other grandparents" upsell at
checkout, since grandparents-to-be and parents-of-the-couple gifts often come in pairs.

---

## 5. Off-Etsy channel playbook for butterlu.com

Assumptions: the site launches after G2 (`plans/decisions.json`). Today is 2026-10-12, so **the
2026 holiday peak is effectively an Etsy season**. The site cannot build Google authority, Pinterest
history or an email list in 6–8 weeks. Costs are rough estimates.

### 5.1 Channel priority

| Rank | Channel | Why | Rough cost | When |
|---|---|---|---|---|
| 1 | **Google free listings + Merchant Center feed** | Free. Recipient pages appear on Shopping, Images and Lens. Uses the catalog the site already generates. | $0, plus feed engineering (generate `feed.xml` from the catalog) | At launch |
| 2 | **Pinterest organic + catalog** | Gift planning starts weeks to months ahead. Pins keep working for months. The 44 backgrounds × recipient presets supply hundreds of pin images. Pinterest already sends traffic (68 sessions/yr on Shopify despite neglect). | $0 organic. Ads from about $10–20/day once the pixel has conversion data. | Launch, with Mother's Day 2027 pins up by Feb–Mar 2027 |
| 3 | **Email/SMS capture and occasion flows** | The only channel that makes repeat orders pay (§4.2, §4.3). Klaviyo-style flows earn most email revenue. | Free tier to ~$20–60/mo at small list sizes. Cloudflare Email Service or Resend are already in the stack. | Launch |
| 4 | **Google Search + Shopping ads, narrow** | Only exact recipient intent ("grandparents to be frame", "godparents frame personalized"), plus brand. Gift CVR is about 3.8%. | Test budget $300–600/mo, capped. Kill any ad group with CPA above order margin after about 30 clicks per term. | Month 2–3, after the preview converts |
| 5 | **TikTok / Reels organic** | Reveal reactions (grandparents opening the frame) are a ready-made format. Ask Etsy and site buyers to send videos (consent, small reward). | Time, plus $0–25 per UGC clip | Month 3+ |
| 6 | **Amazon Handmade (Custom)** | A second marketplace with low fixed cost. Top competing listings have only 2–10 ratings, so the bar is low. Weak discovery. | 15% referral, $39.99 first month | Month 4–6 test, 5–10 hero presets |
| 7 | **Meta paid** | Only for retargeting site visitors and lookalikes of buyers. Cold prospecting loses money at this AOV. | $10–20/day retargeting test | Month 6+ |
| 8 | **TikTok Shop** | After organic content proves itself. Uses the made-to-order SKU setting. | 6–8% + creator commission 10–20% | Month 9–12 |
| — | Walmart Marketplace | Little personalisation tooling, 15% fee. | — | Review at 12 months |
| — | Faire, retail | Out of scope (owner). | — | — |

### 5.2 Sequence

**First 90 days (Oct 2026 – Jan 2027): build the base, keep Etsy at full strength for the holidays**
- Launch the site on the G2 page set with the **live preview editor**: shape + background + text,
  preview, regenerate, required "I approve this proof" checkbox (the GiftsForYouNow standard). Set
  character limits that fit the print area. Show a dated "arrives by" estimate.
- Merchant Center feed with free listings. Pinterest business account, claim the domain, upload the
  catalog. Search Console with the 301 map (already planned).
- Email capture on site, opt-in only: an "occasion reminder" signup instead of a generic 10%-off
  popup. Set up the welcome, abandoned-cart, post-purchase review-request and occasion-date flows.
- Do **not** run cold Meta during Q4 2026, when CPMs peak. A small Google brand and exact-recipient
  test is fine.
- Do not market to Etsy buyers by email and do not put "go to our site" inserts in Etsy orders. Etsy
  seller policy limits contacting buyers and steering them off Etsy (not re-checked here; check
  before doing anything). `docs/06` already restricts reuse of Etsy data.
- Pull Keyword Planner volumes for the G2 pages (fills the §3 gap).

**Months 4–6 (Feb – Apr 2027): first DTC peak is Mother's Day, plus baptism season**
- Pinterest: publish grandma, new-grandma and godparents pins by mid-February. Start a small
  Pinterest catalog campaign in March so it has conversion history before the late-April peak.
- Google Shopping/Search: expand to recipient terms that converted. Add baptism and godparents for
  Easter (Mar 28, 2027).
- Launch 2-packs and bundles ("both grandparents" sets, matching godmother + godfather frames) to
  raise AOV above Meta's $38–49 CPA.
- Amazon Handmade: apply and list 5–10 hero presets with Amazon Custom dropdowns. Measure
  sessions-to-order before adding more.
- Reviews: collect site-native reviews from day one (`docs/04` design). Target 10–75 per page
  cluster, the threshold `docs/03` found for niche DTC pages.

**Months 7–12 (May – Oct 2027): wedding season, Grandparents Day, Christmas 2027 groundwork**
- Wedding: parents of the bride/groom pages and a "two frames, both families" bundle.
- Grandparents Day (Sep 12, 2027): first full-scale email and Pinterest occasion push to the list.
- Meta: retargeting and buyer lookalikes, judged on blended CAC including repeat orders over 90 days.
- TikTok: build up the reaction-video library, then consider TikTok Shop with made-to-order handling
  times.
- **By Sep 2027**, Christmas 2027 pins and Shopping campaigns should be running. Per Pinterest,
  campaigns live 6+ months outperform. Christmas 2027 is the first season where butterlu.com
  competes properly.
- At month 12, review: DTC share of total revenue, email list size and repeat rate, Amazon test
  result, Walmart yes or no.

### 5.3 What to measure (so the next review uses data, not benchmarks)

- Conversion rate by recipient page, preview-start → add-to-cart → paid.
- CAC by channel against first-order gross margin. ButterLu's cost of goods is needed; it is not in
  the repo.
- Opt-in rate for occasion dates, and the 12-month repeat rate by first occasion.
- Share of orders that are 2-packs or bundles (AOV lever).
- Production lead time versus the "ships in 1–2 days" competitor standard.

---

## 6. Opportunities and threats

**Opportunities**
- **A product gap**: full-colour, many-background, fully custom-text frames are rare off Etsy.
  Engraved wood dominates. A strong live preview is the whole pitch. (Inference.)
- **Weak competition for recipient-specific searches off marketplaces**: niche DTC peers show zero
  reviews on product pages; Amazon Handmade leaders have 2–10 ratings; national brands are being sold
  off cheaply. (Verified data, inferred conclusion.)
- **The occasion chain**: pregnancy → baby → baptism → holidays → wedding gives natural, date-driven
  repeat orders that generic gift shops lack. (Inference.)
- **Paired gifts** (both grandparents households, both parents of the couple, godmother + godfather)
  raise AOV without new products. (Inference.)
- **Pinterest and Google free listings** turn the existing catalog into free traffic. (Verified that
  the channels exist, inferred fit.)
- **Pricing room**: peers sit at $25–50. ButterLu does not need to undercut. (Verified.)

**Threats**
- **PlanetArt consolidation**: one owner across PersonalizationMall, Things Remembered, Personal
  Creations and Gifts.com can out-promote and out-bid ButterLu on Google Shopping in Q4. (Inference
  from verified deal.)
- **Paid acquisition costs** ($38–49 median Meta CPA) above AOV. (Verified benchmark.)
- **Shipping expectations** of "ships in 1–2 days" from every peer. If ButterLu is slower, it loses
  late-season holiday orders. (Verified peer claims.)
- **No reviews off Etsy** until G5 resolves. Etsy's API terms limit republishing (`docs/06`).
- **Cannibalising Etsy**: sending ButterLu's own audience to butterlu.com rather than Etsy can cost
  Etsy ranking momentum. The fee saving is small (about $2–7 per order, less with Etsy Share & Save at
  2.5% effective). Keep Etsy fully stocked and treat DTC as additive. (Inference.)
- **Etsy policy risk** on contacting buyers or steering them off Etsy. Check before any outreach.
- **Zazzle-style template sellers** can copy recipient themes at $27–35 with free shipping for
  members. (Verified prices.)

---

## 7. Not verified / open

- Amazon and Walmart figures come from search snippets. Product pages blocked fetches.
- Keyword volumes are third-party estimates in Keyword Planner buckets. Nothing is measured for
  "grandparents to be" or "parents of the bride".
- No gift-category CPC, no personalised-gift AOV or CAC benchmark from a primary source.
- Live preview on PersonalizationMall is confirmed only by a Groupon description. Zazzle's frame
  production time is from third-party sources.
- The Pinterest "+33% ROAS at 6+ months" figure is a secondary write-up of Pinterest guidance.
- ButterLu's cost of goods and production lead time are not in the repo. Both are needed to turn §4.2
  and §5 from inference into a plan.
- Etsy seller-policy limits on marketing to Etsy buyers were not re-read for this research.

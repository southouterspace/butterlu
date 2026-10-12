# E. Etsy platform mechanics for ButterLu (as of 2026-10-12)

Scope: what matters on Etsy in 2025-2026 for a 13.7k-review, 76k-sale, 4.9-star Star Seller with 619 listings, most of them the same personalised frame dressed for different recipients and occasions at about $25-38.

## Method and source quality

Etsy's help center, Seller Handbook and House Rules pages block automated fetches (HTTP 403 to WebFetch and curl). One official page was read in full: the Fees & Payments Policy, last updated 5 Oct 2026, through Firecrawl before its free quota ran out. Etsy's Q2 2026 shareholder letter was read in full on SEC EDGAR. All other official Etsy wording below reached me through search-engine excerpts of etsy.com pages, and secondary reporting fills the gaps. Value Added Resource and EcommerceBytes were the most reliable secondary sources. Each claim carries its URL and, where known, its date. Claims dated before 2025 are marked **[pre-2025]**. Claims I could not confirm against an Etsy page are marked **[unverified]**. No marketplace pages (shops, listings or search results) were scraped.

---

## 1. Etsy search ranking

### What Etsy officially says

Etsy describes search in two phases. Query matching first gathers listings whose titles, tags, categories, attributes and descriptions relate to the query. Ranking then orders those listings. The Seller Handbook article "How Etsy Search Works" (https://www.etsy.com/seller-handbook/article/how-etsy-search-works/375461474487) and the article "The Ultimate Guide to Etsy Search", dated 26 Aug 2025 (https://www.etsy.com/seller-handbook/article/the-ultimate-guide-to-etsy-search/366469415790), describe these ranking inputs:

- **Relevancy.** Keywords in titles, tags, descriptions, categories and attributes all count. Etsy says where a phrase appears in the title does not affect ranking. Root-word matching handles plurals. Etsy's guidance is to use all 13 tags and choose the most specific category and attributes. (Handbook articles above. See also "Keywords 101", https://www.etsy.com/dk-en/seller-handbook/article/keywords-101-everything-you-need-to-know/382774281517.)
- **Listing quality and engagement.** Etsy measures clicks, favourites and purchases relative to views. Etsy says it does not rank on the number of photos, although more photos can raise engagement. (Same sources.)
- **Customer and market experience score.** This draws on the shop's average review rating, message response rate and case rate over the past three months. Etsy calls it "just one factor". (https://www.etsy.com/seller-handbook/article/375461267511)
- **Recency.** New listings get a small temporary boost so Etsy can learn how buyers respond. Etsy says renewing listings just to get that boost "is not an effective strategy". (How Etsy Search Works, above.)
- **Shipping price and method** are ranking factors. (Same.)
- **Context-specific ranking and personalisation.** Results differ for each buyer. (Same.) The Q2 2026 shareholder letter says real-time personalisation in search "continued to improve", with "a shift toward surfacing the best seller inventory for each shopping mission". Buyer profiles now cover more than 65 million buyers, with about 30 interests each. (https://www.sec.gov/Archives/edgar/data/0001370637/000137063726000079/q226shareholderletter.htm)
- **Frequency capping.** Etsy's official ranking disclosures define it as limiting "the number of times the same listing or shop appears at the top of results for a specific user or keyword". (Search, Advertisement & Recommendation Ranking Disclosures, https://www.etsy.com/legal/policy/search-advertisement-recommendation/899478564529) This is the key mechanic for ButterLu's 619-listing strategy; see below.
- **No paid organic placement.** Etsy says it does not sell higher organic ranking. Ads run through a separate, labelled auction. (Same disclosures page.)
- **Engineering background.** Etsy's search team published "Unified Embedding Based Personalized Retrieval in Etsy Search", which combines graph, transformer and term embeddings and reports a +5.58% search purchase rate in A/B tests (arXiv 2306.04833, https://arxiv.org/abs/2306.04833v2) **[pre-2025, 2023]**. The practical consequence is that semantic retrieval and personalisation reduce how much exact-keyword duplication buys a seller.

### Title and tag guidance (changed in 2025)

- In August 2025 Etsy published "New Guidance for Listing Titles, and a Tool to Help" (https://www.etsy.com/seller-handbook/article/1399426136697). Value Added Resource reported it on 21 Aug 2025 (https://www.valueaddedresource.net/etsy-guidance-listing-titles-ai/). The guidance says to "Clearly state the item for sale", put the most important traits (colour, material, size) first, keep titles scannable at ideally under 15 words, move subjective words to the description, and avoid repetition. On recipients Etsy says: **"Only include holidays, special occasions, or recipient types if they're essential to what the item is."**
- Etsy shipped an optional AI title tool with bulk-apply from the Search Visibility dashboard (Digital Commerce 360, 5 Sep 2025, https://www.digitalcommerce360.com/2025/09/05/etsy-adds-new-ai-tools-sellers-marketplace/). Etsy has said search does not penalise older long titles and that it weighs the whole listing: tags, attributes, description, photos and reviews (seller summary of Etsy's statement, https://loveeattravelrepeat.com/should-i-change-my-etsy-titles/ **[unverified secondary]**).
- **Tags** should add new phrases rather than repeat title words. Etsy's search podcast says titles should not be "cluttered with random keywords" and that repeating category words in tags wastes slots. It also says sellers "are not required to have a certain number of listings in order to rank highly". (Podcast transcript, https://www.etsy.com/seller-handbook/article/1046872470801)
- **Attributes.** Recipient and occasion attributes exist and feed both search and the sidebar filters. One 2026 guide says a filtered search excludes listings that lack the attribute (https://www.listadum.com/blog/etsy-listing-attributes **[unverified secondary]**). This matters for ButterLu because recipient intent ("aunt", "grandma") can sit in attributes and tags while titles stay short.
- **What this means for ButterLu.** Recipient words are arguably "essential to what the item is" when the frame's printed text names the recipient, as in an "Aunt" frame. Etsy's guidance therefore does not forbid the recipient-per-listing model. It does push toward short titles of the form "Personalized Aunt Picture Frame, Custom Name 4x6 Photo Frame", with the long-tail phrases moved into tags.

### Near-duplicate listings: allowed or penalised?

- **No Etsy policy bans multiple listings of the same non-unique item.** I found no rule against it in the Seller Policy or the ranking disclosures. The Seller Policy bans *duplicate shops* and manipulating "clicks, carts or sales" to game search (https://www.etsy.com/legal/sellers). A 2023 seller guide reads Etsy's rules as allowing multiple listings of the same product as long as the seller can fulfil them, with only one-of-a-kind items excluded (https://sarahjwaggoner.com/etsy-duplicate-listings-policies-and-how-to/ **[pre-2025, unverified]**).
- **Etsy actively limits same-shop crowding.** The official frequency-capping definition above limits how often one listing *or one shop* reaches the top of results for a keyword. Etsy has previously said that in relevancy-sorted search "we divide up multiple items from the same shop", and EcommerceBytes reported a per-shop quota on each results page (https://www.ecommercebytes.com/?p=5176 **[pre-2025]**). Seller-tool blogs conclude that near-identical listings share a few slots and split the clicks and favourites that would otherwise accumulate on one listing (https://www.listifyai.net/blog/etsy-keyword-cannibalization **[unverified secondary]**).
- **Risk to ButterLu's 619 listings.**
  - *Policy risk is low.* Nothing prohibits the model, provided each listing is accurate and the titles are not keyword-stuffed.
  - *Efficiency risk is real.* Listings that target the same phrase compete with each other for the capped shop slots. Each listing also costs $0.20 every four months, plus $0.20 after each sale on multi-quantity listings (Fees policy, below).
  - *Reach upside is also real.* Separate listings are how ButterLu gets one result each for "aunt frame", "godmother frame", "nana frame" and so on. Etsy's frequency capping works per keyword, so listings aimed at *different* queries do not cancel each other out.
  - **Recommendation.** Keep one listing per distinct search intent. Merge or deactivate listings that target the *same* query, and listings with negligible views over 12 months, after checking Shop Stats. The new third variation and Custom options (section 3) make consolidation easier than it was.

---

## 2. Fees and costs (Fees & Payments Policy, last updated 5 Oct 2026, https://www.etsy.com/legal/fees/)

All figures below come from that page unless another source is given.

- **Listing fee:** $0.20 per listing, charged on creation and on each 4-month renewal (auto-renew is on by default). A multi-quantity listing renews at $0.20 after each sale. Editing a listing is free. For 619 listings, three renewals a year comes to about $371/yr before the per-sale renewals.
- **Transaction fee:** 6.5% of the item price plus shipping and gift wrap. **Paid personalisation surcharges are added to the item price and charged the same fee.** For US sellers, sales tax is excluded.
- **Payment processing (US):** set by the Etsy Payments Policy, not stated on the fees page. Secondary sources consistently give 3% + $0.25 per order, charged on the total including tax and shipping (https://checkoutpage.com/blog/etsy-fees **[unverified against Etsy]**). The September 2026 payment-account redesign keeps transaction and processing fees pending until the sale's funds become available (https://www.valueaddedresource.net/etsy-seller-update-september-2026/).
- **Offsite Ads:** 15% standard. Shops under $10k in sales over the prior 365 days may opt out. **Once a shop passes $10k, participation is mandatory at 12% for the lifetime of the shop**, even if sales later fall. The fee applies to orders within 30 days of an ad click and is capped at **$100 per order**. ButterLu is far past the threshold, so it pays 12% on attributed orders and cannot opt out. US sellers in Offsite Ads were made eligible for ChatGPT Instant Checkout in Sept 2025 (https://www.digitalcommerce360.com/2025/09/30/chatgpt-debuts-checkout-experience-etsy-shopify-merchants/).
- **Etsy Ads:** a seller-set daily budget with a $1/day minimum, auctioned bids, and Ad Groups (up to 20) rolled out in 2026 (https://www.valueaddedresource.net/etsy-ad-groups-budget-test/). Listing-level strategies require a budget of $25/day or more (Etsy community announcement, https://community.etsy.com/forum/announcements-290/topic/new-in-etsy-ads-set-a-strategy-for-each-listing-183632/).
- **Etsy Plus:** $10/month, which includes 15 listing credits ($3) and $5 in Etsy Ads credits each cycle. Unlimited Marketplace Insights searches are also an Etsy Plus perk (https://www.valueaddedresource.net/etsy-seller-update-september-2026/).
- **Pattern:** $15/month after a 30-day trial. Pattern-only listings pay no listing fee and do not expire, and Pattern orders are excluded from the Offsite Ads threshold calculation. Pattern is still live as of Oct 2026.
- **Set-up fee:** a one-time fee for new shops (not relevant to ButterLu).
- **Share & Save:** a refund of 4% of the "Qualifying Transaction Total", taken off transaction fees, on sales from the seller's own share links (https://www.etsy.com/legal/policy/etsys-share-save-terms-program-terms/1162874007996). That cuts the effective 6.5% to about 2.5% on traffic ButterLu sends to Etsy itself.
- **Currency conversion:** 2.5% if the listing currency differs from the payment account currency.
- **Regulatory Operating fee:** country-specific. The UK rate rose from 0.32% to 0.48% on 22 Jun 2026 (https://beancount.io/blog/2026/07/09/etsy-2026-fee-hike-ai-disclosure-rules-handmade-sellers-guide **[secondary]**). It does not apply to US sellers.
- **Worked example: a $30 order with free shipping.**
  - Transaction fee: $1.95.
  - Processing: about $1.15.
  - Renewal: $0.20.
  - **Total: about $3.30, or 11%.**
  - If the order came through Offsite Ads, add $3.60 (12%), for **about $6.90, or 23%**.
- **Take-rate context.** Etsy's take rate was 25.9% in Q2 2026, up 130 bps year on year, "primarily driven by Etsy Ads" (shareholder letter, above). Etsy is collecting more per sale, mainly through advertising.

### Other 2025-2026 rule changes

- **Creativity Standards (introduced July 2024 [pre-2025]; still in force).** Every listing falls into one of four categories: Made, Designed, Handpicked or Sourced (https://www.etsy.com/legal/creativity/). Physical items the seller makes "by hand or using personal or computerized tools" count as **Made by**. A laser cutter or printer the seller owns qualifies (help center wording, https://help.etsy.com/hc/en-us/articles/360024112614-What-Can-I-Sell-on-Etsy). Items personalised with a buyer's text or image and *produced by a production partner* fall under a separate category with disclosure duties. **For personalised items the first photo must show a finished, customised item, not a blank or "Your Text Here".** (Creativity Standards and Handbook, https://www.etsy.com/seller-handbook/article/1276491338090.) A secondary source says Etsy names undisclosed production partners as among the most common reasons for deactivation (beancount article above **[secondary]**).
- **Seller Policy revision effective 9 Jul 2026.** Etsy keeps the prior version archived as "effective through July 8, 2026" (https://www.etsy.com/legal/policy/seller-policy-effective-through-july-8/1489086421092). Secondary reports say the revision hardens rules against dropshipping and reselling and tightens the Messages clause on off-Etsy contact and payment (https://listingsafe.app/blog/etsy-off-platform-violation **[unverified]**).
- **Listing appeals** began as a pilot for Creativity Standards removals after 15 Jul 2025. Etsy expects all sellers to be able to appeal across most policy areas by the end of 2026 (https://www.valueaddedresource.net/etsy-seller-update-september-2026/).
- **Payment reserves.** Etsy says Star Sellers avoid payment-account reserves (Handbook, Aug 2023, https://www.etsy.com/seller-handbook/article/1177649220109 **[pre-2025]**). The September 2026 redesign removes the separate reserve module and moves reserved funds into "Pending" (VAR, above).
- **Seller verification.** INFORM Act checks apply to high-volume sellers (200+ transactions and $5k+ in 12 months), and Etsy re-verifies periodically. A shop that fails verification can be put into vacation mode (https://www.valueaddedresource.net/etsy-prepares-for-inform-act-requirements/ **[pre-2025]**). ButterLu should keep its business, bank and tax details current in Shop Manager.
- **Review-rating calculation (Mar 2026).** The shop rating changed from a 12-month average to a lifetime average in which each review's weight halves every year. It applies to listings, search results, shop pages and Shop Manager. Star Seller still uses the most recent three months. Etsy's help center gives 25 March as the start date. (https://www.valueaddedresource.net/etsy-shop-review-ratings-calculation-update/; https://help.etsy.com/hc/en-gb/articles/360000572708-How-the-Review-System-Works-for-Sellers) This change favours an established 4.9-star shop like ButterLu, because 13.7k reviews smooth out any bad month.
- **Shared access (Sep 2026).** A shop can now have up to five helper logins that handle orders, labels, listings and messages, but not finances or refunds (VAR, above).

---

## 3. Features worth using

- **Personalisation and Custom options (2026).** This is the biggest change for ButterLu. Since early 2026, listings can carry **up to five personalisation fields**: free text, a predefined-choice list, or **file upload, which lets buyers attach photos**. Fields can be required or optional, reused across listings, edited in bulk, and can carry an extra charge. Etsy recommends moving personalisation charges out of variations and into Custom options. A **third variation** is now available as well. (Value Added Resource, 22 Sep 2026, https://www.valueaddedresource.net/etsy-seller-update-september-2026/; Sarah Sewell, 11 May 2026, https://sarahsewell.substack.com/p/etsy-personalization-fields-update; Etsy help page "How to Offer Personalized Listings", https://help.etsy.com/hc/en-us/articles/360000344528-How-to-Offer-Personalized-Listings.) For ButterLu this means separate structured fields for name, line 2 and date. Shape and background can be variations or choice lists. How many options a choice list can hold is unverified, which matters for the 44 backgrounds. A file upload could collect a photo if ButterLu ever offers photo printing. Paid surcharges still pay the 6.5% fee.
- **Gift Mode, gift teasers and the Gifting Assistant.** Gift Mode launched in Jan 2024 **[pre-2025]** and favours sellers with strong customer service (https://techcrunch.com/2024/01/24/etsy-launches-gift-mode-a-new-ai-powered-feature-that-generates-200-gift-guides). Etsy launched a conversational Gifting Assistant in beta in May 2026, and its usage "skews to new, high-intent buyers" (Q2 2026 letter). There is no seller-side opt-in. Eligibility follows from good attributes (recipient and occasion), clear photos and Star Seller-level service.
- **Attributes.** Fill recipient, occasion, holiday, colour and material attributes on every listing, since they feed both matching and filters (see section 1).
- **Video.** Listing videos are supported. I found no 2025-2026 official statement that video affects ranking; its value is engagement and conversion **[unverified]**.
- **Sections.** These organise the shop page. They are a navigation and conversion tool, not a ranking factor (no source claims otherwise).
- **Sales, coupons and targeted offers.** Automatic coupons go to cart abandoners (after about 24 hours), recent favouriters (after about 48 hours) and recent buyers. Buyers who opted out of Etsy marketing emails are skipped, and a buyer gets at most one offer per shop every seven days (Alura help article, https://alura.io/docs/article/why-arent-etsy-targeted-offers-reaching-shoppers). The original fee was $0.10 per send (https://www.ecommercebytes.com/2018/12/08/etsy-targeted-offers-helps-sellers-make-the-sale/ **[pre-2025]**). Etsy now lets sellers print a coupon code and shop banner on packing slips "to increase the likelihood of repeat purchases" (Handbook, https://www.etsy.com/seller-handbook/article/26954984006). This is the main sanctioned repeat-buyer tool for an Etsy shop.
- **Shop Stats, Search Analytics and Marketplace Insights.**
  - *Shop Stats* (Sep 2026) adds side-by-side graphs of visits, orders, conversion and revenue, plus an AI Stats assistant beta.
  - *Marketplace Insights* (launched at Etsy Up, Sep 2025) shows real Etsy search demand: trends, price ranges, conversion and saved searches. Free shops get 15 searches a week; Etsy Plus gets unlimited. (VAR Sep 2026, above; Etsy community "What's New on Etsy: Fall 2025", https://community.etsy.com/forum/announcements-290/topic/whats-new-on-etsy-fall-2025-22329/.)
  - *The Search Visibility page* flags listing issues and hosts the AI title tool (https://www.etsy.com/seller-handbook/article/1289139008351).
  - ButterLu's line-up work currently ranks listings by favourites and views. **Marketplace Insights is the only Etsy-sanctioned source of query volume** and fills the "keyword volumes unknown" gap in the repo.
- **Quick List (testing, Sep 2026).** An AI form that suggests titles, tags and attributes from photos (VAR, above).
- **Pattern.** Etsy's website builder is live at $15/month (Fees policy). A third-party tracker counted 7,572 live Pattern stores, down 14% year on year in Q4 2025 (https://storeleads.app/reports/etsypattern **[secondary]**). Pattern can sync and display Etsy.com reviews (https://channelx.world/?p=24684 **[date unconfirmed]**). That is the one Etsy-sanctioned way to show Etsy reviews on a domain the seller controls, and it bears on the open G5 question. Pattern is not the custom Astro site, however, and gives up control.
- **Etsy Wholesale.** Closed 31 Jul 2018 (https://channelx.world/2018/05/etsy-wholesale-to-close-at-the-end-of-july/ **[pre-2025]**). There is no wholesale channel on Etsy; Faire is where those sellers went.
- **Etsy Purchase Protection.** From May 2026 all eligible orders get up to $250 of coverage, including orders above $250. It covers lost, late and not-as-described cases outside the seller's control; damage is generally excluded except a seller's first damage case each year (Handbook, 7 Apr 2026, https://www.etsy.com/seller-handbook/article/1085799204521; policy, https://www.etsy.com/legal/policy/purchase-protection-program-for-sellers/1490256729373). Late-delivery cases now require arrival 7 or more days after the estimated date (Shopifreaks, 1 Apr 2026, https://www.shopifreaks.com/etsy-rolls-out-purchase-protection-changes-seller-tools-update-and-a-brand-refresh-this-spring/).
- **Star Seller.** The seller must meet the case-rate standard and reach the targets for message response (95% of first messages answered within 24 hours), on-time shipping with tracking (95%) and average rating (4.8). Etsy evaluates monthly over a rolling three months (https://help.etsy.com/hc/articles/29654393638679; criteria detail from https://craftybase.com/blog/how-to-become-etsy-star-seller). The Q2 2026 letter says the Star Seller program "is being evolved" and that Star Sellers with "distinctive inventory with proven demand" have higher buyer lifetime value. Expect the criteria to change.
- **Off-Etsy discovery.** Etsy's spring 2026 update cited stable listing URLs for external SEO and AI integrations that make eligible items discoverable through ChatGPT, Google and Copilot (Shopifreaks, above **[no Etsy primary found]**).

---

## 4. Etsy's business trajectory

| Period | Etsy marketplace GMS | Active buyers | Notes | Source |
|---|---|---|---|---|
| FY2024 | $10.9B | 89.6M | Q4 GMS −8.6% Y/Y; habitual buyers 6.4M, −9.5%; active sellers 5.6M, −20% | https://investors.etsy.com/news-events/press-releases/detail/13/etsy-inc-reports-fourth-quarter-and-full-year-2024-results |
| Q4 2025 | $3.29B (+0.1%, −1.0% currency-neutral) | 86.5M (−3.4% Y/Y) | GMS per buyer $121 | https://www.ecommercebytes.com/2026/02/20/etsy-marketplace-shows-flat-growth-in-gms-in-4th-quarter-of-2025/ |
| Q1 2026 | $2.5B (+5.5%, +3.6% currency-neutral) | 86.6M | first sequential buyer gain in about two years; app ≈47% of GMS | https://www.sec.gov/Archives/edgar/data/0001370637/000137063726000042/q126shareholderletter.htm ; https://qz.com/etsy-q1-2026-earnings-revenue-beat-gms-growth-042926 |
| Q2 2026 | $2.6B (+7.5%, +7.2% currency-neutral) | ~87M (flat Y/Y, +350k sequentially) | take rate 25.9% (+130 bps, ads-driven); revenue $668M; Depop sold to eBay; about 220 roles cut (≈12%) | https://www.sec.gov/Archives/edgar/data/0001370637/000137063726000079/q226shareholderletter.htm ; https://www.nasdaq.com/articles/etsy-q2-earnings-call-highlights |

Etsy guided to Q3 2026 GMS of $2.53-2.58B and a take rate of about 26% (https://www.gurufocus.com/news/9012316/etsy-etsy-faces-stock-decline-despite-positive-marketplace-trends).

**What this means for sellers.**

- **The buyer pool is stable, not growing.** After two years of decline, Etsy's GMS returned to mid-single-digit growth in 2026, but active buyers are flat at about 87M. Growth comes from more spend per buyer and from ads.
- **Etsy is taking a larger cut.** The take rate keeps rising (≈22.8% in Q4 2024, 25.9% in Q2 2026), and the letter credits Etsy Ads. Over time, a seller of ButterLu's size keeps less of each sale, either through ad spend or through Offsite Ads charges it cannot opt out of.
- **Search increasingly decides who wins.** Personalisation, ranking that favours each buyer's "shopping mission", and a lifetime-weighted rating all reward a shop that is already large and well reviewed. That strengthens ButterLu's position on Etsy.
- **Concentration risk is real.** Etsy's platform changes are frequent, and the Q2 2026 restructuring shows Etsy reshaping itself. A second channel is prudent. Etsy is still where the demand is, and nothing here suggests leaving it.

---

## 5. Building an independent channel: what Etsy allows

- **Off-platform transactions are banned.** "Any action to move a transaction off the Etsy platform is strictly prohibited" (Fees policy section 2, above). The Off-Platform Transactions Policy (https://www.etsy.com/legal/policy/off-platform-transactions/1254654515806) lists as violations:
  - "Encouraging buyers to purchase an item in your Etsy shop through another venue"
  - "Using a QR code to direct users off of the Etsy platform"
  - sharing contact details (phone, email, social handle) to complete a sale off Etsy
  - **"Instructing a member to purchase an item through an off-platform destination, such as a personal website, social media shop, or another online marketplace"**

  The Advertising & Marketing Policy also bars using Etsy Sales and Coupons for off-platform sales (https://www.etsy.com/legal/advertising/).
- **Customer emails.** Buyer information may be used only for Etsy-related communication and transactions. Without the buyer's consent a seller may not add buyers to a mailing list or send them unsolicited commercial messages (Seller Policy, https://www.etsy.com/legal/sellers). In Jan 2024 Etsy told sellers they cannot copy order emails into a mailing list (https://www.ecommercebytes.com/2024/01/07/etsy-cracks-down-on-marketing-to-buyers/ **[pre-2025]**). Etsy's guidance says consent must be a deliberate opt-in and can be withdrawn. Unsolicited promotions through Etsy Messages are not allowed.
- **Package inserts.**
  - *Allowed:* Etsy explicitly encourages business cards, thank-you notes and branded inserts, and lets sellers print an **Etsy** coupon and shop banner on packing slips (Handbook, https://www.etsy.com/seller-handbook/article/leaving-your-mark-with-packaging-and/34826235759; https://www.etsy.com/seller-handbook/article/26954984006). Social handles on inserts are common, and Etsy's own Handbook example features them.
  - *Prohibited by the plain text:* an insert that tells an Etsy buyer to *buy* the same frame at butterlu.com, especially with a QR code or an off-Etsy discount code. That is the "instructing a member to purchase … through a personal website" case.
  - *Gray area:* a brand mark or plain "butterlu.com" on the product or card with no purchase call-to-action is not explicitly addressed. An Etsy forum post from about 2010 framed the test as intent to avoid fees **[pre-2025, not policy]**. Treat it as risky and ask Etsy Seller Support before printing at volume.
- **Implications for ButterLu's plan.**
  1. Do not seed butterlu.com from Etsy order data. That means no email exports, no "shop direct and save" inserts and no QR codes to the site.
  2. Build the independent channel from traffic Etsy did not provide: Google organic, Pinterest, TikTok and paid search.
  3. Brand consistency, meaning the ButterLu name on product and packaging, is the lowest-risk way to let Etsy buyers find the brand on their own.
  4. Share & Save works in the opposite direction: ButterLu's social links to its Etsy shop earn a 4% fee refund. That is useful while Etsy remains the main checkout, but it competes with sending the same traffic to butterlu.com.
  5. For review republishing (G5), Pattern's Etsy review sync is the one sanctioned route found. Keep the pending Etsy question open for the custom site.

---

## 6. Ranked action checklist for ButterLu on Etsy

Ranked by expected impact divided by effort. "Effort" assumes the existing exports and scripts in the repo.

1. **Move personalisation into Custom options** (high impact, low-medium effort). Use structured required fields for each text line, plus a choice list or variation for shape and background, and remove the "note to seller" workaround. This cuts personalisation errors and case rate (part of the customer and market experience score and Star Seller), and Etsy recommends it. Do it as a bulk edit on a reusable option set.
2. **Fix first photos to show a finished, personalised frame** (high impact, low effort). This is a Creativity Standards requirement and Etsy calls the first image a major engagement and ranking input. Audit listings whose first photo shows placeholder text.
3. **Pull query demand from Marketplace Insights, Etsy Plus at $10/mo** (high impact, low effort). Unlimited searches for recipient and occasion terms ("aunt frame", "godmother gift", "nana picture frame") supply the missing keyword volumes, and Etsy Plus covers its own cost through credits. Feed the results into `plans/clusters.json` and G2.
4. **Consolidate same-intent duplicate listings** (medium-high impact, medium effort). Using Shop Stats (12-month views, orders, favourites), keep the best performer for each distinct query and deactivate or merge the rest. Frequency capping means duplicates aimed at one query compete with each other. This also saves renewal fees. Do not delete listings that carry many reviews or sales; deactivate them first.
5. **Shorten titles in Etsy's 2025 style on a test batch first** (medium impact, low effort). Use "Personalized [Recipient] Picture Frame, Custom Name Photo Frame" and move the long tail into all 13 tags. Change 10-20 listings, compare 30-day Search Analytics, then roll out. Etsy says old titles are not penalised, so this is not urgent.
6. **Complete recipient, occasion, holiday, colour and material attributes on every listing** (medium impact, low effort). They feed matching, the filters and the Gift Mode / Gifting Assistant surfaces.
7. **Turn on targeted offers and a packing-slip coupon for the Etsy shop** (medium impact, very low effort). This is the sanctioned repeat-buyer loop for a gift product bought for many recipients and occasions.
8. **Protect Star Seller and the case rate** (high impact if it slips, ongoing effort). Keep message response at 95% or above within 24 hours and on-time shipping with tracking. Consider the new shared access so a helper can cover messages. Star Seller also exempts the shop from reserves and is being "evolved", so watch for new criteria.
9. **Review Etsy Ads with Ad Groups** (medium impact, medium effort). Group listings into best-sellers, seasonal and new, and cut ads on low-ROAS groups. Offsite Ads at 12% cannot be avoided, so price with it in mind: about 23% total cost on an attributed $30 order.
10. **Keep INFORM and business details current** (low effort, avoids a catastrophic failure). Unverified high-volume shops get put into vacation mode.
11. **Seasonal listing refresh ahead of Q4 and Mother's Day** (medium impact, low effort). Recency gives only a small, temporary boost, and Etsy says renewal tricks do not work. New, genuinely distinct seasonal listings are what helps.
12. **Ask Etsy Seller Support in writing about inserts and brand marks** (low effort, settles the gray area) before putting "butterlu.com" on any packaging. Keep it alongside the G5 review question.
13. **Skip:** Etsy Wholesale (closed since 2018), and renewing listings for recency.

---

## Gaps and unverified items

- The full text of the Seller Policy effective 9 Jul 2026 was not readable. Only the archived prior version's existence is confirmed.
- The US payment-processing rate (3% + $0.25) comes only from secondary sources. The Etsy Payments Policy page was blocked.
- The current fee for targeted offers, and the maximum number of options in a Custom options choice list, are unknown. The second matters for the 44 backgrounds.
- No official Etsy statement quantifies how frequency capping treats a shop's same-product listings that target *different* queries.
- The Star Seller sales minimum (some guides say 5 orders or $300) is unconfirmed, and Etsy says the program is changing.

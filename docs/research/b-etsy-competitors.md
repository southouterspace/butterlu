# B — ButterLu's competitors on Etsy

Scan date 2026-10-12. Source: Etsy Open API v3 with the x-api-key header only (`findAllListingsActive` with `sort_on=score`, `limit=100`, `currency=USD`, `buyer_country=US`, then `getShop` for each of the 1,058 shops that appeared). I did not fetch any etsy.com page. The script is `scripts/etsy-market-scan.mjs` (not committed). Raw listing and shop data is in `research/etsy-market-raw/` in the scratchpad only. Aggregates are in `research/etsy-market-raw/summary.json`. Delete the raw folder when the research is done (API Terms §1 on caching Member Content).

## Read this first: what the API ranking is and is not

1. **API relevance is not etsy.com search ranking.** Real Etsy search is personalised, puts ads at the top, and uses sales and conversion signals that the API does not show. "ButterLu at position 4" means position 4 in the API's `score` order. It does not mean page 1 on etsy.com.
2. **The API gives each shop at most 3 listings per query, spread out.** In every query of 100 results, no shop had more than 3 listings, except where the result set was small (`great grandparent announcement frame`, 7; `grandma large picture frame`, 28). A shop's second listing lands around position 50 and its third around position 90. So only a shop's first position means anything. The rank that counts is **shop rank**: the order in which shops first appear. For the same reason, the requested "share of top 100 held by the top 5 shops" comes out at 15% for every full query, and that tells us nothing. I report the share held by large shops instead.
3. **Anonymous requests stop at offset 100.** I could see only the top 100 per query.
4. **Prices are base prices.** They are the lowest variation price, converted to USD. They exclude shipping. Shipping profiles need OAuth (`shops_r`), so I cannot tell who ships free. The only signal is listing text: 5.5% of competitor listings mention free shipping in the title, tags or description.
5. ButterLu's live shop record today: 76,245 sales, 13,687 reviews, 4.9 rating, 610 active listings (the 2026-10-12 export counted 619), shop opened 16.5 years ago.

## Per query

Columns: total results Etsy reports for the query; ButterLu's positions in the top 100; ButterLu's **shop rank**; ButterLu's price there; price p25 / median / p75 across the top 100; share of the top 100 from shops with at least 10k sales.

| Query | Results | BL positions | BL shop rank | BL price | p25 / median / p75 | ≥10k-sale shops |
|---|---|---|---|---|---|---|
| grandparent pregnancy announcement frame | 811 | 4, 48, 86 | **4** | 37.95 | 20.95 / 29.00 / 35.20 | 60% |
| wedding gift for parents frame | 4,850 | 33, 65, 97 | 33 | 35.95 | 26.86 / 31.58 / 50.00 | 59% |
| grandma picture frame personalized | 5,352 | 13, 60 | 13 | 35.95 | 25.00 / 31.99 / 39.98 | 60% |
| godmother proposal frame | 423 | 30, 56, 91 | 30 | 37.95 | 21.05 / 30.24 / 35.31 | 47% |
| godfather baptism frame | 746 | 1, 53, 89 | **1** | 35.95 | 19.73 / 28.91 / 34.78 | 65% |
| godmother baptism frame | 1,008 | 18, 56, 90 | 18 | 35.95 | 24.21 / 29.44 / 35.72 | 62% |
| grandpa christmas frame | 2,061 | 35, 63, 94 | 35 | 62.35 (large) | 24.95 / 29.95 / 44.20 | 64% |
| grandpa birthday frame | 3,055 | 25, 53, 89 | 25 | 35.95 | 20.15 / 28.95 / 35.91 | 55% |
| couple wedding frame | 35,111 | — | — | — | 24.94 / 35.25 / 65.06 | 40% |
| aunt picture frame | 1,170 | 10, 51, 89 | 10 | 37.95 | 21.88 / 29.95 / 35.64 | 71% |
| uncle picture frame | 806 | 5, 49, 87 | **5** | 35.95 | 21.99 / 29.95 / 35.62 | 60% |
| aunt brag board | 6 | 1, 4, 5 | **1** | 62.35 | 43.99 / 59.15 / 62.35 | 100% |
| brag board | 345 | 29, 61, 92 | 29 | 62.40 | 21.52 / 40.00 / 56.46 | 35% |
| grandma christmas frame | 4,489 | 26, 99 | 26 | 45.17 | 19.29 / 29.02 / 39.15 | 69% |
| baby announcement frame | 7,895 | 4 | **4** | 35.95 | 10.45 / 22.41 / 30.39 | 33% |
| new baby birth frame | 2,728 | 37 | 37 | 35.95 | 25.82 / 34.99 / 45.00 | 44% |
| great grandparent announcement frame | 85 | 6, 44, 49, 72 | **6** | 37.95 | 21.99 / 29.47 / 37.95 | 59% |
| godparents gift frame | 1,754 | 2 | **2** | 35.95 | 25.00 / 30.72 / 38.85 | 55% |
| mom picture frame personalized | 13,197 | — | — | — | 24.98 / 33.92 / 40.77 | 45% |
| dad fathers day frame | 21,393 | — | — | — | 6.37 / 21.57 / 30.23 | 47% |
| grandpa fathers day frame | 4,347 | — | — | — | 15.00 / 19.99 / 28.54 | 56% |
| pet memorial frame | 79,775 | — | — | — | 26.08 / 37.83 / 51.57 | 32% |
| baby memorial frame | 3,627 | 10, 50, 89 | 10 | 35.95 | 23.50 / 34.99 / 52.75 | 25% |
| grandma large picture frame | 107 | — | — | — | 31.24 / 67.00 / 99.99 | 16% |
| parents of the bride frame | 1,433 | 29, 60, 92 | 29 | 35.95 | 26.50 / 32.95 / 46.69 | 62% |
| personalized picture frame | 91,110 | — | — | — | 24.99 / 31.58 / 39.99 | 43% |
| custom photo frame | 109,901 | — | — | — | 16.65 / 30.10 / 49.99 | 23% |
| 4x6 frame personalized | 8,929 | 79 | 58 | 37.95 | 22.50 / 35.09 / 47.45 | 37% |
| personalized frame gift | 243,320 | — | — | — | 24.75 / 34.53 / 49.99 | 41% |
| custom text picture frame | 2,157 | — | — | — | 20.00 / 29.99 / 50.00 | 37% |

What the table shows:

- ButterLu appears in 20 of the 30 queries. It is a top-6 shop in 7 of them: godfather baptism (1), aunt brag board (1), godparents gift (2), grandparent announcement (4), baby announcement (4), uncle (5) and great-grandparent announcement (6). These are mostly niche queries with 85 to 1,754 results.
- It does not appear in the top 100 for any of the large generic queries (personalized picture frame, custom photo frame, personalized frame gift, custom text picture frame). It also misses couple wedding frame, mom picture frame, both Father's Day queries and pet memorial frame. That is true even though the shop has 14 pet-memorial listings and Father's Day listings (clusters P029 and P014).
- In the queries where it competes hardest (wedding for parents, godmother proposal, grandpa christmas, parents of the bride), its first listing sits around shop rank 30.
- In the core recipient queries, 55–71% of the top 100 comes from shops with more than 10k sales. These are established shops, not hobbyists.

## The competitor shops

1,058 distinct shops appeared. 11 of them have at least 50k sales. Below are the 25 that appeared most often across the 30 queries. ButterLu is on the second row for comparison. Format is my reading of title, tags and materials, which are the only fields the API gives.

| Shop | Times in a top 100 (queries) | Best pos. | Median price | Sales | Reviews | Rating | Age (yrs) | Active listings | Format |
|---|---|---|---|---|---|---|---|---|---|
| MomentsInPine | 56 (21) | 1 | 26.95 | 24,721 | 5,080 | 4.96 | 7.9 | 941 | engraved wood + photo clip |
| **ButterLu** | 51 (20) | 1 | 35.95 | 76,245 | 13,687 | 4.90 | 16.5 | 610 | printed wood frame, glass |
| FlowersinDecemberDS | 40 (17) | 1 | 30.45 | 23,889 | 4,835 | 4.78 | 12.7 | 511 | hand-stamped/painted frame, 4x6 |
| BrandonScottAD | 39 (17) | 1 | 28.42 | 77,955 | 14,559 | 4.85 | 12.4 | 561 | personalised text frame (materials not listed) |
| ThePictureFrameShop | 36 (16) | 1 | 31.49 | 58,016 | 12,044 | 4.93 | 10.9 | 914 | printed wood frame, plexi |
| TheLokiGiftShop | 33 (15) | 2 | 25.00 | 40,020 | 4,601 | 4.80 | 9.3 | 336 | canvas/burlap print, frame optional; 80 digital listings |
| SweetnPetiteDesignCo | 32 (13) | 3 | 26.91 | 23,171 | 4,718 | 4.82 | 6.0 | 315 | printed wood / canvas |
| KatePosh | 30 (11) | 2 | 28.95 | 21,343 | 4,580 | 4.94 | 5.5 | 945 | engraved wood with glass |
| MrCarpenterStore (UA) | 28 (14) | 10 | 44.56 | 6,011 | 1,116 | 4.93 | 7.5 | 364 | wood, mixed |
| PinkSeagullDesign (CA) | 28 (1) | 7 | 95.77 | 4,759 | 1,188 | 4.96 | 9.5 | 184 | large acrylic (only one query) |
| WoobiesCorner | 27 (11) | 2 | 24.99 | 49,470 | 9,908 | 4.94 | 12.8 | 314 | wood-burned (pyrography), 4x6 |
| EnchantedHillStudios | 24 (10) | 1 | 32.95 | 15,597 | 3,121 | 4.97 | 10.0 | 158 | printed wood plaque + photo peg |
| MySoulAndSpiritStore | 22 (9) | 7 | 13.27 | 5,115 | 1,202 | 4.77 | 6.0 | 529 | low-price mixed |
| LuneGalleryShop | 22 (8) | 5 | 43.99 | 4,031 | 561 | 4.87 | 1.8 | 101 | glass |
| CustomWoodWonders | 19 (9) | 2 | 19.16 | 47,353 | 9,811 | 4.87 | 12.4 | 376 | engraved pine, 4x6 |
| LifeSongMilestones | 19 (8) | 9 | 49.99 | 26,951 | 6,741 | 4.87 | 7.4 | 9,130 | printed MDF |
| SecretCreation (GB) | 17 (8) | 6 | 29.04 | 184,079 | 33,271 | 4.87 | 13.2 | 531 | printed wood with acrylic pane |
| SpringbrookEngraving | 17 (7) | 5 | 27.50 | 27,149 | 6,225 | 4.95 | 12.1 | 715 | engraved wood |
| TheLetteredLane | 17 (10) | 4 | 46.00 | 25,610 | 4,366 | 4.76 | 15.0 | 177 | painted wood |
| PersonalizedLane | 17 (7) | 6 | 35.64 | 16,859 | 3,034 | 4.94 | 10.5 | 377 | vinyl on wood, 4x6 |
| 28Collective | 16 (11) | 1 | 43.00 | 266,064 | 55,881 | 4.94 | 7.4 | 1,539 | veneer MDF with glass |
| ClassyCraftsbyJoyce | 16 (7) | 6 | 58.43 | 5,740 | 993 | 4.93 | 10.4 | 229 | engraved wood |
| SweetGiftMart | 16 (9) | 21 | 21.99 | 4,680 | 1,260 | 4.91 | 7.9 | 147 | printed wood |
| SpokenGifts (GB) | 15 (7) | 3 | 13.88 | 228,432 | 34,483 | 4.88 | 9.6 | 1,460 | engraved wood, low price |
| LifetimeCreations | 15 (9) | 1 | 29.99 | 224,789 | 36,322 | 4.95 | 15.2 | 462 | engraved hardwood |

General marketplaces that also appear: PersonalizationMall (831,446 sales, 7 queries, $34.99 median). AlterdIndustries (55,003 sales, engraved alder, $31.58). WordsWorthFramingCO, myfourlittlechicks and BellaBustaGift each appear 9–14 times.

### The five real rivals

I counted a shop as a real rival if it sells ButterLu's product: a personalised text frame with a photo opening, built around the same recipients and occasions (grandparent reveal, godparent, aunt/uncle, parents of the couple), and if it appears across many of ButterLu's queries.

1. **BrandonScottAD.** 77,955 sales and 14,559 reviews: about 1.02× ButterLu's sales and 1.06× its reviews. It is the only rival as big as ButterLu in this exact niche. It appears in 17 queries at $28.42, about $7.50 under ButterLu. Its titles reuse the same "promoted to aunt/great grandma" copy.
2. **ThePictureFrameShop.** 58,016 sales (0.76×), 12,044 reviews (0.88×), rating 4.93, and 914 listings, more than ButterLu. It appears in 16 queries at $30.49–31.49. It sells printed wood frames with plexi, the closest product to ButterLu's.
3. **MomentsInPine.** 24,721 sales (0.32×). It is the shop most often in the top 100 (56 times, 21 queries, shop rank 1 for several). It sells engraved wood with a photo clip at a flat $26.95, which is $9 under ButterLu. It is a different format chasing the same searches.
4. **FlowersinDecemberDS.** 23,889 sales (0.31×), in 17 queries at $29.95–32.76. Its titles name the format: "Hand Stamped 4x6 Photo", "Hand Painted".
5. **WoobiesCorner.** 49,470 sales (0.65×), 9,908 reviews, rating 4.94. It sells wood-burned 4x6 frames at $21.99–33.99 and covers the grandparent-reveal and great-grandparent queries.

Close behind: myfourlittlechicks (15,134 sales; "wood/professional print/clip" at $34.50, the nearest product match to ButterLu's "wood/professional print"), PersonalizedLane (16,859; 4x6 at $35.64, the only rival at ButterLu's price), and EnchantedHillStudios (15,597; printed plaque at $32.95).

**Scale.** ButterLu is the second-largest shop in its own niche, level with BrandonScottAD. Among shops in this niche it is also the oldest (16.5 years). It is small next to the general personalised-gift shops that compete for the broad queries: PersonalizationMall (10.9× its sales), 28Collective (3.5×), SpokenGifts (3.0×), LifetimeCreations (2.9×) and SecretCreation (2.4×). These shops, along with 1,000+ small shops, take the generic queries where ButterLu does not appear.

## Product formats that compete

This is a classification from title, tags and materials, counted over the 2,891 query slots. Treat it as approximate: 33% of listings give no material at all.

- Printed or painted wood frame (ButterLu's format): 24%
- Engraved or laser-cut wood: 16%, plus 3% engraved in other materials
- Acrylic: 10%. It is strongest in the Christmas and Father's Day queries (16–21%) and in "grandma large picture frame" (31%)
- Digital or printable: 4% overall, but 27% of "baby announcement frame", 29% of "dad fathers day frame" and 13% of "brag board". These listings explain those queries' very low p25 (around $6–10)
- Glass-led: 4%. Metal: 2%. Ceramic or porcelain: 1%. Brag boards: 3%
- Unspecified: 33%

Across the 2,541 distinct competitor listings, materials name wood 578 times, glass 169, acrylic 98 (plus plexiglass 31), vinyl 58 and laser engraved 33. 85% are personalisable, 79% have variations, and 4.6% are download listings.

**Engraved wood is the main alternative format.** It is about two-thirds as common as printed wood and dominates godfather/godmother baptism, godparents, parents of the bride and the generic "personalized picture frame" query. Acrylic is the second alternative. Digital printables matter only for baby announcements and Father's Day.

## Tags and titles

**Tags.** ButterLu already uses 57 of the 60 most common tags in competitors' top-20 results. Its 610+ listings × 13 tags cover the vocabulary. The tags common among competitors that ButterLu never uses mostly name a material, a size or a spelling variant:

- Material and size: wooden photo frame, wood photo frame, wooden picture frame, wood frame, custom wood frame, 5x7 picture frame, 8x10 picture frame
- Format: custom engraved, laser engraved frame, custom text frame, magnetic frame, fridge photo magnet, floating frame, photo collage
- Room: wall decor, home decor, rustic home decor
- Occasion: christening frame, personalized baptism, wedding anniversary, sonogram keepsake, ultrasound display, birth stats frame, expecting
- Spelling and language: personalised frame, personalised gift, personalisierter bilderrahmen
- New recipients: niece picture frame, cat memorial gift, rainbow bridge gift, pet memorial sign, gift for wife

The ones ButterLu could use truthfully: wooden picture frame / wood photo frame (its listings already give wood and MDF as materials), custom text frame, christening frame, wedding anniversary, niece picture frame, rainbow bridge gift, sonogram keepsake, birth stats frame and wall decor. It should not use "engraved", because its product is printed.

**Titles.** Competitor titles have a median of 131 characters (p25 93, p75 138, max 140). ButterLu's median is 123 (p25 98, p75 133), slightly shorter. Competitors pack titles nearly to the 140-character limit. Some phrase gaps, as share of competitor titles vs ButterLu titles:

| Phrase | Competitors | ButterLu |
|---|---|---|
| wood / wooden | 18.8% | 0.8% |
| engraved | 12.7% | 0.2% (correct, the product is printed) |
| 5x7 | 4.3% | 0% |
| 8x10 | 3.3% | 0% |
| 4x6 | 8.9% | 10.0% |
| magnet | 4.1% | 0% |

Competitors separate title phrases with commas (61% vs ButterLu's 20%) or pipes (12% vs 0.5%). ButterLu leans on colons (23% vs 8.5%), on "from daughter/son/niece" phrasing (17% vs 7%) and on "keepsake" (32% vs 19%). The title phrases that recur among competitors and never appear in ButterLu titles are "custom text picture frame" (12), "wood/wooden photo frame" (19), "picture frame engraved" (8), "4x6 5x7 8x10" (7), "baby birth" / "birth stats" (14), "shadow box" (8), "song lyrics" (10) and "for godparents" (6).

**Other signals.** Only 5.5% of competitor listings mention free shipping anywhere in their text (none in titles), so free shipping is not a visible differentiator. The median competitor listing was created 2.0 years ago and has 5 favourites. ButterLu's median listing is 3.5 years old. Median competitor processing time is up to 4 days. I cannot tell whether a competitor has Star Seller status: the field does not exist in the v3 Shop schema.

## Price positioning

ButterLu's standard frame is $35.95 (386 listings), with $37.95 for the announcement designs (140 listings).

- **In its core recipient queries it sits at roughly the 75th percentile of the top 100.** Examples: grandparent announcement (p75 $35.20, ButterLu $37.95), godfather baptism (p75 $34.78), aunt (p75 $35.64, ButterLu $37.95), uncle (p75 $35.62), grandpa birthday (p75 $35.91). The median there is $28.91–$31.99. ButterLu is $5–9 above it.
- **Its direct rivals are all cheaper:** BrandonScottAD $28.42, ThePictureFrameShop $30.49–31.49, MomentsInPine $26.95, FlowersinDecemberDS $29.95–32.76, WoobiesCorner $21.99–33.99. Only PersonalizedLane ($35.64) and myfourlittlechicks ($34.50) price near ButterLu.
- **In the broader queries it is mid-market:** new baby birth (median $34.99, p75 $45.00), pet memorial ($37.83 / $51.57), mom ($33.92 / $40.77), personalized frame gift ($34.53 / $49.99), 4x6 frame personalized ($35.09 / $47.45). Across all 2,192 physical competitor frame listings, the median is $30.99, the p75 is $44.80, and 35.6% are priced at or above $35.95.
- **Brag boards at $62.40 are expensive.** The "brag board" median is $40.00 (p75 $56.46). ButterLu is above p75 there and sits at shop rank 29. The only query it wins outright is "aunt brag board", which has just 6 results.
- **Large frames ($62.35–62.40) are cheap for that segment.** "grandma large picture frame" has a median of $67.00 and a p75 of $99.99. ButterLu does not appear in that query at all.

Honest assessment:

- **The standard frame is not clearly overpriced, but it is at the top of its segment.** The $35.95 base price is almost certainly set just above Etsy's $35 US free-shipping-guarantee threshold. That is my inference from the number; the API cannot show shipping profiles. Many cheaper rivals probably add $5–8 shipping, which would close most of the $5–9 gap. So the base-price comparison overstates the premium. ButterLu's review volume (13.7k at 4.9) supports a price at the top of the segment.
- **The $37.95 announcement price is the most exposed.** Grandparent announcement is ButterLu's largest cluster (P001). There it is $2 above the standard frame and $9 above the median, against rivals at $26.95–$33.99. If the API positions say anything about demand, this is where a price test ($35.95) is most worth running.
- **Brag boards are overpriced** for a format whose market median is $40.
- **Large frames have room to go up**, and are under-exposed.
- **Wherever ButterLu does not appear in the top 100, price is not the cause.** Those prices sit at or below the median. The probable cause is title and tag wording. ButterLu titles do not say "wood", sizes or "custom text". Engraved wood and acrylic, which ButterLu does not sell, also hold a large share of the generic queries.

## Limits

- API relevance order is not etsy.com ranking. Ads and personalisation are invisible to the API.
- Prices are base prices without shipping. Variation prices need OAuth (`listings_r`).
- Per-listing sales are not available. Shop sales are lifetime totals and include all of a shop's products. The large general shops sell far more than frames.
- Format classification is keyword-based and leaves 33% of listings unspecified.
- One snapshot. Results change daily.

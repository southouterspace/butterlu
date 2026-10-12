# A. ButterLu's own Etsy listing metadata: audit

Source: `plans/etsy-listings.json` (619 active listings, exported 2026-10-12 12:22 UTC) and
`plans/clusters.json`. Script: `scripts/etsy-metadata-audit.mjs` (read-only, no network).
Output: `plans/etsy-metadata-audit.json`, which has every number below plus one row per
listing with flags. Rerun with `node scripts/etsy-metadata-audit.mjs`.

**Read this first.** `views` and `numFavorers` are lifetime counts since the listing was
first created. They are not sales and they are not recent demand. Per-listing sales need
Etsy OAuth (`transactions_r`). Older listings that still exist are also the survivors:
listings that did badly in 2017 were probably deleted long ago, so comparisons by age
favour old listings.

Not in the export, so not audited: listing attributes/properties (occasion, holiday,
recipient, colour, etc.), variations and per-option prices, video, shipping and processing
times, description text (only length and a hash), who_made/when_made.

Product mix (rules from `lineup-draft.mjs`): 539 frames, 30 car accessories, 23 large
frames, 22 brag boards, 5 add-ons. Two Jesus-card listings fall into "frame" because the
rule only catches "figurine" in the title; the line-up rules should catch them too.

---

## 1. Titles

**Length.** Median 123 characters and 18 words. 435 of 619 (70%) are over 15 words. 123
are at 135 characters or more, and 10 hit the 140 cap. Only 142 are under 80 characters.

| Words | Listings |
|---|---|
| under 8 | 38 |
| 8–11 | 104 |
| 12–15 | 42 |
| 16–19 | 231 |
| 20–23 | 179 |
| 24+ | 25 |

**Two title styles.** Some older listings were rewritten into Etsy's post-2023 style
("Personalized Mimi Picture Frame: Grandma Gift"). Most listings, and almost all new
ones, are long keyword strings ("Grandma Mother's Day Gift For Grandma Mother's Day
Grandma Gift  Mimi Frame Gift for Grandma Mimi Gift..."). 122 of the 129 listings created
in 2026 are long keyword strings.

For frames only: 117 short titles have median 1,230 lifetime views and 49 favourites;
391 long titles have median 323 views and 10 favourites. **Do not read this as "short
titles win".** The short-title group has median age 7.1 years and the long group 2.0
years. The shop seems to have shortened the titles of its old winners, so age and
survivorship explain much of the gap. Favourites per view are about the same (3.3% short
vs 3.9% long).

**Repetition.** 368 titles say "gift" twice or more, and 154 say it three or more times.
298 say "frame" twice or more. 253 titles repeat some content word three or more times.
The worst cases are all weak listings, for example 1818974413 ("Personalized Dog Picture
Frame, Dog Mom Gift, Dog Lover Gift, Custom Pet Frame, Gift for Dog Mom, Pet Picture
Frame, Dog Memorial Gift": "dog" ×5, "gift" ×4, 170 views, 5 favourites). 31 titles have
double spaces where separators were stripped, a sign of pasted keyword strings.

**The first 40 characters.** 306 titles (49%) start with a generic word, and 287 of them
start with "Personalized". 486 name a recipient within the first 40 characters, 215 name
an occasion, and 58 name neither. The top three-word openers are "personalized grandma
picture" (24), "personalized baby girl" (14) and "personalized godmother picture" (12).
Recipients are front-loaded well. The design (the quote or theme that makes one listing
different from its siblings) almost never appears in the first 40 characters.

**Duplicates.** 11 groups of titles are exact duplicates (25 listings), for example four
listings titled "Personalized Grandma Picture Frame: Custom Grandparent Gift" (49, 99, 22
and 587 favourites) and two "Personalized Godfather Picture Frame: Baptism Gift" from
2025 with 0 favourites each. 122 pairs are near duplicates (content-word Jaccard ≥ 0.8),
covering 158 listings. Many of the exact duplicates are different designs whose short
rewrite dropped the only words that told them apart.

## 2. Tags

- 609 of 619 use all 13 tags. 10 do not: 6 have 12, 1 has 11, 1 has 6, and **2 have none**
  (listing "Personalized Wedding Thank You Gift for Parents: Custom Family Keepsake", 894
  views, 19 favourites, and a godfather frame with 138 views). 41 empty slots in all.
- 8,006 tag uses, 2,416 distinct tags. Median tag length 16 characters. 309 uses are
  exactly 20 characters. **10 tags look cut off at the 20-character limit**:
  "christmas grandparen", "grandpa picture fram" (×2), "abuela christmas gif",
  "christian easter gif", "i'll love you foreve", "mimi and granddaught",
  "personalized godfath", "pregnancy announceme". A cut-off tag only matches searches
  for the cut-off word.
- Words per tag: 1 word 201, 2 words 3,966, 3 words 3,514, 4+ words 325. Multi-word tags
  are the norm, which is right.
- Duplicate tags inside one listing: 3 listings, 3 wasted slots.
- **Tags that repeat the title.** 1,737 tag uses (21.7%) appear word for word in the
  title. 4,475 (55.9%) have every word somewhere in the title. 100 listings have 5 or more
  tags copied verbatim from the title. Etsy matches title and tags together, so these
  slots add little new reach. Etsy does not penalise them.
- **Generic tags that restate the category.** 480 uses on 336 listings: "personalized
  frame" 160, "personalized gift" 99, "picture frame" 81, "personalized" 76, "custom frame"
  47, "photo frame" 15. These are the broadest queries on the site and the shop already
  matches them through its titles and category.
- **Most-used tags:** personalized frame 160, personalized gift 99, grandma gift 82,
  picture frame 81, grandparent gift 78, personalized 76, baby keepsake 71, baby
  announcement 67, baby photo frame 64, baptism gift 61, pregnancy reveal 58.
- **Self-competition.** 41 tags are shared by 25+ listings, 13 by 50+, 1 by 100+. 2,029
  tag uses (25.3%) are on a tag that 25 or more of the shop's own listings also carry.
  Etsy usually shows only a few listings per shop for one search, so most copies of a
  shared tag probably earn nothing. This is inferred, not measured.
- **Long tail.** 1,441 tags are used by one listing only (18% of tag uses). 182 listings
  have no tag that is unique to them.

**Recipient and occasion phrases in titles vs tags.** Titles are almost always backed by
tags. The gaps run the other way: tags name recipients and occasions the title does not.

| Phrase | In title and tags | Title only | Tags only |
|---|---|---|---|
| christmas | 64 | 7 | 87 |
| mom/mother | 63 | 7 | 65 |
| baby | 192 | 7 | 54 |
| godparents | 27 | 1 | 53 |
| grandparents | 76 | 0 | 53 |
| mother's day | 11 | 4 | 46 |
| birthday | 36 | 16 | 44 |
| grandpa | 130 | 0 | 40 |
| pregnancy announcement | 85 | 9 | 29 |
| thank you | 42 | 3 | 28 |
| dad/father | 52 | 4 | 27 |
| father's day | 21 | 2 | 23 |

The "tags only" Christmas, Mother's Day and Father's Day uses are seasonal hooks, which is
a reasonable use of tags. "Birthday" is the one phrase that is often in the title but not
the tags (16 listings).

## 3. Materials

49 listings have no materials (42 of them frames). 7 materials are spelled in more than one
case ("glass", "Glass", "GLASS"; "mdf"/"MDF"; "wood"/"Wood"). Most used: wood 483, mdf
440, glass 291, easel 215, paint 177, professional print 143. The combinations are
inconsistent for what the owner says is one product: 58 frames list only "Wood", 78 list
"easel, glass, mdf, wood". Etsy says materials are searchable but they are a minor field;
low impact.

## 4. Taxonomy

- 508 listings in Home & Living > Home Decor > Picture Frames & Displays > Picture Frames,
  74 in Weddings > Gifts & Mementos > Portraits & Frames > Picture Frames. Both are the
  deepest node seen. Leaf status was not checked against Etsy's taxonomy endpoint.
- Every frame in the Weddings category has a wedding, engagement or couple title. 12
  wedding-titled frames sit in the Home category instead. Which category ranks better for
  wedding searches is unknown.
- Odd placements: the "Print out photo 4x6 or 4x4" add-on is in Digital Prints (it looks
  like a physical print service, so probably miscategorised); two pet car charms are in
  Pet Supplies > Pet Portraits while the other car charms are in Keychains or Car
  Coasters. The pet charm in Pet Portraits (1697897924) is the shop's only listing with
  required personalisation.
- Brag boards (22) share the Picture Frames category with frames.

## 5. Sections

16 sections (Etsy allows 20). Sizes: Grandparent Frames 131, Baby Frames 109,
Wedding/Engagement 89, Godparent Frames 64, Grandpa/Papa/Pop 47, Aunt & Uncle 34, Car
coasters/ornaments 30, New Grandparent To Be 26, Pet 25, Mom & Dad 23, Photo Blocks Clip
Frames 22, Teacher/Nanny/Coach 7, Encouragement/Faith 7, Graduation/Sorority 3, Add ons 1,
Siblings/Friends 1.

- 28 frames sit in a section that does not match the recipient in their title, for
  example three godmother frames and a godparent frame in Grandparent Frames,
  several great-aunt frames in Grandparent Frames, a godfather proposal frame in Aunt & Uncle.
- "Grandparent Frames" and "Grandpa/Papa/Pop" overlap. "Photo Blocks Clip Frames" holds
  brag boards but is not named that way; buyers search "brag board".
- Three sections have 1–3 listings.
- "Car coasters/ornaments" uses a slash and lower case; naming is inconsistent across
  sections ("Frames" suffix on some, not others).

## 6. Attributes, personalisation, variations and price

**Attributes** are not in the export. They feed Etsy's filters (occasion, holiday,
recipient) and Etsy describes them as extra keywords. This is the biggest blind spot in
this audit.

**Personalisation.**
- 591 personalisable, 28 not (19 car accessories, 4 add-ons, 5 classed as frames, of
  which 3 really are frames: 1818445202, 4367559764, 4441190498).
- Every personalisable listing has exactly one text box labelled "Personalization" with a
  256-character limit. No photo-upload question anywhere.
- **Only 1 listing requires personalisation**, and it is a car charm, not a frame. On the
  other 590 a buyer can check out without the names and dates the product needs.
- 14 distinct instruction texts. 502 use one text, which ends "Color chart is in pics, #1
  is fuchsia - please select from drop down menu above :)". 505 refer to the colour chart.
  550 ask the buyer to check spelling. Only 12 mention the photo, and none say how to send
  it.

**Variations.** 578 listings have variations, 41 do not. Names, options and per-option
prices need OAuth (`listings_r`), so the export only has the minimum price.

**Price.** 17 distinct minimum prices. Frames: 386 at $35.95, 140 at $37.95, 5 at $40.35,
plus 8 odd ones ($35.22, $35.35, $46.35 ×2, $52.40, $6.95 ×2 which are the misclassed
Jesus cards). Large frames $62.40 (23), brag boards $62.35 (22), car accessories
$14.35–$23.35 across 6 prices, add-ons $6.40–$6.95.

$37.95 frames have median 41 favourites vs 9 at $35.95, but the $37.95 group is mostly old
listings (median age 7.9 vs 2.0 years). Favourites per view are the same (3.65% vs 3.63%).
The data show no sign that the extra $2 costs engagement; it does not show that it helps
either. Newer listings are mostly priced at $35.95.

## 7. Images

- Median 10 images per listing; 251 listings have fewer than 10, 13 have fewer than 5.
  Etsy now accepts up to 20 photos: 201 listings have more than 10 and 10 listings have
  20. Video is not in the export, so video use is unknown.
- **Alt text: 16.1% of 6,361 images have any.** No listing has alt text on every image,
  125 have none, and only 8 listings have alt text on the main (rank 1) image.
- **Most of the alt text that exists is wrong.** 841 captions are in the style of an
  automatic captioner. Three captions cover 841 images on 450 listings: "a wooden dresser
  topped with vases filled with flowers" (422), "a flyer for a fashion show with a picture
  of a woman" (283), "a picture frame sitting on top of a table next to a potted plant"
  (136). Each caption sits on an image of the same size across listings (for example 1188×890
  at rank 4), so they are separate uploads of the same few info cards (colour chart,
  size card), each with a caption that describes something else.
- Another 180 alt texts are 20+ word keyword strings ("Handcrafted Picture Frame
  Cottagecore Design Toile Floral Pattern Vintage Inspired Details...").
- Main image: 294 landscape, 169 portrait, 156 square-ish. 438 main images are under
  2,000 px wide (Etsy recommends at least 2,000), 17 have a shortest side under 1,000 px.
- Image count vs engagement for frames is confounded by age (fewer-image listings are
  older and have more favourites), so no conclusion.

## 8. Descriptions

Text is not exported, only length and a hash. Median 1,709 characters. Only 420 distinct
descriptions for 619 listings: 255 listings share their description with at least one
other, and the largest group is 25 identical descriptions.

## 9. Performance (lifetime, not sales)

- Totals: 2,033,261 views, 73,538 favourites, 3.62% favourites per view.
- Per listing: median 625 views and 17 favourites; 73 have 0 favourites, 266 have under 10,
  151 have under 100 views.
- **Concentration.** The top 10 listings hold 38% of all favourites, the top 50 hold 69%,
  the top 100 hold 82%. 90 listings make up 80%.
- **Age.** `createdAt` is reset by renewal (all 619 fall between 2026-06-11 and
  2026-10-12, the 4-month auto-renew cycle). True age comes from `originalCreatedAt`:
  median 3.5 years. 240 listings (39%) were first created in 2025 or 2026.
- **The newer half of the shop carries almost nothing.** 296 listings created 2015–2021
  hold 95.2% of favourites (237 per listing, median 255 views a year). 323 listings created
  2022–2026 hold 4.8% (11 per listing, median 88 views a year). Survivorship inflates the
  old side, but views per year normalise for age and the gap is still about 3×. Of the 240
  listings created in 2025–2026, 167 sit on a search-intent page that already has an older
  listing with 100+ favourites. Those 167 have 872 favourites between them and median 63
  lifetime views. They look like new copies competing with the shop's own winners.
- **Low tail** (≥1 year old, <100 views a year, <5 favourites): 71 listings (59 frames, 11
  car accessories, 1 brag board). 21 of them are near duplicates of another listing. A
  further 84 of 159 listings under a year old have fewer than 50 lifetime views. 155
  listings in all are candidates to merge, retitle or retire.
- **Engagement (favourites per view, listings with 200+ views):** median 3.25%, p10 1.7%,
  p90 5.2%. Highest among listings with 1,000+ views: "Just a Girl and Her Dog" frame 7.9%,
  Mother of the Groom rustic frame 7.5%, great-grandparents countdown frame 7.4%. Lowest:
  the print add-on 0.8%, a "Grammy's Little Girl" frame 1.1%, and "Personalized Grandparent
  Picture Frame: Baby Announcement, Pregnancy Reveal" (14,267 views, 1.1%).
- **What carries the shop (share of favourites).**
  - By recipient: grandparents-to-be 14.4%, grandma 14.3%, parents of the couple 12.2%,
    godmother 11.8%, grandpa 10.9%, godfather 6.8%, large frames 6.4%, brag boards 3.8%,
    baby 3.3%, aunt/uncle 3.0%. Pets 0.7%, teachers 0.3%, car accessories 0.5%.
  - By occasion: pregnancy announcement 20.4%, wedding 16.1%, everyday 14.5%, baptism
    11.7%, birthday 6.7%, Christmas 6.7%, proposal 6.4%. "Birth" has 81 listings but only
    2.3% (21 favourites per listing).
  - By page: grandparents-to-be/announcement 14.4% (27 listings), parents-of-couple/wedding
    12.1% (44), grandma/everyday 9.7% (39), godmother/proposal 5.8% from just 4 listings
    (1,063 favourites per listing).
  - Grandpa pages convert views to favourites best: grandpa/christmas 5.3%,
    grandpa/birthday 5.5%, grandpa/everyday 5.4%.
- Top single listings: grandparent announcement ultrasound frame (4,177 favourites, 111k
  views), godmother proposal (4,062, 124k), pregnancy announcement for grandparents
  (3,313), Mimi frame (2,989, 134k views).

---

## 10. Ten metadata fixes, ranked

Ranked by how sure I am it helps times how much of the shop it touches. None of these
can be measured from this data alone: the export has no sales, no search impressions and
no history. Each fix should be tried on a batch and checked in Etsy Stats after 4–6 weeks.
Leave the ~126 listings with 100+ favourites alone until a fix has shown it is safe on
weaker listings. Etsy does not publish how much a title edit disturbs an established
listing's ranking.

| # | Fix | Listings | Mechanism and confidence |
|---|---|---|---|
| 1 | **Retire, merge or rework the low tail and the new copies.** Start with the 155 low-tail and quiet-new listings; then review the 167 listings from 2025–26 that duplicate a page with an established winner. | 155 (up to ~240) | Fewer copies of the same tags means less self-competition, and each renewal costs $0.20 every 4 months (~$93/yr for 155). Medium confidence that it does no harm; low confidence on any ranking gain. The data clearly show new copies are not adding much (4.8% of favourites from 52% of listings). |
| 2 | **Fix alt text.** Delete the three wrong machine captions, write short true alt text for the main image first, then the rest. Replace the 180 keyword-string alts. | 619 (5,339 images missing; 841 wrong on 450 listings; main image missing on 611) | Accessibility for certain. Possible help in Google Images and off-Etsy search. Etsy does not say alt text affects Etsy search ranking: low confidence there. Cheap and safe. |
| 3 | **Make personalisation required on frames, and say how to send the photo.** | ~534 personalisable frames (+3 frames with it off) | Not a search fix. Stops orders arriving without names or dates, and fewer messages back and forth. High confidence it helps operations. A required box may cost a few impulse checkouts; unmeasured. |
| 4 | **Give each duplicate title a differentiator** (the quote or theme in the first 40 characters). | 25 exact duplicates, 158 near duplicates | Identical titles give Etsy no reason to show more than one, and the buyer cannot tell them apart. Medium confidence. |
| 5 | **Shorten long keyword-string titles on newer listings** to one readable phrase: recipient, occasion, design, product. Move the spare keywords into tags. | 258 created 2022+ (435 in all) | Follows Etsy's own 2023+ guidance. Medium-low confidence of a ranking effect, which is why it starts with listings that have little to lose. |
| 6 | **Replace generic and title-copy tags with long-tail phrases** (the quote, recipient nicknames like Memaw/Gigi, the occasion, "ultrasound frame"). | 336 with generic tags; 100 with 5+ verbatim title tags | Each slot then matches a query the listing does not already match. Medium confidence. Watch for the same tag spreading across dozens of listings again. |
| 7 | **Fill empty tag slots and fix cut-off tags.** | 10 short of 13 (2 with none); 10 truncated | Certain to add matching terms; small reach. Trivial effort. |
| 8 | **Check and set attributes** (occasion, holiday, recipient). Export them first; they are not in this data. | unknown, likely all 539 frames | Etsy uses them for filters and as keywords. Medium confidence they matter; zero knowledge of current state. |
| 9 | **Tidy sections**: move the 28 mismatched frames, rename "Photo Blocks Clip Frames" to say brag board, merge the 1–3 listing sections, consistent naming. | 28 moves; 5 sections | Shop navigation and buyer trust. Little or no search effect. High confidence it is harmless. |
| 10 | **Small category and materials clean-up**: 12 wedding frames in the Home category, the print add-on in Digital Prints, pet charms in Pet Portraits; fill 49 empty materials and fix case on 7 materials. | ~15 category; 49 + case fixes | Category affects which searches and filters a listing appears in; materials are minor. Low impact, low risk. |

Also worth doing but not a metadata field: 255 listings share a description with another
listing (largest group 25). Description text is not in the export, so its quality could not
be checked.

# 08 — Etsy catalog export and the line-up draft

What was decided, measured and built on 2026-10-12, so the next session starts from it.
`CLAUDE.md` holds the rules. This is the record behind them.

## Decisions (owner)

- Leave Shopify. The new site in `site/` is built from the Etsy shop. Shopify supplies
  only its URLs, for 301s. Shopify Waves 1–3, loops L1–L8 and the Wave 0 write test are
  dropped. G1 is dropped.
- A frame is one of two shapes plus one of 44 backgrounds, with fully custom text. Etsy's
  many listings and options exist to capture search volume. On the new site they become
  search-intent pages that preset the one frame.
- The 44 uploaded backgrounds are the set. Etsy's numbered colour chart is not carried
  over.
- The opening takes a 4x6 photo. The owner believes this, but it has not been measured.
- The two plain rectangles in `assets/frame-drawing.pdf` are out of scope for now.

## Rerunnable outputs

| Script | Writes | Source |
|---|---|---|
| `scripts/etsy-export-listings.mjs` | `plans/etsy-listings.json` | Etsy Open API v3, `x-api-key` only |
| `scripts/shopify-catalog-from-pages.mjs <dir>` | `plans/catalog.json` | Saved pages from the Shopify connector, read-only |
| `scripts/product-options.mjs` | `plans/product-options.json` | `assets/` |
| `scripts/lineup-draft.mjs` | `plans/listing-map.json`, `plans/clusters.json` | the three files above |

## Etsy API facts learned (live spec, 2026-10-12)

- `x-api-key` requests cannot page past offset 100: they fail with "Offset exceeds the
  maximum allowed for anonymous requests". The export pages each shop section twice, once
  oldest first and once newest first. This works while no section holds more than 200
  listings, and the script stops with an error if one does.
- `getListingsByListingIds` with `includes=Images,Personalization` returns every image
  and the personalisation questions, 100 listings per call.
- The old `personalization_is_required`, `personalization_char_count_max` and
  `personalization_instructions` fields no longer exist. They are now
  `personalization.personalization_questions[]`.
- `views` is returned by the listing endpoints, tabulated daily.
- `getListingInventory` (variations and per-option prices) and all sales data need OAuth
  (`listings_r`, `transactions_r`).
- Titles and personalisation text come back HTML-entity encoded. The export decodes them.

## What the data showed

- 619 active listings: 591 personalisable, but only 1 requires personalisation. 539 are
  the frame. The other 80 are 23 large frames ($62), 22 brag boards, 30 car coasters and
  charms, and 5 add-ons. 84% of images have no alt text.
- Each Shopify handle ends in the last five digits of the Etsy listing it was imported
  from. That links 139 of the 243 handles to a listing. The rest came from listings that
  are no longer active, and are flagged for a human.
- 94 search-intent pages. 18 of them hold 80% of all favourites.
- Corrections to `CLAUDE.md` §2 are listed there.

## Open

- G2: the owner fills `plans/decisions.json` per page (build or not, shape, background,
  and the listing to preset from).
- G5: send the Etsy email in `docs/06`.
- Optional: Etsy OAuth, to rank pages by real sales instead of favourites.

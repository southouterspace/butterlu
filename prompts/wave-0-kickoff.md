# Wave 0 — kickoff prompt

Read-only reconnaissance plus one write test. Run this first. Paste verbatim into a
session that has the Shopify MCP connector, after reading `CLAUDE.md`.

---

You're working on the Butterlu Gifts Shopify store (`www.butterlu.com`, shop domain
`da0e1b-6c.myshopify.com`) via the Shopify MCP connector. This is **Wave 0**: read-only
reconnaissance plus exactly one write test. Do not perform any bulk mutations.

Ground truth is in `CLAUDE.md` §2 — rely on it, do not re-derive it.

## Task 1 — Catalog snapshot

Page through ALL 243 products using `graphql_query`. Do not stop at the first 50 —
paginate with `pageInfo.hasNextPage` / `endCursor` until exhausted.

Capture per product: `id`, `handle`, `title`, `status`, `publishedAt`, `productType`,
`tags`, `variantsCount.count`, `options { name, optionValues.length }`, `seo.title`,
`seo.description`, `descriptionHtml` length in characters, `featuredImage.altText`, and
the handles of any collections it belongs to.

Write to `plans/catalog.json`, matching the `_schema` already in that file. Keep
`descriptionHtml` itself OUT — store only its length and a SHA-256 hash so duplicates are
detectable.

## Task 2 — Cluster detection

From the snapshot, find duplicate and near-duplicate groups:
- Byte-identical titles (after trimming and collapsing whitespace)
- Titles differing by <= 2 words, case-normalised
- Products sharing an identical `descriptionHtml` hash

Write `plans/clusters.json` per its `_schema`, including a **suggested survivor**
per cluster with a one-line rationale (prefer: active, most collections, lowest variant
count, best title).

This is a recommendation for a human to rule on in `decisions.json`. **Do NOT archive,
merge, or redirect anything.**

## Task 3 — Write test

Pick ONE low-stakes ACTIVE product — not one of the five top performers, not a cluster
member. Set only its `seo.description` to a sensible <=155-character summary via
`productUpdate`. Read it back to confirm it persisted.

This establishes whether the "Pause and Build" plan permits Admin API writes at all —
which every subsequent loop assumes. If it fails, capture the exact error verbatim and
stop. Do not try workarounds.

## Guardrails

- No bulk mutations. Task 3 touches one product, one field.
- No deletions, archiving, status changes, variant changes, or price changes.
- No theme file writes.
- No Etsy API calls — Wave 0 is Shopify only.
- If reads fail repeatedly, stop and report rather than working around it.

## Report back

1. Did the write test pass? If not, the exact error text.
2. Total cluster count, and how many of the 243 products sit inside a cluster.
3. The godparent/godmother/godfather cluster size specifically — a prior audit put it near
   104. **Confirm or correct that number**; it was never counted first-party.
4. Count of ACTIVE products belonging to zero collections (orphans). A crawl found ~120
   URLs against 99 live products, so some are expected.
5. Anything in the data that contradicts `CLAUDE.md` §2 — **flag it loudly** rather than
   quietly reconciling it.

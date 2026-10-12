# Manifests

Every bulk operation ("loop") reads its work list from a file here and marks each row
`applied: true` as it goes. Nothing lives in agent context — a dead session resumes by
reading the file, and re-running is always safe.

**A loop never derives its work list at runtime.** It reads a manifest that a human or an
earlier step produced. That makes the plan auditable before a single mutation fires.

| File | Produced by | Consumed by |
|---|---|---|
| `etsy-listings.json` | `scripts/etsy-export-listings.mjs` | line-up, new site catalog |
| `catalog.json` | `scripts/shopify-catalog-from-pages.mjs` (Shopify URLs only) | listing map, 301s |
| `listing-map.json` | `scripts/lineup-draft.mjs` | 301s, review mapping |
| `clusters.json` | `scripts/lineup-draft.mjs` | **the owner** (to fill `decisions.json`) |
| `decisions.json` | **the owner** — gate G2 | new site catalog, 301s |
| `seo-copy.json`, `descriptions.json`, `redirects.json`, `reviews.json` | Shopify-era loops, dropped 2026-10-12 | — |
| `run-log.jsonl` | every loop | humans, debugging |

`run-log.jsonl` is append-only: one JSON object per line with `ts`, `loop`, `item`,
`result`. Never rewrite it.

**Never hand-edit a manifest mid-run.** Stop the loop, edit, restart — otherwise the log
stops matching reality.

These files are committed empty. They fill up as work proceeds. If a manifest contains
real data, treat it as the source of truth over anything in a conversation.

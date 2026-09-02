# 05 — Execution plan: dependency graph + resumable loops

The store findings and the review pipeline as one dependency graph, with every bulk
operation specified as a resumable loop.

Published artifact: https://claude.ai/code/artifact/ebb1d192-bcb4-4dbd-94c1-8d6bad9bd0cb

## Two shapes of work

**Graph-shaped** tasks have dependencies and mostly run once — they need correct ordering
and a verification step. **Loop-shaped** tasks repeat the same mutation across hundreds of
items — they need idempotency, checkpointing and a blast-radius budget.

Nearly all the *risk* lives in the loops. Nearly all the *wasted effort* lives in getting
the graph order wrong.

## Gates

| ID | Gate | Owner | Status | Blocks |
|---|---|---|---|---|
| G1 | Enable checkout (leave "Pause and Build") | Human | **OPEN** | All revenue; blocks no task |
| G2 | Consolidation decisions — keep/kill per cluster | Human | **OPEN** | **Both chains** |
| G3 | Etsy app credentials | Human | **DONE** | Review chain |
| G4 | Cloudflare connector authorised | Human | **DONE** | Deploy |
| G5 | Etsy's answer on review republishing | Etsy | **OPEN** | Waves 2-3 |

### G2 is the hinge
Consolidation decides which products still exist — and both the SEO backfill and the Etsy
review mapping key off that list. Run either first and you will write SEO copy for products
you are about to delete, and map reviews onto handles about to 301. Cheapest gate to clear,
most expensive to skip.

## Manifest architecture

Every loop reads its work list from a JSON manifest in `plans/` and marks each row
`applied` as it goes. **Nothing lives in agent context.** A session that dies at item 137
of 243 resumes at 138. Re-running from scratch is harmless.

```
plans/
  catalog.json        # 243 products: status, variants, title, seo, cluster
  decisions.json      # G2 output — keep/kill per cluster  <- HUMAN FILLS THIS
  seo-copy.json       # proposed title + description   { applied: false }
  redirects.json      # path -> target                 { applied: false }
  descriptions.json   # original + cleaned HTML        { applied: false, backup: "..." }
  listing-map.json    # etsy listing_id -> handle      { confidence: 0.0-1.0 }
  reviews.json        # fetched Etsy reviews           { applied: false }
  run-log.jsonl       # append-only: ts, loop, item, result
```

**The rule that makes it safe:** a loop never derives its work list at runtime. It reads a
manifest a human or an earlier step produced, so the plan is auditable before a single
mutation fires, and the diff between intent and outcome is inspectable in `run-log.jsonl`.

## The loops

| ID | Loop | Items | Batch | Reversible? | Depends on |
|---|---|---|---|---|---|
| L1 | SEO title + description backfill | ~140 | 20 | Yes — revert to null | G2 -> consolidate |
| L2 | 301 redirects (archived + merged) | 129+ | 50 | Yes — delete redirect | G2, archive audit |
| L3 | Strip Etsy links from descriptions | ~83 | 20 | **Only via backup** | none — backup first |
| L4 | Price correction to Etsy parity | 99 | 20 | Yes — old price stored | none |
| L5 | Archive junk products + redirect | ~5 | 5 | Yes | none |
| L6 | Fetch Etsy reviews + map to handles | ~635 | 100/page | Read-only | G3, G5, consolidate |
| L7 | Create review metaobjects + recalc | capped | 25 | Yes — delete | L6, schema |
| L8 | Collapse 100-variant products to 42 | 6+ | 1 | **NO — destructive** | G2, explicit sign-off |

## The loop contract

```
for batch in manifest.rows.where(applied == false).chunk(BATCH):
    for row in batch:
        result = mutate(row)               # 1. one API call per item
        assert verify(row)                 # 2. read back, confirm the write
        row.applied = true                 # 3. checkpoint immediately
        log(run-log.jsonl, row, result)    # 4. append-only audit trail
    persist(manifest)                      # 5. flush before next batch
    if error_rate(batch) > 0.1: HALT       #    circuit breaker
```

- **Checkpoint per item, flush per batch.** A crash re-runs at most `BATCH` items, all
  idempotent anyway.
- **Circuit breaker at 10%.** Given there is no undo, this is the control that matters
  most — stop rather than burn through 243 products doing the wrong thing.
- **L3 and L8 write a backup first.** L3 stores original `descriptionHtml` in the manifest.
  L8 has no backup path — deleted variants are gone, which is why batch size is 1 and it
  needs sign-off per product.
- **Dry-run flag on every loop.** First pass writes the intended mutation to the log
  without executing. A human reads the diff, then it runs for real.

## Run order

**Wave 0 — now, unblocked**
Catalog snapshot -> `catalog.json` · cluster detection · metaobject schema definition ·
L4 price correction · L5 junk archival · L3 Etsy link strip (backup first)

**Wave 1 — after G2**
Merge duplicate SKUs · L2 redirects · L1 SEO backfill on survivors · orphan audit +
collection assignment · L8 variant collapse (sign-off)

**Wave 2 — after G5 (blocked)**
L6 fetch + map reviews · confidence report · L7 metaobjects + recalc · theme section +
`aggregateRating`

**Wave 3 — after G4 (connector done; needs Wave 2)**
Worker: webhook verify, replay guard · `order.delivered` subscription · nightly sweep +
monitoring · collection copy, blog posts

**G1 sits outside this ordering entirely.** Nothing depends on it — but nothing earns
until it is done. Parallel and urgent, not a step.

## Failure and resume

1. **Re-running is always the first move.** Applied rows are skipped. No cleanup needed.
2. **Circuit breaker tripped?** Read `run-log.jsonl` for failing rows before touching
   anything. Usual causes: rate limit, stale product GID after consolidation, or a
   permission the connector lacks.
3. **Wrong content written?** L1, L2, L4, L5, L7 reverse from the manifest. L3 reverses
   from its stored backup. **L8 does not reverse** — that is why it is last and gated.
4. **Verify failing but mutation succeeding** usually means eventual consistency on
   Shopify's read replica. Re-read after a pause before treating it as a real failure.
5. **Never hand-edit manifests mid-run.** Stop the loop, edit, restart — otherwise the log
   stops matching reality and the audit trail is worthless.

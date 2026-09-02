# Manifests

Every bulk operation ("loop") reads its work list from a file here and marks each row
`applied: true` as it goes. Nothing lives in agent context — a dead session resumes by
reading the file, and re-running is always safe.

**A loop never derives its work list at runtime.** It reads a manifest that a human or an
earlier step produced. That makes the plan auditable before a single mutation fires.

| File | Produced by | Consumed by |
|---|---|---|
| `catalog.json` | Wave 0 snapshot | everything |
| `clusters.json` | Wave 0 cluster detection | human (to fill `decisions.json`) |
| `decisions.json` | **a human** — gate G2 | consolidation, L1, L2 |
| `seo-copy.json` | drafting step | L1 |
| `redirects.json` | archive audit + consolidation | L2 |
| `descriptions.json` | Etsy-link scan | L3 |
| `listing-map.json` | L6 title matching | L7 |
| `reviews.json` | L6 Etsy fetch | L7 |
| `run-log.jsonl` | every loop | humans, debugging |

`run-log.jsonl` is append-only: one JSON object per line with `ts`, `loop`, `item`,
`result`. Never rewrite it.

**Never hand-edit a manifest mid-run.** Stop the loop, edit, restart — otherwise the log
stops matching reality.

These files are committed empty. They fill up as work proceeds. If a manifest contains
real data, treat it as the source of truth over anything in a conversation.

# Butterlu

Monorepo for **Butterlu Gifts** — a personalised picture-frame and keepsake-gift business
running on Shopify (`www.butterlu.com`) and Etsy (`shop/ButterLu`).

## Start here

**[`CLAUDE.md`](./CLAUDE.md)** — the operating guide. Read it before doing anything. It
carries the verified ground truth, hard constraints, gate status and conventions, so a
fresh session needs no prior context.

## Current state

| | Etsy | butterlu.com |
|---|---|---|
| Reviews | **13,635** (4.9★, Star Seller) | 0 |
| Sales | **75,903** | **0, all time** |
| Products | 635 listings | 243 (99 live) |

The successful business is on Etsy. The website is a broken photocopy of it — checkout was
disabled at the plan level (now on "Basic", live as of 2026-10-10), and it has never taken an order. Closing that gap is what this
repo is for.

## Layout

```
├── CLAUDE.md      # operating guide — read first
├── docs/          # analysis and technical design
│   ├── 01-diagnostic-findings.md      # 14 findings, severity × effort
│   ├── 02-pdp-audit.md                # product page content audit
│   ├── 03-competitor-serp.md          # who outranks us and why
│   ├── 04-review-pipeline-design.md   # Etsy → Shopify migration + sync
│   ├── 05-execution-plan.md           # dependency graph + 8 resumable loops
│   ├── 06-etsy-tos-constraints.md     # what the Etsy API Terms permit
│   └── 07-cloudflare-stripe-stack.md  # should the .com leave Shopify for Cloudflare + Stripe
├── plans/         # manifests — loops read work lists and checkpoint here
├── prompts/       # runnable session prompts
├── site/          # Cloudflare storefront skeleton; per-PR previews (see site/README.md)
└── .env.example   # required environment variables (no secrets)
```

### Planned packages

- **`theme/`** — the Shopify theme. Note the Shopify MCP connector cannot write to a
  *published* theme; work on a duplicate and publish by hand.
- **`extension/`** — Chrome extension.
- **`workers/`** — Cloudflare Workers. The review sync Worker is designed in `docs/04`.
  The Cloudflare account in use already hosts `fourfold*` and `rps-worker`, so name new
  workers distinctly (e.g. `butterlu-reviews`).

## Next action

Run **`prompts/wave-0-kickoff.md`**. It is read-only apart from a single-product write
test — and that test answers the question every later step assumes: whether the paused
Shopify plan permits Admin API writes at all. It also produces the duplicate-cluster
report needed to unblock gate G2.

## Provenance

This analysis originated in `southouterspace/build` (PR #9) and was moved here intact.
Nothing in it imported from that repository.

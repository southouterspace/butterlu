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

## Repo layout

Bun workspaces (`apps/*`, `packages/*`), one root `bun.lock`, `bun install` at the root.

- `apps/site/` is the butterlu.com storefront (Astro + Worker), the walking skeleton from `docs/07`.
- `apps/frame-mcp/` is the MCP server that renders sublimation print files for the frames. In progress.
- `packages/frame/` is the shared frame geometry, safe zones and text fitting. The MCP server uses it now and the site's editor will later.
- `assets/`, `docs/`, `plans/`, `prompts/` and `scripts/` stay at the root. They are business data and research, not workspaces.

A new tool goes in `apps/<name>`. Shared code goes in `packages/<name>`. Each workspace has its own `validate` script, and root `bun run validate` runs all of them, so the push gate covers a workspace the day it exists.

There is no Turborepo or Nx. Two apps and one package do not need a task cache, and `bun run --filter` already fans out. Revisit if validate time becomes the bottleneck. Bun's `catalog` is also skipped: only one workspace has dependencies so far, so there is no shared version to centralize.

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
├── apps/site/     # Cloudflare storefront skeleton; previews, stage, release (see apps/site/README.md)
├── packages/      # shared workspace packages (see Repo layout)
├── TODO.md        # open setup items and first runs for apps/site
└── .env.example   # required environment variables (no secrets)
```

### Planned packages

- **`theme/`** — the Shopify theme. Note the Shopify MCP connector cannot write to a
  *published* theme; work on a duplicate and publish by hand.
- **`extension/`** — Chrome extension.
- **`workers/`** — Cloudflare Workers. The review sync Worker is designed in `docs/04`.
  Everything Butterlu runs on Cloudflare lives in its own Cloudflare account, shared
  with no other project. See `apps/site/README.md`, one-time setup.

## Next action

Run **`prompts/wave-0-kickoff.md`**. It is read-only apart from a single-product write
test — and that test answers the question every later step assumes: whether the paused
Shopify plan permits Admin API writes at all. It also produces the duplicate-cluster
report needed to unblock gate G2.

## Provenance

This analysis originated in `southouterspace/build` (PR #9) and was moved here intact.
Nothing in it imported from that repository.

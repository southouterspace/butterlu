---
name: verify
description: Prove a change to the butterlu.com site (site/) works before calling it done. Covers the local build and dist lint, the e2e suite against wrangler dev, driving the live site over the e2e MCP server, and reading the per-PR Cloudflare Preview and its e2e results. Use after any change under site/ or .github/, before opening or updating a PR, and when a PR's site check is red.
---

# Verify a site change

The site is Astro (static HTML) plus one Worker for `/api/*`, deployed to
Cloudflare. Every pull request gets a Preview URL and an e2e run against it.
Prove a change on the real artifact, in this order, and stop at the first
failure.

## 1. Build and lint

```bash
cd site
npm run build          # astro check, astro build, scripts/lint-dist.mjs
npm run check:worker   # tsc over worker/
```

`lint-dist` reads the HTML in `dist/` that a crawler receives: one `<title>` of
at most 60 characters, one meta description, one canonical, `<html lang>`. A
new SEO rule belongs in its `rules` table, not in a reviewer's memory.

## 2. e2e against the local Worker

```bash
npx e2e run                        # whole suite; starts wrangler dev on 127.0.0.1:8787
npx e2e run tests/smoke.e2e.ts     # one file
```

`wrangler dev` serves `dist/`, so build first. Tests live in
`tests/*.e2e.ts`. A failed test names its trace page,
`.e2e/results/<test>/trace.md`. Read it before changing anything.

Agent steps (`agent.act`, `agent.assert`) need `ANTHROPIC_API_KEY`; without it
`tests/agentic.e2e.ts` skips. Pair every agent step with an exact `expect`.
Run `npx e2e guide writing-tests` (or `agent`, `debugging`, `running`) for the
framework's own reference.

Every new user-visible behavior gets a test in `tests/`. Before you keep it,
break the behavior and watch the test fail.

## 3. Look at it

The `e2e` MCP server in `.mcp.json` drives the same site the suite does.
`open_session`, then `call {tool: "observe"}` for the accessible tree,
`call {tool: "screenshot"}` for pixels, and `call {tool: "locate"}` to check a
locator before writing it into a test. Close the session when done.

## 4. The Preview

Pushing to a PR runs `.github/workflows/site.yml`:

| Job | Does |
| --- | --- |
| `check` | Steps 1 and 2 above in CI |
| `preview` | `wrangler preview --name pr-<number>`, waits for `/api/health`, runs the e2e suite against the Preview URL, and edits one PR comment marked `butterlu-preview` with the URL and the e2e outcome |
| `cleanup` | Deletes the Preview when the PR closes |

The Preview URL stays the same for the life of the PR. Read it from that
comment or the job summary with the GitHub MCP tools.
The cloud sandbox may not reach `*.workers.dev`. If a request to it gets a
proxy 502, rely on the CI e2e results and say so; do not report the
Preview as checked.

A red `preview` job that says to set `CLOUDFLARE_API_TOKEN` is a missing
repository secret. Only a human can fix it. Report it once; do not try to work
around it.

## Never

- Deploy from a session. Production deploys only from a merge to `main`
  (`.github/workflows/deploy.yml`).
- Skip, disable, or loosen a test or a lint rule to get green.
- Report a change as verified on the strength of a build alone.

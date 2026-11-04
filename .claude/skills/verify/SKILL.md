---
name: verify
description: Prove a change to the butterlu.com site (apps/site/) works. Covers the local build and dist lint, the e2e suite against wrangler dev, driving the site over the e2e MCP server, the push gate and the automatic stage deploy after a push to main. Use after any change under apps/ or packages/, before pushing to main, and when a push is blocked.
---

# Verify a site change

The site is Astro (static HTML) plus one Worker for `/api/*`, on Cloudflare.
Every push to `main` that changes the site deploys stage and runs e2e against it.
Prove a change on the real artifact, in this order, and stop at the first
failure.

## 1. Build and lint

```bash
cd apps/site
bun run build          # astro check, astro build, scripts/lint-dist.mjs
bun run check:worker   # tsc over worker/
```

`lint-dist` reads the HTML in `dist/` that a crawler receives: one `<title>` of
at most 60 characters, one meta description, one canonical, `<html lang>`. A
new SEO rule belongs in its `rules` table, not in a reviewer's memory.

## 2. e2e against the local Worker

```bash
bunx e2e run                        # whole suite; starts wrangler dev on 127.0.0.1:8787
bunx e2e run tests/smoke.e2e.ts     # one file
```

`wrangler dev` serves `dist/`, so build first. Tests live in
`tests/*.e2e.ts`. A failed test names its trace page,
`.e2e/results/<test>/trace.md`. Read it before changing anything.

Agent steps (`agent.act`, `agent.assert`) need `ANTHROPIC_API_KEY`; without it
`tests/agentic.e2e.ts` skips. Pair every agent step with an exact `expect`.

### Agent steps without `ANTHROPIC_API_KEY`: run them with subagents

When the key is unset, run each test in `tests/agentic.e2e.ts` by hand with
subagents against stage (section 4), after its fixed e2e passes.

1. The e2e MCP server starts without `E2E_BASE_URL`, so point it at stage
   with a scratch config. `.e2e/` is gitignored. Write it with Write, not a
   heredoc. Save it as `apps/site/.e2e/preview.config.ts`:

   ```ts
   import type { E2EConfig } from 'e2e';
   import { web } from '@e2e-dev/web';
   export default {
     targets: [{ engine: web(), app: { url: '<stage url>', identity: 'butterlu-site', environment: 'staging' } }],
   } satisfies E2EConfig;
   ```

2. For each test, spawn two subagents in parallel, each with its own session:
   `open_session` with config `apps/site/.e2e/preview.config.ts`. Give each one the
   test's steps and the exact `agent.act` or `agent.assert` text, and have it
   judge only what is on screen, not the source. Use `observe` and
   `screenshot`, and close the session whether the test passes or fails. One
   is a standard QA agent; the other defaults to FAIL unless the evidence is
   plainly visible and judges from the screenshot first. Each replies
   `VERDICT`, `EVIDENCE` (the exact on-screen text), `NOTES`.
3. A test passes only if both subagents return PASS. Report each verdict
   and its evidence next to the stage e2e result. The runner still
   reports the test as skipped; do not change the test's `skip` to hide that.
Run `bunx e2e guide writing-tests` (or `agent`, `debugging`, `running`) for the
framework's own reference.

Every new user-visible behavior gets a test in `tests/`. Before you keep it,
break the behavior and watch the test fail.

## 3. Look at it

The `e2e` MCP server in `.mcp.json` drives the same site the suite does.
`open_session`, then `call {tool: "observe"}` for the accessible tree,
`call {tool: "screenshot"}` for pixels, and `call {tool: "locate"}` to check a
locator before writing it into a test. Close the session when done.

## 4. Push to main: the gate and stage

Work goes straight to `main` in small commits; there are no PRs (CLAUDE.md 6a).
Checks run in your session; the stage deploy runs in GitHub Actions. `git push`
triggers `.claude/hooks/site-gate.sh`.
Before the push, when it changes `apps/`, `packages/` or the root workspace files, it runs
`bun run validate` at the repo root (every workspace) and blocks the push on failure with the failing output.

After a push to `main` lands, GitHub Actions (`.github/workflows/stage.yml`)
runs `bun run deploy:stage`: validate, deploy the `butterlu-site-stage` Worker,
wait for `/api/health`, run the e2e suite against the stage URL. Its log ends
with a `deploy-summary` line with `url`, `commit`, `health` and `e2e`, and the
e2e traces are the run's `e2e-stage` artifact. Follow it with
`gh run list --workflow stage.yml --limit 1` and `gh run view <id> --log`.
(A push of any other branch runs `deploy:preview` from the session hook, only
where the session has `CLOUDFLARE_API_TOKEN`.)

- Report the URL and the e2e result to the owner. The owner reviews UX on stage.
- A red run with `e2e: failed` means the change is not done. Read the traces
  in the run's artifact, fix, push again.
- A run that stops at `deploy-setup-blocked: CLOUDFLARE_API_TOKEN is not set`
  means the `CLOUDFLARE_STAGE_API_TOKEN` secret is missing. Report it once.
  Only the owner can add it.

## 5. Stage and production

| Environment | Worker | Deployed by |
| --- | --- | --- |
| Stage | `butterlu-site-stage` | `.github/workflows/stage.yml` after every push to `main` that changes the site (or `bun run deploy:stage` from `apps/site` on a clean `main` equal to `origin/main`, where a session has a token) |
| Preview, per branch (rare) | `butterlu-site-stage` Previews | The push hook, for a branch push |
| Production | `butterlu-site` | `.github/workflows/release.yml`, when the owner publishes a GitHub Release |

`deploy:stage` (from `apps/site`) runs `bun run validate`, deploys, then runs e2e against the
stage URL. If a branch Preview was made, delete it once the work is on `main`:
`bunx wrangler preview delete --name <preview name> --skip-confirmation`.

## Never

- Run `wrangler deploy`, `wrangler preview`, `wrangler versions` or
  `wrangler rollback` directly. The hook blocks them; use the `deploy:*` scripts.
  The hook matches the text anywhere in a Bash command, so write docs that
  mention those commands with Write or Edit, not a heredoc.
- Deploy production. It ships only from a published release.
- Skip, disable, or loosen a test or a lint rule to get green.
- Report a change as verified on the strength of a build alone.

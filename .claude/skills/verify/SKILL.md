---
name: verify
description: Prove a change to the butterlu.com site (site/) works. Covers the local build and dist lint, the e2e suite against wrangler dev, driving the site over the e2e MCP server, the push gate and automatic per-branch Cloudflare Preview, and deploying stage. Use after any change under site/, before opening or updating a PR, when a push is blocked, and after a merge to main.
---

# Verify a site change

The site is Astro (static HTML) plus one Worker for `/api/*`, on Cloudflare.
Every pushed branch gets a Preview URL and an e2e run against it.
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

### Agent steps without `ANTHROPIC_API_KEY`: run them with subagents

When the key is unset, run each test in `tests/agentic.e2e.ts` by hand with
subagents against the branch's Preview (section 4), after its fixed e2e passes.

1. The e2e MCP server starts without `E2E_BASE_URL`, so point it at the Preview
   with a scratch config. `.e2e/` is gitignored. Write it with Write, not a
   heredoc. Save it as `site/.e2e/preview.config.ts`:

   ```ts
   import type { E2EConfig } from 'e2e';
   import { web } from '@e2e-dev/web';
   export default {
     targets: [{ engine: web(), app: { url: '<Preview url>', identity: 'butterlu-site', environment: 'staging' } }],
   } satisfies E2EConfig;
   ```

2. For each test, spawn two subagents in parallel, each with its own session:
   `open_session` with config `site/.e2e/preview.config.ts`. Give each one the
   test's steps and the exact `agent.act` or `agent.assert` text, and have it
   judge only what is on screen, not the source. Use `observe` and
   `screenshot`, and close the session whether the test passes or fails. One
   is a standard QA agent; the other defaults to FAIL unless the evidence is
   plainly visible and judges from the screenshot first. Each replies
   `VERDICT`, `EVIDENCE` (the exact on-screen text), `NOTES`.
3. A test passes only if both subagents return PASS. Report each verdict
   and its evidence next to the Preview's e2e result. The runner still
   reports the test as skipped; do not change the test's `skip` to hide that.
Run `npx e2e guide writing-tests` (or `agent`, `debugging`, `running`) for the
framework's own reference.

Every new user-visible behavior gets a test in `tests/`. Before you keep it,
break the behavior and watch the test fail.

## 3. Look at it

The `e2e` MCP server in `.mcp.json` drives the same site the suite does.
`open_session`, then `call {tool: "observe"}` for the accessible tree,
`call {tool: "screenshot"}` for pixels, and `call {tool: "locate"}` to check a
locator before writing it into a test. Close the session when done.

## 4. Push: the gate and the Preview

CI runs in your session. `git push` triggers `.claude/hooks/site-gate.sh`.
Before the push, when the branch changes `site/` or `.nvmrc`, it runs
`npm run validate` and blocks the push on failure with the failing output.

After the push lands, the hook runs `npm run deploy:preview`: build, deploy a
Preview named after the branch on the `butterlu-site-stage` Worker, wait for
`/api/health`, run the e2e suite against the Preview URL. The result comes back
as a `deploy-summary` line with `url`, `commit`, `health` and `e2e`.

- Post the URL and the e2e result on the branch's PR as one comment, and edit
  that comment on later pushes. The owner reviews UX on that URL.
- `e2e: failed` means the change is not done. Read
  `site/.e2e/results/<test>/trace.md`, fix, push again.
- `health: unreachable` means the sandbox got no HTTP response from
  `*.workers.dev`. Say the Preview was not e2e-tested from here.
- No Preview because `CLOUDFLARE_API_TOKEN` is unset: report it once. Only
  the owner can add it.

## 5. Stage and production

| Environment | Worker | Deployed by |
| --- | --- | --- |
| Preview, per branch | `butterlu-site-stage` Previews | The push hook |
| Stage | `butterlu-site-stage` | `npm run deploy:stage` from a clean `main` equal to `origin/main` |
| Production | `butterlu-site` | `.github/workflows/release.yml`, when the owner publishes a GitHub Release |

`deploy:stage` runs `npm run validate`, deploys, then runs e2e against the
stage URL. After a branch merges, delete its Preview:
`npx wrangler preview delete --name <preview name> --skip-confirmation`.

## Never

- Run `wrangler deploy`, `wrangler preview`, `wrangler versions` or
  `wrangler rollback` directly. The hook blocks them; use the `deploy:*` scripts.
  The hook matches the text anywhere in a Bash command, so write docs that
  mention those commands with Write or Edit, not a heredoc.
- Deploy production. It ships only from a published release.
- Skip, disable, or loosen a test or a lint rule to get green.
- Report a change as verified on the strength of a build alone.

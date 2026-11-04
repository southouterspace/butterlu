# site

The butterlu.com storefront from `docs/07`: Astro as a static generator, one
Worker for `/api/*`, served from Cloudflare. This is the walking skeleton. It
exists so every branch gets a Preview URL, stage tracks `main`, and production
ships only from a release, before any store feature lands.

| Path | What |
| --- | --- |
| `src/` | Astro pages. Every public page is prerendered into `dist/`. |
| `worker/index.ts` | The Worker. `/api/*` runs here; everything else is a static asset. |
| `wrangler.jsonc` | Top level is the stage Worker and its Previews. `env.production` is the production Worker. |
| `scripts/deploy.mjs` | The only deploy path. One table entry per environment, each with its precondition. |
| `scripts/lint-dist.mjs` | Checks the built HTML: title length, description, canonical, `lang`. |
| `e2e.config.ts`, `tests/` | The [e2e](https://github.com/tester-army/e2e) suite. Runs against `wrangler dev`, or a deployed URL when `E2E_BASE_URL` is set. |

## Environments

| Environment | Worker | Deployed by | Trigger |
| --- | --- | --- | --- |
| Preview, one per branch | `butterlu-site-stage` (Previews) | Agent session | Every `git push` of a branch that changes `apps/site/` or `packages/` |
| Stage | `butterlu-site-stage` | `.github/workflows/stage.yml` | Every push to `main` (or `bun run deploy:stage` on a clean, up-to-date `main` where a session has a token) |
| Production | `butterlu-site` | `.github/workflows/release.yml` | A human publishes a GitHub Release whose commit is on `main` |

Every deploy builds and checks first (`build` for a Preview, the full
`validate` for stage and production), waits for `/api/health`, runs the e2e
suite against the deployed URL, and prints one `deploy-summary` JSON line.

Production is meant to be out of an agent's reach in three layers. The
production token exists only as a GitHub environment secret, and the agent's
token cannot touch the production Worker. `deploy.mjs` refuses production
outside a release workflow. The session hook blocks direct `wrangler` deploys.
Only the first layer is a real boundary; the other two are early, clear errors
that a determined command can get around. **The first layer does not exist
until step 4 of the one-time setup is done.** Until step 3, nothing deploys at all.

## Checks in the session, deploys in GitHub Actions

`.claude/hooks/site-gate.sh` runs on every Bash call in a Claude Code session:

- Before `git push`, when the branch changes `apps/`, `packages/` or the root workspace files, it runs
  `bun run validate` at the repo root (every workspace) and blocks the push if it fails.
- After a push to `main`, it points the agent at the stage run in GitHub Actions.
- After a push of any other branch, it runs `bun run deploy:preview` when the
  session has a token, and hands the URL and e2e result back to the agent.
- It blocks `wrangler deploy`, `preview`, `versions`, `rollback`, `delete` and
  `secret`, so deploys go through `deploy.mjs`. `wrangler preview delete` stays allowed.

GitHub Actions runs `stage.yml` on every push to `main` that changes the site (stage-only token) and
`release.yml` once per release (production token).

## Commands

Bun (`packageManager` in `package.json`) installs packages and runs scripts;
Node 24 (`/.nvmrc`) runs the code, because the e2e runner needs Node. From `apps/site/` (or the repo root, where `bun install` covers every workspace):

```bash
bun install
bun run build             # astro check + build + lint-dist
bun run check:worker
bun run test:e2e          # serves dist/ through wrangler dev and runs tests/
bun run validate          # all of the above
bun run deploy:preview    # this branch's Preview, then e2e against it
bun run deploy:stage      # main only
```

## One-time setup (a human)

Butterlu shares nothing with any other project: not a Cloudflare account, not
a `workers.dev` subdomain, not a token, not a Claude environment. Until step 3
is done, `deploy.mjs` refuses every deploy.

1. **Cloudflare account.** Done: account Butterlu, `workers.dev` subdomain
   `butterlu`, so URLs read `<name>.butterlu.workers.dev`.
2. **Workers.** Done: `butterlu-site-stage` and `butterlu-site` exist with
   placeholder code that answers 503. The first Preview and the first release
   replace it.
3. **Pin the account.** Done: `apps/site/wrangler.jsonc` pins the Butterlu account,
   `5fa9365455451e1db238dedb838fc9ff`. `deploy.mjs` refuses any
   `CLOUDFLARE_ACCOUNT_ID` that differs from it.
4. **Claude environment and agent token.** Set: a Claude environment holds
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Create a Claude cloud environment
   used only for this repo. In the Butterlu account, Manage Account, Account API
   Tokens, create a token scoped to **Specified Workers: `butterlu-site-stage`**,
   role **Editor**. Put it in that environment as `CLOUDFLARE_API_TOKEN`, with
   `CLOUDFLARE_ACCOUNT_ID`. Never reuse the environment that holds another
   project's Cloudflare token.

   4a. **Stage token for GitHub Actions.** Create one more token with the same
   scope (**Specified Workers: `butterlu-site-stage`**, role **Editor**). In
   GitHub, Settings, Environments, create `stage`, limit its deployment
   branches to `main`, and add the token as the *environment* secret
   `CLOUDFLARE_STAGE_API_TOKEN`, never a repository secret. Every push to `main`
   runs repo code with this token, so it must not be able to touch
   `butterlu-site`. Never use an account-wide Workers token here.
5. **Production token.** In the Butterlu account, create a second token scoped
   to **Specified Workers: `butterlu-site`**, role **Editor**. In GitHub, Settings, Environments, create
   `production` and add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as
   *environment* secrets, not repository secrets. A release runs the workflow
   file from its own tag, so restrict who can make one: add a tag ruleset on
   `v*` that only you can bypass, and limit the environment's deployment refs
   to `v*` tags.
6. **pstack in every cloud session.** Cloud sessions ignore plugins a repo
   enables in `.claude/settings.json`. Put this in the setup script of every
   Claude cloud environment, so it is baked into the cached image:

   ```bash
   claude plugin install pstack --marketplace michael-denyer/pstack-claude --scope user
   ```

   This repo's SessionStart hook installs it too when it is missing, but a
   session that installs it there only loads it on the next start or after
   `/reload-plugins`.
7. **Optional.** Add `ANTHROPIC_API_KEY` to the Claude environment and to the
   `stage` and `production` environments to run the agent steps in
   `tests/agentic.e2e.ts`.

## Releasing

Publish a GitHub Release with a new tag (for example `v0.1.0`) on a `main`
commit. `release.yml` checks the commit is on `main`, validates, deploys
`butterlu-site`, and runs e2e against it. A prerelease deploys nothing.

A production e2e failure fails the run after the deploy is live; nothing
rolls back by itself. Roll back by publishing a release on the previous good
commit, or with `bunx wrangler rollback --env production` from your own machine.

# To do: site environments and agent setup

What is left before agents can build, preview and stage the site without a
human, and before the first production release. The design is in
`apps/site/README.md`. Tick items here as they land.

Butterlu Cloudflare account: `5fa9365455451e1db238dedb838fc9ff`
(`workers.dev` subdomain `butterlu`). Workers `butterlu-site-stage` and
`butterlu-site` exist with placeholder code.

## Owner: secrets and settings no agent can reach

The Cloudflare connector cannot manage API tokens (error 9109), and no agent
tool can write Claude environment variables, GitHub secrets or rulesets.

- [ ] **Agent token.** At
  https://dash.cloudflare.com/5fa9365455451e1db238dedb838fc9ff/api-tokens create
  a custom token `butterlu-agent-stage`: Workers, Editor, Specified Workers
  `butterlu-site-stage`.
- [ ] **Production token.** Same page: `butterlu-release-production`: Workers,
  Editor, Specified Workers `butterlu-site`.
- [ ] **Claude environment for this repo only.** From the environment menu at
  https://claude.ai/code:
  - `CLOUDFLARE_API_TOKEN` = the agent token
  - `CLOUDFLARE_ACCOUNT_ID` = `5fa9365455451e1db238dedb838fc9ff`
  - Optional: `ANTHROPIC_API_KEY`, to run `apps/site/tests/agentic.e2e.ts`
  - Setup script:
    `claude plugin install pstack --marketplace michael-denyer/pstack-claude --scope user`
- [ ] **Stop using the shared environment for Butterlu.** The environment used
  so far holds an account-wide token for the shared account that hosts Quote
  Goat. `deploy.mjs` refuses it, but a session there could still act on that
  account by other means.
- [ ] **GitHub `production` environment.** At
  https://github.com/southouterspace/butterlu/settings/environments/new create
  `production` with environment secrets `CLOUDFLARE_API_TOKEN` (the production
  token) and `CLOUDFLARE_ACCOUNT_ID` (`5fa9365455451e1db238dedb838fc9ff`). Limit
  deployment refs to tags matching `v*`. Optional: `ANTHROPIC_API_KEY`.
- [ ] **Tag ruleset.** At
  https://github.com/southouterspace/butterlu/settings/rules/new?target=tag
  target `v*`, with only you on the bypass list. A release runs the workflow
  file from its own tag, so whoever can create tags controls production.
- [ ] **Quote Goat links.** The shared account's subdomain changed from
  `quote-goat` to `southouterspace`. Anything that links to
  `*.quote-goat.workers.dev` is broken until updated.

## Owner: decisions

- [ ] **May agents merge their own PRs?** Agents working without approval needs
  it. Proposed rule: an agent may merge when the push gate and the Preview e2e
  passed on the PR head and a fresh reviewer agent found nothing blocking, then
  runs `bun run deploy:stage`. An agent could not write this into `CLAUDE.md`;
  the session's safety check blocked it as agents granting themselves
  authority. Add it to `CLAUDE.md` §6a and `.claude/skills/verify/SKILL.md` if
  you want it.
- [ ] **Merge `claude/agentic-sdlc-preview-setup-e9i4d2`.** No PR is open yet.

## Agent: first runs, after the owner items

None of these has run against the Butterlu account yet.

- [x] **First Preview.** Done 2026-10-11 from branch `claude/first-preview`
  (commit `6b5cfcf`): `health: ok`, `e2e: passed` on
  https://claude-first-preview-butterlu-site-stage.butterlu.workers.dev. The
  environment's token can create Previews.
- [x] **First stage deploy.** Done 2026-10-12 from `main` at `2ca6bd7` (with
  npm, before the switch to Bun): `health: ok`, `e2e: passed` on
  https://butterlu-site-stage.butterlu.workers.dev.
- [ ] **First release.** The owner publishes `v0.1.0` on `main`. Check that
  `release.yml` passes and https://butterlu-site.butterlu.workers.dev serves
  the site. The workflow has never run.

## Print files and Etsy fulfilment

The frame MCP server (`apps/frame-mcp`) was removed on 2026-11-11 at the
owner's request; it is in git history. The print PDF renderer stays in
`packages/frame` (`@butterlu/frame/pdf`), and the Etsy chart mapping is in
`assets/etsy-color-chart/chart-to-background.json`.

Owner (from Asli), still needed for print files:

- [ ] **Background files for the 20 unmatched chart colours**: #4, 5, 6, 8, 11,
  14, 16, 20, 23, 26–28, 30, 32–36, 38, 40. Same 8.5 × 11 in, 300 dpi sheets as
  `assets/background-images/`. Then add each to `MATCHES` in
  `scripts/etsy-color-chart.mjs` and rerun it.
- [ ] **Confirm chart #31 → whitewashed-wood and #41 → gray-shiplap.** Marked
  `likely` until then.
- [ ] **Font list and font files**, licensed for embedding. Three open fonts
  stand in (`packages/frame/src/fonts.json`, `placeholder: true`).
- [ ] **Safe zones measured on a real blank.** Current insets (0.35 in from the
  cut edge on both shapes, set by the scalloped edge, and 0.125 in from the
  opening) come from the drawing.
- [x] **`butterlu-frame-mcp-stage` Worker deleted** on Cloudflare (2026-11-11;
  it was a 503 placeholder with no secrets).
- [ ] **Owner cleanup, optional:** drop `butterlu-frame-mcp-stage` from the
  stage token's Specified Workers if it was added, and delete the
  `FRAME_MCP_TOKEN` GitHub secret if it was ever set.

## Known limits

- The session hook matches deploy commands anywhere in a Bash command, so a
  heredoc that mentions them is blocked. Write such docs with Write or Edit.
- The push gate checks the tree before the whole command runs, so
  `git commit … && git push` in one command is blocked. Commit, then push.
- A session whose SessionStart hook installs pstack loads it only on the next
  start or after `/reload-plugins`. The setup-script line above avoids this.

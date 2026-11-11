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

## Frame MCP: Etsy order fulfilment (`apps/frame-mcp`)

`plan_order` reads an Etsy order's Color and Personalization into a layout and
lists every reason it needs review; `render_frame` makes the mirrored print PDF.
Most real orders still go to review until the owner inputs below land.

Owner (from Asli):

- [ ] **Background files for the 20 unmatched chart colours**: #4, 5, 6, 8, 11,
  14, 16, 20, 23, 26–28, 30, 32–36, 38, 40. Same 8.5 × 11 in, 300 dpi sheets as
  `assets/background-images/`. Then add each to `MATCHES` in
  `apps/frame-mcp/scripts/etsy-color-chart.mjs` and rerun it.
- [ ] **Confirm chart #31 → whitewashed-wood and #41 → gray-shiplap.** Marked
  `likely` until then, so orders on them go to review.
- [ ] **Font list and font files**, licensed for embedding. Three open fonts
  stand in (`apps/frame-mcp/src/fonts.json`, `placeholder: true`).
- [ ] **Layouts for "As Shown" orders**: for the top-selling listings, the
  background and which side holds which line. Becomes a per-listing preset.
- [ ] **Text colour by chart number**: when a buyer writes "(color #2)", does it
  print in that colour or in black? `plan_order` uses the swatch colour today.
- [ ] **Safe zones measured on a real blank.** Current insets (0.35 in from the
  cut edge on both shapes, set by the scalloped edge, and 0.125 in from the
  opening) come from the drawing.

Owner setup (details in `apps/frame-mcp/README.md`, Google Drive and Deploy):

- [x] **Auth for the MCP server.** Bearer `MCP_TOKEN`, fail-closed.
- [ ] **Stage token covers the MCP.** Edit the GitHub `stage` environment's
  `CLOUDFLARE_STAGE_API_TOKEN` to list Specified Workers `butterlu-site-stage`
  and `butterlu-frame-mcp-stage` (the Worker exists, as a placeholder).
- [ ] **Google Drive.** Google Cloud project with the Drive API, consent screen
  published (In production) with only `drive.file`, a Desktop app OAuth client,
  then `node scripts/google-setup.mjs --env stage --client-file … --mcp-token`.
  Optional: the stage `MCP_TOKEN` as GitHub `stage` secret `FRAME_MCP_TOKEN`.
- [ ] **Workers Paid on the Butterlu account.** A render takes ~0.35 s CPU; Free
  allows 10 ms.
- [ ] **Production, when ready.** Make a placeholder `butterlu-frame-mcp` Worker,
  add it to the production token's Specified Workers, run `google-setup.mjs
  --env production`, share `Butterlu print files` with Asli, publish a Release.

Agent, no inputs needed:

- [ ] Render portrait ("Vertical frame") orders; the parser detects them, the
  renderer still lays out landscape.
- [ ] PNG preview of the proof for the chat and for review drafts.
- [ ] Packing-slip batch: parse the day's Etsy packing-slip PDF, plan and render
  every order, return the print files and the review list. Keep real slips out
  of the repo (buyer names and addresses).
- [ ] Measure Worker CPU per `render_frame` call before the first deploy.

## Known limits

- The session hook matches deploy commands anywhere in a Bash command, so a
  heredoc that mentions them is blocked. Write such docs with Write or Edit.
- The push gate checks the tree before the whole command runs, so
  `git commit … && git push` in one command is blocked. Commit, then push.
- A session whose SessionStart hook installs pstack loads it only on the next
  start or after `/reload-plugins`. The setup-script line above avoids this.

# To do: site environments and agent setup

What is left before agents can build, preview and stage the site without a
human, and before the first production release. The design is in
`site/README.md`. Tick items here as they land.

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
  - Optional: `ANTHROPIC_API_KEY`, to run `site/tests/agentic.e2e.ts`
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
  runs `npm run deploy:stage`. An agent could not write this into `CLAUDE.md`;
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
- [ ] **First stage deploy.** After the merge, from a clean `main`:
  `cd site && npm run deploy:stage`. Never run yet.
- [ ] **First release.** The owner publishes `v0.1.0` on `main`. Check that
  `release.yml` passes and https://butterlu-site.butterlu.workers.dev serves
  the site. The workflow has never run.

## Known limits

- The session hook matches deploy commands anywhere in a Bash command, so a
  heredoc that mentions them is blocked. Write such docs with Write or Edit.
- The push gate checks the tree before the whole command runs, so
  `git commit … && git push` in one command is blocked. Commit, then push.
- A session whose SessionStart hook installs pstack loads it only on the next
  start or after `/reload-plugins`. The setup-script line above avoids this.

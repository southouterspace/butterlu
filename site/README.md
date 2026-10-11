# site

The butterlu.com storefront from `docs/07`: Astro as a static generator, one
Worker for `/api/*`, served from Cloudflare. This is the walking skeleton. It
exists so every pull request gets a Preview URL and an e2e run before any
store feature lands.

| Path | What |
| --- | --- |
| `src/` | Astro pages. Every public page is prerendered into `dist/`. |
| `worker/index.ts` | The Worker. `/api/*` runs here; everything else is a static asset. |
| `wrangler.jsonc` | Worker `butterlu-site`, assets from `dist/`, trailing-slash handling for URL continuity. |
| `scripts/lint-dist.mjs` | Checks the built HTML: title length, description, canonical, `lang`. |
| `e2e.config.ts`, `tests/` | The [e2e](https://github.com/tester-army/e2e) suite. Runs against `wrangler dev`, or a deployed Preview when `E2E_BASE_URL` is set. |

## Commands

Node 24 (`/.nvmrc`). From `site/`:

```bash
npm install
npm run build        # astro check + build + lint-dist
npm run check:worker
npm run test:e2e     # serves dist/ through wrangler dev and runs tests/
npm run validate     # all of the above
```

## Previews and deploys

`.github/workflows/site.yml` builds and tests every pull request, then
creates a Cloudflare [Preview](https://developers.cloudflare.com/workers/previews/)
named `pr-<number>`, runs the e2e suite against it, and posts the URL as one
comment that updates on each push. The Preview is deleted when the PR closes.
`.github/workflows/deploy.yml` deploys to production on merge to `main`. That
updates the `workers.dev` host only; butterlu.com DNS still points at Shopify.

### One-time setup (a human)

1. Create a Cloudflare API token with **Workers Scripts: Edit** on the account.
2. Add repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. Optional: add `ANTHROPIC_API_KEY` to run the agent steps in `tests/agentic.e2e.ts`.
   Without it they skip and the deterministic tests still run.
4. Optional: in GitHub, give the `production` environment a required reviewer.

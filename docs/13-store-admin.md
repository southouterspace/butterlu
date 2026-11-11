# 13. Store admin for Asli

Status: BUILDING, 2026-11-11. Editor, drafts and Claude SEO are on stage; publishing waits on the catalog handover. Asked for by Justin (main chat, 2026-11-11): Asli gets a back
office shaped to her business where she defines the ready-made designs ("templates"),
files them under the store's categories, and gets Claude's help with SEO copy that she
approves. Each background's scale on a frame must be adjustable with proper controls.

## What she can do

1. **Templates.** One library of every ready-made design on the one frame. Each template
   has: name, shape, background and its scale and position, the words on each side
   (font, colour, rotation), wording ideas, who it's for, occasions, which category pages
   show it and in what order, whether it can be bought as shown in one tap, and a status
   (draft, live, hidden). A live preview draws the frame with the same code the store and
   the print file use, so what she sees is what prints.
2. **Categories.** Edit each category page's name, intro, FAQ and the order of its
   templates; edit the two shop-by lists (who it's for, occasion): labels, order and
   whether each shows in the menus. Adding a category adds a URL, so the build's existing
   taxonomy and SEO checks still run on every publish.
3. **SEO with Claude.** Every SEO field (category title and description, template image
   alt text, Shopping feed title and description, and the title and description of any
   design that keeps its own page) has a "Draft with Claude" button. Claude writes two or
   three options from the facts on the form, the store's voice rules and the length
   limits, and avoids titles already in use. She sees them with character counts and a
   search-result preview, picks or edits one and saves it. **Nothing Claude writes is
   used until she approves it**; publish refuses a field still marked as a suggestion.
4. **Background scale.** Built as its own task (thread "Adjustable background scale"),
   which owns the zoom controls, `packages/frame` and the print PDF. The admin stores each
   template's preset through `parseDesign`, so the scale field is kept as soon as the frame
   code knows it, and the editor gets the control then.
5. **Orders.** The existing order list stays, in the same admin.

## How it works

- **Drafts in D1, the published catalog in git.** Her edits save to the stage D1 database
  as drafts, so she can work in small steps. **Publish** checks the whole catalog with the
  same rules the build uses, then writes one file, `apps/site/src/catalog/store.json`, to
  `main` through the GitHub API. That push runs `stage.yml`: build, SEO lint, deploy,
  e2e. The site stays static and fast, every change has a history, and a bad publish is
  undone by reverting one commit.
- **Stage first, production stays Justin's call.** A publish lands on stage. It reaches
  butterlu.com only when Justin publishes a GitHub Release, as today. If they later want
  her publishes to go live directly, that is a one-line change to that rule, his decision.
- **Catalog handover.** Today the designs, categories and tags are code in `products.ts`,
  `taxonomy.ts` and `copy.json`, which the storefront session edits. The first step copies
  them into `store.json` unchanged (the build checks the site comes out identical) and
  those modules then read the file. After that, catalog content changes go through the
  admin; code still changes in code. **On hold** until the storefront session confirms,
  through the coordinator, which files the admin takes over. The hand-set "Best selling"
  rank the storefront is adding to Shop all moves over then as a field she can reorder.
- **Tables create themselves.** The admin Worker creates its D1 tables on first use
  (`CREATE TABLE IF NOT EXISTS`), so no one runs migrations by hand.
- **The admin UI** is Astro pages under `/admin` (noindex, outside the sitemap) that reuse
  the store's frame preview and pickers. The Worker signs a request in before serving
  any `/admin` page or `/api/admin/*` call.
- **Where it lives.** `src/catalog/doc.ts` (the catalog as one document, built from the
  live modules), `src/catalog/check.ts` (the rules), `worker/catalog-admin.ts` (the
  `/api/admin/*` API and the D1 drafts), `worker/seo-draft.ts` (Claude), and
  `src/pages/admin/catalog.astro` with `src/admin/app.ts` (the editor at `/admin/catalog`).
- **Label rule (Justin, 2026-11-11).** Store labels are always Title Case and use "&" for
  "and", as in "Baptisms & Christenings". `toLabel` in `check.ts` applies it; the editor
  fixes design names, category names and shop-by labels as she leaves a field, and the
  checks refuse a label off the rule.
- **SEO approval rule.** A field picked from Claude's options is saved with status
  `draft`; saving it again unchanged keeps it a draft, and only Approve (logged with her
  name) makes it `approved`. Text she types or edits counts as hers. A publish refuses any
  field still marked `draft`.

## Sign-in

WorkOS AuthKit with Google as the only way in, for the accounts in the `ADMIN_EMAILS`
Worker secret only (`worker/admin-auth.ts`). It covers everything under `/admin` and
`/api/admin`, the order list included. The signed-in email is recorded on each edit and
approval. The Worker trades the sign-in code with WorkOS (PKCE plus the API key), then
keeps its own signed, HttpOnly session cookie for a week; the list is checked on every
request, so removing an address signs that person out. Gmail addresses match whatever dots
or capitals are typed.

WorkOS: project "Butterlu", Staging environment, with the stage callback
`https://butterlu-site-stage.butterlu.workers.dev/admin/auth/callback` as its redirect URI,
Google turned on and password, magic link and passkey sign-in turned off. Staging uses
WorkOS's own Google credentials, so Google's screen shows WorkOS's name; production needs
a Butterlu Google client entered in WorkOS and a Production environment.

The repo is public, so the client ID, API key and addresses are Worker secrets, never in
code. Until all three are set, the older `ADMIN_PASSWORD` Basic sign-in stays in place;
once they are, the password is ignored. With sign-in half set up, `/admin` is a 404 rather
than falling back to the password.

## Owner steps (Justin)

1. Sign-in: on the `butterlu-site-stage` Worker, add three secrets: `WORKOS_CLIENT_ID`
   (the Butterlu Staging client ID), `WORKOS_API_KEY` (from WorkOS, Butterlu project,
   Staging, API Keys), and `ADMIN_EMAILS` (both Gmail addresses, comma separated). Optional
   fourth: `ADMIN_SESSION_SECRET`. Then `ADMIN_PASSWORD` can be deleted.
2. For Publish: a fine-grained GitHub token limited to `southouterspace/butterlu`,
   Contents read and write only, stored as the Worker secret `GITHUB_CATALOG_TOKEN`.
3. For Claude drafts: an Anthropic API key stored as the Worker secret `ANTHROPIC_API_KEY`.
   Usage is billed to that key; SEO drafts are a few cents a day at most.

Without 2 the admin still saves drafts and shows what a publish would change; without 3
the SEO fields are hand-written only.

## Build order (each step ships to stage on its own)

1. Done: admin shell, sign-in, D1 drafts.
2. Done: template library and editor with live preview.
3. Done: category and shop-by list editor.
4. Done: Claude SEO drafts with approval (switches on with `ANTHROPIC_API_KEY`).
5. Waiting: catalog handover into `store.json` (storefront session), with the Best
   selling rank.
6. Waiting on 5: Publish to git, with a diff of what will change.
7. Done: WorkOS sign-in with Google, for Justin and Asli only.
8. Done: background size and position on each design (reads the scale task's `backgroundFit`).

## Open questions

- Should anything besides SEO copy need a second person's approval before publish? Default:
  no, Justin's release is the gate to production.

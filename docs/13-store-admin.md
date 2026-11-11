# 13. Store admin for Asli

Status: PLAN, 2026-11-11. Asked for by Justin (main chat, 2026-11-11): Asli gets a back
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
4. **Background scale.** A zoom control (slider with minus, plus and reset, keyboard
   operable, read out as a percentage) and a position control for when it's zoomed. She
   sets a default scale per background and can override it per template. Shoppers get the
   same control in the customizer.
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
  admin; code still changes in code. Agreed with the storefront session before it lands.
- **Tables create themselves.** The admin Worker creates its D1 tables on first use
  (`CREATE TABLE IF NOT EXISTS`), so no one runs migrations by hand.
- **The admin UI** is Astro pages under `/admin` (noindex, outside the sitemap) that reuse
  the store's frame preview and pickers. The Worker signs a request in before serving
  any `/admin` page or `/api/admin/*` call.
- **Background scale in the design.** `FrameSpec` gains optional `backgroundScale` (1 to 3,
  where 1 is today's fill) and `backgroundOffset` (x and y, each -1 to 1, used only when
  zoomed). Both are optional, so existing orders, Stripe metadata and the frame MCP keep
  working. The print PDF, the SVG preview and the raster cards apply the same maths.
  Shrinking a pattern below 100% would need the file to tile without a seam; that waits
  on Asli saying which backgrounds are seamless tiles.

## Sign-in

Now: the existing `ADMIN_PASSWORD` Basic sign-in; the user name typed is recorded on each
edit and approval. Recommended next: Cloudflare Access on the stage Worker (it works on
`workers.dev`), allowing Asli's and Justin's emails, with the Worker checking the Access
token. That is a Cloudflare dashboard change, Justin's step.

## Owner steps (Justin)

1. Set `ADMIN_PASSWORD` on `butterlu-site-stage` if it isn't set.
2. For Publish: a fine-grained GitHub token limited to `southouterspace/butterlu`,
   Contents read and write only, stored as the Worker secret `GITHUB_CATALOG_TOKEN`.
3. For Claude drafts: an Anthropic API key stored as the Worker secret `ANTHROPIC_API_KEY`.
   Usage is billed to that key; SEO drafts are a few cents a day at most.
4. Optional: Cloudflare Access as above.

Without 2 the admin still saves drafts and shows what a publish would change; without 3
the SEO fields are hand-written only.

## Build order (each step ships to stage on its own)

1. Background scale in `packages/frame`, the previews and the print PDF, with tests.
2. Admin shell, sign-in, D1 tables, and the catalog handover into `store.json`.
3. Template library and editor with live preview.
4. Category and shop-by list editor.
5. Claude SEO drafts with approval.
6. Publish to git, with a diff of what will change.
7. Background scale control in the shopper's customizer (with the storefront session).

## Open questions

- Which backgrounds tile seamlessly (for scales below 100%)? Asli.
- Should anything besides SEO copy need a second person's approval before publish? Default:
  no, Justin's release is the gate to production.

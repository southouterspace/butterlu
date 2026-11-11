# @butterlu/frame-mcp

An MCP server on a Cloudflare Worker that turns a frame order into print files.
Claude calls it with a shape, a background and the text for each side. It saves a
print-ready PDF for the Epson SureColor F570 and a proof to the owner's Google
Drive, and returns their names and Drive links.

> **Every `/mcp` call needs `Authorization: Bearer <MCP_TOKEN>`.** `MCP_TOKEN` is a
> Worker secret only the owner sets. With no secret the Worker refuses every call,
> so a deploy that forgot it is closed, not open. The PDFs live only in Drive, so
> a link opens for whoever the folder is shared with, and for no one else.

Two Workers, one config (`wrangler.jsonc`): the top level is stage,
`butterlu-frame-mcp-stage`, deployed on every push to `main`; `env.production` is
`butterlu-frame-mcp`, deployed only when the owner publishes a GitHub Release.

The layout rules (frame geometry, safe zones, text fitting) live in
[`packages/frame`](../../packages/frame) (`@butterlu/frame`), so a future
browser editor uses the same rules as the print files.

## Tools

`list_options` takes no input. It returns:

- Each shape, with its size and the safe zone for each side, in inches from
  the frame's top-left corner.
- The 44 backgrounds, each with the text colour that shows up best on it.
- The fonts. Each font has `placeholder: true` until Asli's real fonts replace
  the stand-ins.
- The sides, the rotations and the text size limits.

`render_frame` takes a frame spec, plus an optional `label` for the file names:

```json
{
  "label": "Etsy 3412 Aunt Sarah",
  "shape": "scalloped",
  "backgroundId": "blue-toile",
  "sides": {
    "top": { "text": "Aunt Sarah", "fontId": "great-vibes" },
    "left": { "text": "EST. 2024", "fontId": "montserrat-semibold", "rotation": 90 },
    "bottom": { "text": "The best aunt in the world", "fontId": "playfair-display-bold", "color": "#7a1f3d", "maxPt": 36 }
  }
}
```

- Each side is optional, but give at least one.
- `rotation` is in degrees counterclockwise: 0, 90, -90 or 180. The defaults
  are 0 for top and bottom, 90 for left (reads upward) and -90 for right.
- `color` defaults to the background's text colour.
- `maxPt` defaults to 48.

The text on each side is scaled to the largest size, up to `maxPt`, that fits
the side's safe zone. The text is then centred on the zone. Fitting uses the
outline of the letters, not the line height, so script swashes stay inside the
zone.

The result is JSON with `printFile` and `proofFile` (each a Drive file name,
link and id), the page size, the fitted size of each side, and `warnings`. A side gets a `below-min-size` warning when its
text only fits at less than 14 pt, which is too small to read. Shorten the text
or choose a narrower font.

An unknown shape, background or font id gets an error that lists the valid ids.

`plan_site_order` takes the metadata of one butterlu.com order line, as Stripe
stores it on the line item's product (`frame_shape`, `frame_background`,
`frame_top` and the other sides). It returns the spec for `render_frame`, a
one-line summary, and anything to check, such as a stand-in font. The customer
built the design with the same rules this server prints with, so a site order
needs no guessing.

## Files

The print file is mirrored left to right for sublimation transfer. It has no
guides. The page is the frame plus 0.125 in of bleed on every side, and the
background covers the whole page.

The proof is not mirrored. It shows the cut line in red, the photo opening
masked in white, and each side's safe zone as a dashed blue box.

Both PDFs are saved to Google Drive, named by the shop's date (Central time)
and the label:

- `2026-11-04 Etsy 3412 Aunt Sarah - print.pdf` in the print folder.
- `PROOF 2026-11-04 Etsy 3412 Aunt Sarah - not for printing.pdf` in its
  `Proofs` folder.

Without a label the name uses the start of the render id. Storage sits behind
the small `RenderStore` interface in `src/storage.ts`, so another store (R2, for
customer photo uploads later) can be added without touching the tools.

## Google Drive

The Worker saves into the owner's own Drive with the owner's own one-time
sign-in, not a service account (a service account can't put files in a personal
Drive). The sign-in asks only for `drive.file`: the Worker sees and changes the
files and folders it made itself, nothing else in the Drive. The secrets:

| Secret | What |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | the owner's Google Cloud OAuth client ("Desktop app") |
| `GOOGLE_REFRESH_TOKEN` | the owner's sign-in |
| `DRIVE_FOLDER_ID` | the print folder, made by the setup script |
| `DRIVE_PROOF_FOLDER_ID` | its `Proofs` folder (optional: without it proofs go in the print folder) |

Stage and production each have their own folder: `Butterlu print files (stage)`
and `Butterlu print files`, so test renders never sit beside real orders.
`GET /health` (no token) says whether these are set, naming any that are
missing, never their values.

### One-time setup (the owner, on their own computer)

1. **Google Cloud project.** At console.cloud.google.com, make a project (for
   example "Butterlu print files"). In APIs & Services, Library, enable the
   **Google Drive API**.
2. **Consent screen.** In Google Auth Platform (APIs & Services, OAuth consent
   screen): user type **External**, app name "Butterlu print files", your email
   as support and developer contact. Under Data access, add only the scope
   `.../auth/drive.file`. Under Audience, press **Publish app** so its status is
   **In production**. Left in Testing, Google drops the sign-in after 7 days and
   uploads stop. `drive.file` needs no Google review. If the sign-in page still
   warns that the app isn't verified, choose Advanced, then go to the app.
3. **OAuth client.** In Clients, create one of type **Desktop app**, then
   download its JSON.
4. **Sign in and set the secrets.** From `apps/frame-mcp`, after
   `npx wrangler login` to the Butterlu account:

   ```sh
   node scripts/google-setup.mjs --env stage --client-file ~/Downloads/client_secret_XXXX.json --mcp-token
   ```

   Sign in with the Google account whose Drive should hold the files. The script
   makes the stage folder, sets every secret above on `butterlu-frame-mcp-stage`
   (and a new `MCP_TOKEN`, with `--mcp-token`, shown once), and prints the folder
   link. Run it again with `--env production` when production is ready. Rerunning
   reuses the folders.
5. **Share the folder** with whoever prints (Asli), as any Drive folder.

If Google ever answers `invalid_grant`, the sign-in was revoked or expired:
rerun step 4.

## Assets

The 44 backgrounds and the fonts ship inside the Worker as static assets.
`scripts/prepare-assets.mjs` copies them into `build/assets` (gitignored), and
`wrangler.jsonc` uploads that folder with every deploy. `run_worker_first` sends
every request to the Worker, so none of them is served to the public; the code
reads them through the `ASSETS` binding. No R2 bucket is needed.

## Run locally

You need Bun, Node 24, and poppler (`pdftocairo`, `pdfinfo`, `pdftoppm`) on
your `PATH`. The background colour script also needs ImageMagick.

```sh
bun install                    # from the repo root
cd apps/frame-mcp
bun run dev                    # serves http://localhost:8787/mcp
```

`bun run dev` prepares the assets and swaps Google Drive for a local stand-in
(`scripts/mock-google.mjs`), so renders work without a Google account; the links
it returns open while it runs.

To check the whole thing, run `bun run validate`. It runs these steps:

1. Typechecks this Worker.
2. Runs the unit tests (auth, Drive upload, token refresh, file names, order
   parsing).
3. Prepares the assets, starts the mock Google and `wrangler dev`, and calls
   `/health`, `tools/list`, `list_options`, `plan_order`, `render_frame` and
   `plan_site_order`. It checks both PDFs reached the right Drive folders with
   the right names and page size, that nothing but `/mcp` and `/health` is
   served, and that a missing or wrong token is refused. It writes `proof.png`
   to `--out` (default `$TMPDIR/frame-mcp-smoke`) so you can look at the proof.

## Deploy

`node scripts/deploy.mjs <stage|production>` is the only deploy path: it
validates, prepares the assets, deploys, waits for `/health`, and on stage,
when `FRAME_MCP_TOKEN` holds the stage `MCP_TOKEN` and Drive is set up, renders
one test frame (`scripts/remote-check.mjs`) and checks both PDFs reached Drive.

- **Stage**: `.github/workflows/frame-mcp-stage.yml`, on every push to `main`
  that touches this app, `packages/frame` or the backgrounds. It uses the
  `stage` environment's `CLOUDFLARE_STAGE_API_TOKEN`, whose scope must list the
  Specified Worker `butterlu-frame-mcp-stage` beside `butterlu-site-stage`
  (role Editor), and optionally `FRAME_MCP_TOKEN`.
- **Production**: the `frame-mcp` job in `.github/workflows/release.yml`, on a
  GitHub Release only the owner publishes. Its token must also list the
  Specified Worker `butterlu-frame-mcp`, and that Worker must exist first (a
  placeholder made in the dashboard is enough). No test render runs there.

A render takes about 0.35 s of CPU (measured locally), well over the Workers
Free plan's 10 ms per request, so the Butterlu account needs Workers Paid.

## Add a font

1. Add one row to `packages/frame/src/fonts.json` (the site's customizer reads the same list). Set `id`, `name`, `style`, `weight`,
   `licence` and `placeholder`. Set `source` to the path of the font file
   (TTF, OTF or WOFF) under `node_modules`.
2. Run `bun run prepare-assets` (any deploy and `bun run validate` do it too).
   It copies the file to `build/assets/fonts/<id>.woff`.

If a font is not an npm package, change `prepare-assets` to read its `source`
from the repo instead.

## Add a shape

1. Add the shape to `assets/frame-drawing.pdf` and to `shapes` in
   `plans/product-options.json`, with its id, `widthIn` and `heightIn`.
2. In `packages/frame/scripts/extract-geometry.mjs`, add one row to `SHAPES`.
   Set the index of the shape's outline path in the drawing's SVG (the opening
   is the next path) and the outline's top-left on the page in inches. Every
   shape shares `OUTER_INSET_IN`, the closest text may come to the cut edge, so
   one design's text fits any shape. Raise it if the new edge dips further in.
3. Run `bun run extract-geometry` in `packages/frame`. It regenerates
   `src/shapes.generated.ts`.

The safe zones come from this table, so you do not need to change any code.

## Authentication

`src/auth.ts` checks a bearer token on every `/mcp` request before any tool runs.

1. The easy way: `scripts/google-setup.mjs --mcp-token` makes one, sets it, and
   shows it once (Google Drive, step 4). Or generate a long random token (a
   password manager works) and set it from this directory with
   `npx wrangler secret put MCP_TOKEN --env=` for stage (`--env=production` for
   production), or in the dashboard under the Worker's Settings, Variables and
   Secrets.
2. Give the same token to the MCP client as an `Authorization: Bearer` header.
   For stage, also add it to the GitHub `stage` environment as `FRAME_MCP_TOKEN`
   so each stage deploy renders one test frame into the stage folder.

Locally, `bun run dev` needs it too: put `MCP_TOKEN=<anything>` in a `.dev.vars`
file here (the repo's `.gitignore` keeps it out of git). The
smoke test makes its own throwaway token.

## Not built yet

- A PNG preview of the proof for the chat.
- Listing presets.

# @butterlu/frame-mcp

An MCP server on a Cloudflare Worker that turns a frame order into print files.
Claude calls it with a shape, a background and the text for each side. It returns
a link to a print-ready PDF for the Epson SureColor F570 and a link to a proof.

> **Every `/mcp` call needs `Authorization: Bearer <MCP_TOKEN>`.** `MCP_TOKEN` is a
> Worker secret only the owner sets. With no secret the Worker refuses every call,
> so a deploy that forgot it is closed, not open. Rendered PDFs stay reachable by
> their random UUID link, without the token, so a proof link works in a chat.

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

`render_frame` takes a frame spec:

```json
{
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

The result is JSON with `printUrl`, `proofUrl`, the page size, the fitted size
of each side, and `warnings`. A side gets a `below-min-size` warning when its
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

Both PDFs are stored in the `RENDERS` bucket at `renders/<id>/{print,proof}.pdf`.
The Worker serves them at `GET /renders/<id>/{print,proof}.pdf`. Each id is a
random UUID.

## Run locally

You need Bun, Node 24, and poppler (`pdftocairo`, `pdfinfo`, `pdftoppm`) on
your `PATH`. The background colour script also needs ImageMagick.

```sh
bun install                    # from the repo root
cd apps/frame-mcp
bun run sync-assets            # puts backgrounds and fonts in local R2 (.wrangler/state)
bun run dev                    # serves http://localhost:8787/mcp
```

To check the whole thing, run `bun run validate`. It runs these steps:

1. Typechecks this Worker and `packages/frame`.
2. Runs the `packages/frame` tests. One test prints a frame, rasterizes it,
   and checks that the ink is centred on each safe zone.
3. Seeds a fresh local R2 and starts `wrangler dev`. It calls `tools/list`,
   `list_options` and `render_frame`. It then downloads both PDFs and checks
   their page size. It writes `proof.png` to `--out`, which defaults to
   `$TMPDIR/frame-mcp-smoke`, so you can look at the proof.

`sync-assets` writes to local R2 unless you pass `--remote`.

## Add a font

1. Add one row to `packages/frame/src/fonts.json` (the site's customizer reads the same list). Set `id`, `name`, `style`, `weight`,
   `licence` and `placeholder`. Set `source` to the path of the font file
   (TTF, OTF or WOFF) under `node_modules`.
2. Run `bun run sync-assets`. It uploads the file to `fonts/<id>.woff`.

If a font is not an npm package, change `sync-assets` to read its `source`
from the repo instead.

## Add a shape

1. Add the shape to `assets/frame-drawing.pdf` and to `shapes` in
   `plans/product-options.json`, with its id, `widthIn` and `heightIn`.
2. In `packages/frame/scripts/extract-geometry.mjs`, add one row to `SHAPES`.
   Set the index of the shape's outline path in the drawing's SVG (the opening
   is the next path), the outline's top-left on the page in inches, and
   `outerInsetIn`, the closest text may come to the cut edge.
3. Run `bun run extract-geometry` in `packages/frame`. It regenerates
   `src/shapes.generated.ts`.

The safe zones come from this table, so you do not need to change any code.

## Authentication

`src/auth.ts` checks a bearer token on every `/mcp` request before any tool runs.

1. Generate a long random token (a password manager works) and keep it there.
2. Set it as a secret on the deployed Worker, from this directory:
   `npx wrangler secret put MCP_TOKEN` (or in the Cloudflare dashboard under the
   Worker's Settings, Variables and Secrets).
3. Give the same token to the MCP client as an `Authorization: Bearer` header.

Locally, `bun run dev` needs it too: put `MCP_TOKEN=<anything>` in a `.dev.vars`
file here (the repo's `.gitignore` keeps it out of git). The
smoke test makes its own throwaway token.

## Not built yet

- A PNG preview of the proof for the chat.
- Listing presets.

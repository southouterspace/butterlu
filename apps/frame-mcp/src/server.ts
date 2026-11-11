import {
  BACKGROUNDS,
  BACKGROUND_SCALE,
  BACKGROUND_SHEET_IN,
  DEFAULT_MAX_PT,
  DEFAULT_MIN_PT,
  type FrameSpec,
  ROTATIONS,
  SHAPES,
  SHAPE_IDS,
  SIDES,
  defaultRotation,
  safeZone,
} from '@butterlu/frame';
import { describeDesign, designFromMetadata } from '@butterlu/frame/design';
import { DEFAULT_BLEED_IN, renderPdf } from '@butterlu/frame/pdf';
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { FONTS, FONT_IDS, assetBytes, backgroundPath, fontPath } from './assets';
import type { Env } from './env';
import { renderFileNames } from './file-names';
import { planOrder } from './plan-order';
import { renderStore } from './storage';

const BACKGROUND_IDS = BACKGROUNDS.map((b) => b.id);

const oneOf = <T extends string>(ids: readonly T[], what: string) =>
  z.enum(ids as [T, ...T[]], { error: (issue) => `Unknown ${what} ${JSON.stringify(issue.input)}. Valid ids: ${ids.join(', ')}` });

const sideText = z.object({
  text: z.string().trim().min(1).max(200).describe('The words for this side, exactly as they should print.'),
  fontId: oneOf(FONT_IDS, 'font').describe('A font id from list_options.'),
  rotation: z
    .union([z.literal(0), z.literal(90), z.literal(-90), z.literal(180)])
    .optional()
    .describe('Degrees counterclockwise. Defaults: top 0, bottom 0, left 90 (reads upward), right -90.'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #2b333f.')
    .optional()
    .describe("Hex text colour. Defaults to the background's defaultTextColor."),
  maxPt: z.number().min(6).max(144).optional().describe(`Largest size to use, in points. Default ${DEFAULT_MAX_PT}.`),
});

const backgroundFit = z
  .object({
    scale: z.number().min(BACKGROUND_SCALE.min).max(BACKGROUND_SCALE.max).describe(`Zoom, ${BACKGROUND_SCALE.min} (the sheet just covers the frame) to ${BACKGROUND_SCALE.max}.`),
    x: z.number().min(-1).max(1).default(0).describe('Which part of the sheet shows across: -1 its left edge, 0 the middle, 1 its right edge.'),
    y: z.number().min(-1).max(1).default(0).describe('Which part of the sheet shows down: -1 its top edge, 0 the middle, 1 its bottom edge.'),
  })
  .optional()
  .describe("How the customer zoomed and moved the background. Pass plan_site_order's spec.backgroundFit unchanged; leave it off for the default (scale 1, centred).");

const renderInput = {
  shape: oneOf(SHAPE_IDS, 'shape'),
  backgroundId: oneOf(BACKGROUND_IDS, 'background'),
  backgroundFit,
  sides: z
    .object({ top: sideText.optional(), right: sideText.optional(), bottom: sideText.optional(), left: sideText.optional() })
    .refine((s) => Object.values(s).some(Boolean), 'Give text for at least one side.'),
  label: z
    .string()
    .max(120)
    .optional()
    .describe('A short name for the Drive file names, such as the order number and recipient ("Etsy 3412 Aunt Sarah"). Defaults to the render id.'),
};

const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });
const fail = (message: string) => ({ isError: true, content: [{ type: 'text' as const, text: message }] });

export function createServer(env: Env) {
  const server = new McpServer({ name: 'butterlu-frame', version: '0.1.0' });

  server.registerTool(
    'list_options',
    {
      description:
        'Everything render_frame accepts: frame shapes with their text safe zones (inches, from the top-left), backgrounds with their default text colour, the background zoom and position range, fonts, sides and rotations.',
    },
    async () =>
      json({
        shapes: SHAPE_IDS.map((id) => ({
          id,
          widthIn: SHAPES[id].widthIn,
          heightIn: SHAPES[id].heightIn,
          safeZones: Object.fromEntries(SIDES.map((side) => [side, { ...safeZone(id, side), defaultRotation: defaultRotation(side) }])),
        })),
        backgrounds: BACKGROUNDS,
        backgroundFit: { scale: BACKGROUND_SCALE, x: { min: -1, max: 1 }, y: { min: -1, max: 1 }, sheetIn: BACKGROUND_SHEET_IN },
        fonts: FONTS.map(({ id, name, style, weight, placeholder }) => ({ id, name, style, weight, placeholder })),
        sides: SIDES,
        rotations: ROTATIONS,
        text: { defaultMaxPt: DEFAULT_MAX_PT, minLegiblePt: DEFAULT_MIN_PT },
        bleedIn: DEFAULT_BLEED_IN,
      }),
  );

  server.registerTool(
    'render_frame',
    {
      description:
        'Render a frame as a print-ready PDF (mirrored for sublimation transfer) and an unmirrored proof with cut line and safe zones, and save both to the owner\'s Google Drive print folder. Text on each side is scaled to fit its safe zone and centred on it. Returns the Drive file names and links, the fitted size per side, and warnings when text is too long to print legibly. Pass a label (order number and recipient) so the files are easy to find.',
      inputSchema: renderInput,
    },
    async ({ label, ...spec }) => {
      const choice = renderStore(env);
      if (!choice.ok) {
        return fail(`Print files can't be saved: Google Drive is not set up on this server (missing ${choice.missing.join(', ')}). The owner runs scripts/google-setup.mjs.`);
      }
      const frame = spec as FrameSpec;
      const fontIds = [...new Set(Object.values(spec.sides).flatMap((s) => (s ? [s.fontId] : [])))];
      const [background, ...fontBytes] = await Promise.all([
        assetBytes(env, backgroundPath(spec.backgroundId)),
        ...fontIds.map((id) => assetBytes(env, fontPath(id))),
      ]);
      const missing = [
        ...(background ? [] : [backgroundPath(spec.backgroundId)]),
        ...fontIds.filter((_, i) => !fontBytes[i]).map(fontPath),
      ];
      if (!background || missing.length > 0) {
        return fail(`Assets missing from this deploy: ${missing.join(', ')}. Run scripts/prepare-assets.mjs before deploying.`);
      }
      const assets = { background, fonts: Object.fromEntries(fontIds.map((id, i) => [id, fontBytes[i]!])) };

      const [proof, print] = await Promise.all([renderPdf(frame, assets, { variant: 'proof' }), renderPdf(frame, assets, { variant: 'print' })]);
      const id = crypto.randomUUID();
      const names = renderFileNames(id, label);
      let saved;
      try {
        saved = await Promise.all([
          choice.store.save({ name: names.print, kind: 'print', bytes: print.bytes }),
          choice.store.save({ name: names.proof, kind: 'proof', bytes: proof.bytes }),
        ]);
      } catch (err) {
        return fail(`The PDFs rendered but could not be saved to ${choice.store.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
      const [printFile, proofFile] = saved;

      return json({
        id,
        storage: choice.store.name,
        printFile: { name: names.print, url: printFile.url, fileId: printFile.id },
        proofFile: { name: names.proof, url: proofFile.url, fileId: proofFile.id },
        pageSizeIn: print.pageSizeIn,
        sides: print.placements.map((p) => ({
          side: p.side,
          text: p.text,
          fontId: p.fontId,
          sizePt: Math.round(p.sizePt * 10) / 10,
          rotation: p.rotation,
          color: p.color,
        })),
        warnings: print.placements.flatMap((p) => p.warnings.map((w) => ({ side: p.side, ...w }))),
      });
    },
  );

  server.registerTool(
    'plan_order',
    {
      description:
        'Turn the fields of an Etsy order (Color, Personalization, the seller\'s Private notes) into a draft layout: which line goes on which side, the frame orientation, and every reason a person must check it before printing. Each line of Personalization is one printed line. Lines without a stated side go top, then bottom; a third unplaced line is flagged for review, never guessed onto the left or right. Color is read against the Etsy colour chart: a chart number gives the backgroundId, and "(color #N)" on a line gives that line\'s text colour. Fonts are not chosen here; pass the plan to render_frame with them.',
      inputSchema: {
        personalization: z.string().describe('The Personalization field exactly as on the order, line breaks kept.'),
        color: z.string().describe('The Color field, e.g. "32" or "As Shown".'),
        privateNotes: z.string().optional().describe("The seller's Private notes, if any."),
      },
    },
    async ({ personalization, color, privateNotes }) => json(planOrder(color, personalization, privateNotes)),
  );

  server.registerTool(
    'plan_site_order',
    {
      description:
        "Turn one butterlu.com order line into render_frame input. Pass the metadata of the line item's Stripe product exactly as Stripe returns it (keys frame_shape, frame_background, frame_top, frame_right, frame_bottom, frame_left, and frame_fit when the customer zoomed or moved the background). The customer built this design in the site's customizer with the same shapes, backgrounds, fonts and safe zones, so unlike an Etsy order it needs no guessing. Returns the spec to pass to render_frame unchanged (backgroundFit included), a one-line summary for the order, and anything a person should check before printing.",
      inputSchema: {
        metadata: z.record(z.string(), z.string()).describe("The Stripe product's metadata for this line item."),
      },
    },
    async ({ metadata }) => {
      const parsed = designFromMetadata(metadata);
      if (!parsed.ok) return fail(`This line's design is not valid, so do not print it: ${parsed.errors.join('; ')}`);
      const placeholderFonts = [...new Set(Object.values(parsed.spec.sides).flatMap((s) => (s ? [s.fontId] : [])))].filter(
        (id) => FONTS.find((f) => f.id === id)?.placeholder,
      );
      return json({
        spec: parsed.spec,
        summary: describeDesign(parsed.spec),
        needsReview: placeholderFonts.map((id) => `Font ${id} is a stand-in until the real font list lands.`),
      });
    },
  );

  return server;
}

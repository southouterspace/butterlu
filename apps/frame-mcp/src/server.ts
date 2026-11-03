import {
  BACKGROUNDS,
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
import { DEFAULT_BLEED_IN, renderPdf } from '@butterlu/frame/pdf';
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { FONTS, FONT_IDS, backgroundKey, fontKey, renderKey } from './assets';
import type { Env } from './env';

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

const renderInput = {
  shape: oneOf(SHAPE_IDS, 'shape'),
  backgroundId: oneOf(BACKGROUND_IDS, 'background'),
  sides: z
    .object({ top: sideText.optional(), right: sideText.optional(), bottom: sideText.optional(), left: sideText.optional() })
    .refine((s) => Object.values(s).some(Boolean), 'Give text for at least one side.'),
};

const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });
const fail = (message: string) => ({ isError: true, content: [{ type: 'text' as const, text: message }] });

async function bytesOf(bucket: R2Bucket, key: string) {
  const obj = await bucket.get(key);
  return obj ? new Uint8Array(await obj.arrayBuffer()) : undefined;
}

export function createServer(env: Env, origin: string) {
  const server = new McpServer({ name: 'butterlu-frame', version: '0.1.0' });

  server.registerTool(
    'list_options',
    {
      description:
        'Everything render_frame accepts: frame shapes with their text safe zones (inches, from the top-left), backgrounds with their default text colour, fonts, sides and rotations.',
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
        'Render a frame as a print-ready PDF (mirrored for sublimation transfer) and an unmirrored proof with cut line and safe zones. Text on each side is scaled to fit its safe zone and centred on it. Returns links to both PDFs, the fitted size per side, and warnings when text is too long to print legibly.',
      inputSchema: renderInput,
    },
    async (spec) => {
      const frame = spec as FrameSpec;
      const fontIds = [...new Set(Object.values(spec.sides).flatMap((s) => (s ? [s.fontId] : [])))];
      const [background, ...fontBytes] = await Promise.all([
        bytesOf(env.ASSETS, backgroundKey(spec.backgroundId)),
        ...fontIds.map((id) => bytesOf(env.ASSETS, fontKey(id))),
      ]);
      const missing = [
        ...(background ? [] : [backgroundKey(spec.backgroundId)]),
        ...fontIds.filter((_, i) => !fontBytes[i]).map(fontKey),
      ];
      if (!background || missing.length > 0) {
        return fail(`Assets missing from the ASSETS bucket: ${missing.join(', ')}. Run scripts/sync-assets.mjs.`);
      }
      const assets = { background, fonts: Object.fromEntries(fontIds.map((id, i) => [id, fontBytes[i]!])) };

      const [proof, print] = await Promise.all([renderPdf(frame, assets, { variant: 'proof' }), renderPdf(frame, assets, { variant: 'print' })]);
      const id = crypto.randomUUID();
      const pdf = { httpMetadata: { contentType: 'application/pdf' } };
      await Promise.all([
        env.RENDERS.put(renderKey(id, 'proof'), proof.bytes, pdf),
        env.RENDERS.put(renderKey(id, 'print'), print.bytes, pdf),
      ]);

      return json({
        id,
        printUrl: `${origin}/renders/${id}/print.pdf`,
        proofUrl: `${origin}/renders/${id}/proof.pdf`,
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

  return server;
}

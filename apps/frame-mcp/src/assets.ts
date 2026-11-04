import { FONTS as SHARED_FONTS } from '@butterlu/frame';
import type { Env } from './env';

export interface FontEntry {
  id: string;
  name: string;
  style: string;
  weight: number;
  /** Where scripts/prepare-assets.mjs reads the file from, as a package path Node can resolve. */
  source: string;
  licence: string;
  /** True until Asli's real font list replaces the stand-ins. */
  placeholder: boolean;
}

export const FONTS: readonly FontEntry[] = SHARED_FONTS;
export const FONT_IDS = FONTS.map((f) => f.id);

// Static asset layout, shared with scripts/prepare-assets.mjs.
export const backgroundPath = (id: string) => `backgrounds/${id}.jpg`;
export const fontPath = (id: string) => `fonts/${id}.woff`;

/** Reads one bundled asset through the ASSETS binding; undefined when it isn't there. */
export async function assetBytes(env: Env, assetPath: string): Promise<Uint8Array | undefined> {
  // The host is ignored by the assets binding; only the path matters.
  const res = await env.ASSETS.fetch(new Request(`https://assets.invalid/${assetPath}`));
  if (!res.ok) return undefined;
  return new Uint8Array(await res.arrayBuffer());
}

import { FONTS as SHARED_FONTS } from '@butterlu/frame';

export interface FontEntry {
  id: string;
  name: string;
  style: string;
  weight: number;
  /** Where scripts/sync-assets.mjs reads the file from, as a package path Node can resolve. */
  source: string;
  licence: string;
  /** True until Asli's real font list replaces the stand-ins. */
  placeholder: boolean;
}

export const FONTS: readonly FontEntry[] = SHARED_FONTS;
export const FONT_IDS = FONTS.map((f) => f.id);

// R2 key layout, shared with scripts/sync-assets.mjs.
export const backgroundKey = (id: string) => `backgrounds/${id}.jpg`;
export const fontKey = (id: string) => `fonts/${id}.woff`;
export const renderKey = (id: string, variant: 'proof' | 'print') => `renders/${id}/${variant}.pdf`;

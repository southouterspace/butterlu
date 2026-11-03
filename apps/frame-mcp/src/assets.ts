import fonts from './fonts.json';

export interface FontEntry {
  id: string;
  name: string;
  style: string;
  weight: number;
  /** Where scripts/sync-assets.mjs reads the file from, relative to node_modules. */
  source: string;
  licence: string;
  /** True until Asli's real font list replaces the stand-ins. */
  placeholder: boolean;
}

export const FONTS: readonly FontEntry[] = fonts;
export const FONT_IDS = FONTS.map((f) => f.id);

// R2 key layout, shared with scripts/sync-assets.mjs.
export const backgroundKey = (id: string) => `backgrounds/${id}.jpg`;
export const fontKey = (id: string) => `fonts/${id}.woff`;
export const renderKey = (id: string, variant: 'proof' | 'print') => `renders/${id}/${variant}.pdf`;

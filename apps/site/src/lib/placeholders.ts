// Empty photo slots (Asli's photos aren't in yet) show an image placeholder on stage and
// in previews, so the layout can be judged with the photos' space held. Production hides
// an empty slot entirely, so a shopper never sees a blank box (owner, 2026-11-11).
// scripts/deploy.mjs sets BUTTERLU_PLACEHOLDERS=1 for stage and preview builds only, and
// clears it for production; scripts/lint-dist.mjs fails a build without it that ships one.
export const SHOW_PLACEHOLDERS = process.env.BUTTERLU_PLACEHOLDERS === '1';

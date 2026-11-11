// The small line drawings on the Who it's for and occasion cards.
//
// Each key names a file in src/assets/illustrations/<key>.png: black lines on a
// transparent background, square, 320px. They were cut from the "Celebrations and
// Milestones" doodle sheet (2026-11-11). Add a drawing by dropping in the file and
// adding its key here; the admin's picker and the build checks read this list.
//
// Plain TypeScript with no Astro imports, so the Worker can check a saved key.
export const ILLUSTRATIONS = [
  { key: 'pregnancy-announcement', name: 'Parents-to-be with an ultrasound' },
  { key: 'baptism', name: 'Baby being baptized' },
  { key: 'wedding', name: 'Bride and groom under an arch' },
  { key: 'engagement', name: 'Couple with a ring box' },
  { key: 'christmas', name: 'Family by the Christmas tree' },
  { key: 'birthday', name: 'Birthday cake and balloons' },
  { key: 'mothers-day', name: 'Mother and daughter with flowers' },
  { key: 'fathers-day', name: 'Child on a parent’s shoulders' },
  { key: 'baby-shower', name: 'Mom-to-be with gifts and a pram' },
  { key: 'pet-memorial', name: 'Pet portrait with a candle' },
  { key: 'just-because', name: 'Bouquet and a card' },
] as const;

export type IllustrationKey = (typeof ILLUSTRATIONS)[number]['key'];

const KEYS = new Set<string>(ILLUSTRATIONS.map((i) => i.key));
export const isIllustration = (key: unknown): key is IllustrationKey => typeof key === 'string' && KEYS.has(key);

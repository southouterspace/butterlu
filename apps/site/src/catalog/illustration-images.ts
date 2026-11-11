// The illustration files behind src/catalog/illustrations.ts, for pages. Kept apart
// from that list so the Worker, which only checks keys, never imports images.
import type { ImageMetadata } from 'astro';
import { ILLUSTRATIONS, type IllustrationKey } from './illustrations';

const files = import.meta.glob<ImageMetadata>('../assets/illustrations/*.png', { eager: true, import: 'default' });

const byKey = new Map<string, ImageMetadata>();
for (const { key } of ILLUSTRATIONS) {
  const file = files[`../assets/illustrations/${key}.png`];
  if (!file) throw new Error(`illustrations: no file for "${key}" in src/assets/illustrations/`);
  byKey.set(key, file);
}

export const illustrationImage = (key: IllustrationKey): ImageMetadata => byKey.get(key)!;

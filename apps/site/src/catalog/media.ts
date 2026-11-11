// Product photos and videos, shown beside the live preview on the product page.
//
// Photos live in src/assets/media/<handle>/ and go through Astro's image pipeline
// (astro:assets + sharp) at build time: AVIF and WebP at several widths, hashed
// file names under /_astro/ that cache for a year. Never put photos in public/,
// which ships them as-is.
//
// Videos are transcoded once with `bun run media:video` (scripts/prepare-video.mjs)
// into public/media/<handle>/<name>.mp4 plus a poster still in
// src/assets/media/<handle>/<name>-poster.jpg. Nothing loads a video until the
// shopper opens it or scrolls it near the screen.
//
// Each entry names a file under src/assets/media/ and gives its alt text. A missing
// file fails the build, so a typo can't ship a broken slide.
import type { ImageMetadata } from 'astro';

interface PhotoEntry {
  kind: 'photo';
  /** Path under src/assets/media/, e.g. "grandparent-pregnancy-announcement-frame/01-shelf.jpg". */
  file: string;
  alt: string;
}
interface VideoEntry {
  kind: 'video';
  /** URL under public/, e.g. "/media/<handle>/making-of.mp4". */
  src: string;
  /** Poster still under src/assets/media/. */
  poster: string;
  alt: string;
}
export type MediaEntry = PhotoEntry | VideoEntry;

export type ProductMedia =
  | { kind: 'photo'; image: ImageMetadata; alt: string }
  | { kind: 'video'; src: string; poster: ImageMetadata; alt: string };

/** Keyed by product handle; first entry is the first photo after the live preview. */
export const MEDIA: Record<string, MediaEntry[]> = {};

/**
 * Homepage photos of a finished frame in someone's home, in the order shown (up to
 * HOME_PHOTO_SLOTS). Drop the files in src/assets/media/home/ and list them here, e.g.
 * { kind: 'photo', file: 'home/01-mantel.jpg', alt: 'Grandma frame on a mantel' }.
 * Until then stage shows placeholders and production hides the section.
 */
export const HOME_MEDIA: PhotoEntry[] = [];
export const HOME_PHOTO_SLOTS = 3;

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/media/**/*.{jpg,jpeg,png,webp,avif}', { eager: true });

function image(file: string): ImageMetadata {
  const mod = files[`../assets/media/${file}`];
  if (!mod) throw new Error(`media: src/assets/media/${file} not found`);
  return mod.default;
}

export function resolveMedia(entries: MediaEntry[]): ProductMedia[] {
  return entries.map((e) =>
    e.kind === 'photo'
      ? { kind: 'photo', image: image(e.file), alt: e.alt }
      : { kind: 'video', src: e.src, poster: image(e.poster), alt: e.alt },
  );
}

export function productMedia(handle: string): ProductMedia[] {
  return resolveMedia(MEDIA[handle] ?? []);
}

export function homeMedia(): Extract<ProductMedia, { kind: 'photo' }>[] {
  return HOME_MEDIA.slice(0, HOME_PHOTO_SLOTS).map((e) => ({ kind: 'photo', image: image(e.file), alt: e.alt }));
}

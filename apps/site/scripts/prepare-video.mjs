// Transcode one product video for the web, once, before committing it:
//
//   bun run media:video <input file> <product handle> <name> [--keep-audio]
//
// Writes public/media/<handle>/<name>.mp4 (H.264, at most 1080 px tall, CRF 26,
// faststart so playback starts before the whole file arrives; no audio unless
// --keep-audio) and src/assets/media/<handle>/<name>-poster.jpg (a
// representative frame) for the poster, which goes through Astro's image pipeline.
// Then add a { kind: 'video' } entry in src/catalog/media.ts. Needs ffmpeg.
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [input, handle, name, ...flags] = process.argv.slice(2);
if (!input || !handle || !/^[a-z0-9-]+$/.test(name ?? '')) {
  console.error('usage: bun run media:video <input> <product handle> <name: a-z, 0-9, dashes> [--keep-audio]');
  process.exit(1);
}
const root = fileURLToPath(new URL('..', import.meta.url));
const videoDir = join(root, 'public/media', handle);
const posterDir = join(root, 'src/assets/media', handle);
mkdirSync(videoDir, { recursive: true });
mkdirSync(posterDir, { recursive: true });
const out = join(videoDir, `${name}.mp4`);
const poster = join(posterDir, `${name}-poster.jpg`);
const audio = flags.includes('--keep-audio') ? ['-c:a', 'aac', '-b:a', '96k'] : ['-an'];

execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-vf', "scale=-2:'min(1080,ih)'", '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', ...audio, out], { stdio: 'inherit' });
// ffmpeg's thumbnail filter picks a representative frame (works for short clips too).
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-vf', 'thumbnail', '-frames:v', '1', '-q:v', '3', poster], { stdio: 'inherit' });

const mb = (statSync(out).size / 1e6).toFixed(1);
console.log(`prepare-video: ${out} (${mb} MB) and ${poster}`);
if (statSync(out).size > 20e6) console.warn('prepare-video: over 20 MB; Workers static assets cap each file at 25 MiB. Trim it or host it elsewhere.');

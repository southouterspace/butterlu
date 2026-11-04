// Product gallery dialog: open at the pressed thumbnail, step with buttons or arrow
// keys, keep the counter in sync with scroll snap, and load a video only when its
// slide is the one in view. Escape and the close button use the native dialog.
import { loadNow, whenIdle } from './idle';

export function initGallery(dialog: HTMLDialogElement) {
  const track = dialog.querySelector<HTMLElement>('[data-gallery-track]')!;
  const slides = [...track.children] as HTMLElement[];
  const count = dialog.querySelector('[data-gallery-count]')!;
  let current = 0;

  const go = (i: number, smooth = true) => {
    const n = Math.max(0, Math.min(slides.length - 1, i));
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: slides[n]!.offsetLeft - track.offsetLeft, behavior: smooth && !reduce ? 'smooth' : 'instant' });
  };

  const settle = (i: number) => {
    if (i === current) return;
    current = i;
    count.textContent = `${i + 1} / ${slides.length}`;
    slides.forEach((s, k) => {
      // Only the slide in view is reachable by Tab, so focus never jumps the carousel.
      s.inert = k !== i;
      const v = s.querySelector('video');
      if (!v) return;
      if (k === i && v.dataset.src) {
        v.src = v.dataset.src;
        delete v.dataset.src;
      }
      if (k !== i && !v.paused) v.pause();
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) settle(slides.indexOf(e.target as HTMLElement));
    },
    { root: track, threshold: 0.6 },
  );
  slides.forEach((s) => io.observe(s));

  // Photos and video posters wait for the page to go idle, then queue, so the
  // viewer opens with them already downloaded. Video files load only when played.
  whenIdle(() => {
    loadNow(dialog);
    for (const v of dialog.querySelectorAll<HTMLVideoElement>('video[data-poster]')) {
      v.poster = v.dataset.poster!;
      delete v.dataset.poster;
    }
  });

  const root = dialog.parentElement!;
  root.querySelectorAll<HTMLButtonElement>('[data-gallery-open]').forEach((b) =>
    b.addEventListener('click', () => {
      dialog.showModal();
      current = -1;
      const i = Number(b.dataset.galleryOpen);
      go(i, false);
      settle(i);
      track.focus({ preventScroll: true });
    }),
  );
  dialog.querySelectorAll<HTMLButtonElement>('[data-gallery-step]').forEach((b) =>
    b.addEventListener('click', () => go(current + Number(b.dataset.galleryStep))),
  );
  dialog.querySelector('[data-gallery-close]')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (e) => {
    // Leave arrow keys to a focused video (seek, volume) or form control.
    if ((e.target as Element).closest('video, input, select, textarea')) return;
    if (e.key === 'ArrowRight') go(current + 1);
    else if (e.key === 'ArrowLeft') go(current - 1);
    else return;
    e.preventDefault();
  });
  dialog.addEventListener('close', () => {
    slides.forEach((s) => s.querySelector('video')?.pause());
    root.querySelector<HTMLButtonElement>(`[data-gallery-open="${current}"]`)?.focus();
  });
}

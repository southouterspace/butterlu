// Run work once the page has loaded and the main thread is idle: for queueing
// images the shopper will probably want next (background swatches, gallery
// photos) without competing with what's on screen. Skipped under Data Saver.
export function whenIdle(work: () => void) {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;
  const go = () => ('requestIdleCallback' in window ? requestIdleCallback(work, { timeout: 3000 }) : setTimeout(work, 1500));
  if (document.readyState === 'complete') go();
  else addEventListener('load', go, { once: true });
}

/** Turn loading="lazy" images in `root` into eager ones, so they fetch now. */
export function loadNow(root: ParentNode) {
  for (const img of root.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')) img.loading = 'eager';
}

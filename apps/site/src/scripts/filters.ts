// Filters on category pages (components/FilterBar.astro). One choice per facet;
// pressing the chosen chip again clears it. The choice is kept in the query string
// with replaceState, so a menu link like ?for=grandma opens filtered and a reload or
// shared link keeps it. Cards carry their tags as data attributes (ProductCard).

type Param = 'for' | 'occasion';
const PARAMS: Param[] = ['for', 'occasion'];
const ATTR: Record<Param, string> = { for: 'data-for', occasion: 'data-occasion' };

export function mountFilters(root: Document = document) {
  const bar = root.querySelector<HTMLElement>('[data-filters]');
  if (!bar) return;
  const cards = [...root.querySelectorAll<HTMLElement>('[data-card]')];
  const chips = [...bar.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const status = bar.querySelector<HTMLElement>('[data-filter-status]')!;
  const clear = bar.querySelector<HTMLButtonElement>('[data-filter-clear]:not([data-filter-clear="sheet"])')!;
  const sheetClear = bar.querySelector<HTMLButtonElement>('[data-filter-clear="sheet"]');
  const sheet = bar.querySelector<HTMLDialogElement>('[data-filter-sheet]');
  const opener = bar.querySelector<HTMLButtonElement>('[data-filter-open]');
  const count = bar.querySelector<HTMLElement>('[data-filter-count]');
  const done = bar.querySelector<HTMLButtonElement>('[data-filter-done]');
  // Outside the open sheet is inert, so the sheet announces the count itself.
  const sheetStatus = bar.querySelector<HTMLElement>('[data-filter-sheet-status]');
  const empty = root.querySelector<HTMLElement>('[data-filter-empty]');
  const offered = (p: Param, v: string) => chips.some((c) => c.dataset.filter === p && c.dataset.value === v);

  const state: Partial<Record<Param, string>> = {};
  const params = new URLSearchParams(location.search);
  // Only values this page offers; anything else in the URL is ignored.
  for (const p of PARAMS) {
    const v = params.get(p);
    if (v && offered(p, v)) state[p] = v;
  }

  const apply = () => {
    let shown = 0;
    for (const card of cards) {
      const match = PARAMS.every((p) => !state[p] || (card.getAttribute(ATTR[p]) ?? '').split(' ').includes(state[p]!));
      card.hidden = !match;
      if (match) shown++;
    }
    for (const c of chips) c.setAttribute('aria-pressed', String(state[c.dataset.filter as Param] === c.dataset.value));
    const chosen = PARAMS.filter((p) => state[p]).length;
    const any = chosen > 0;
    clear.hidden = !any;
    if (sheetClear) sheetClear.disabled = !any;
    if (count) {
      count.hidden = !any;
      count.textContent = String(chosen);
    }
    opener?.setAttribute('aria-label', any ? `Filter, ${chosen} selected` : 'Filter');
    if (done) done.textContent = `Show ${shown} ${shown === 1 ? 'Design' : 'Designs'}`;
    if (empty) empty.hidden = shown > 0;
    const text = any ? `Showing ${shown} of ${cards.length} designs` : `Showing all ${cards.length} designs`;
    status.textContent = text;
    if (sheetStatus && sheet?.open) sheetStatus.textContent = text;
  };

  const sync = () => {
    const url = new URL(location.href);
    for (const p of PARAMS) {
      if (state[p]) url.searchParams.set(p, state[p]!);
      else url.searchParams.delete(p);
    }
    history.replaceState(history.state, '', url);
  };

  bar.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const clearing = Boolean(target.closest('[data-filter-clear]'));
    if (clearing) {
      for (const p of PARAMS) delete state[p];
    } else {
      const chip = target.closest<HTMLButtonElement>('[data-filter]');
      if (!chip) return;
      const p = chip.dataset.filter as Param;
      state[p] = state[p] === chip.dataset.value ? undefined : chip.dataset.value;
    }
    sync();
    apply();
    // Clear hides itself; keep keyboard focus on the bar (the sheet's Clear stays put).
    if (clearing) (sheet?.open ? done : status)?.focus();
  });

  // The chips open in a bottom sheet on phones and a left drawer from md up.
  // Filtering is live; Show N Designs (or Close, Escape, the scrim) closes it.
  if (sheet && opener) {
    opener.addEventListener('click', () => sheet.showModal());
    done?.addEventListener('click', () => sheet.close());
    bar.querySelector('[data-filter-close]')?.addEventListener('click', () => sheet.close());
    // A tap on the scrim, outside the sheet's box, closes it.
    sheet.addEventListener('click', (e) => {
      if (e.target !== sheet) return;
      const r = sheet.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) sheet.close();
    });
  }

  apply();
}

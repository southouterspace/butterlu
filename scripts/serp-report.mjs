// Rank tracking for butterlu.com. Reads the tracked searches in plans/serp/queries.json
// and the snapshots in plans/serp/snapshots/*.json, and prints where Butterlu stands,
// who leads each search, and what moved since the previous snapshot.
//
//   node scripts/serp-report.mjs            # latest snapshot vs the one before it
//   node scripts/serp-report.mjs --json     # same, as one JSON object (for agents)
//
// "other #N" is a Butterlu page that isn't butterlu.com (the Etsy shop or a listing).
//
// Pure local computation. No network. Snapshots are written by an agent that runs each
// tracked search (Firecrawl search, location United States, top 10) and classifies the
// results; plans/serp/README.md has the snapshot shape and the loop.
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../plans/serp/', import.meta.url);
const read = async (u) => JSON.parse(await readFile(u, 'utf8'));

const { queries } = await read(new URL('queries.json', root));
const files = (await readdir(new URL('snapshots/', root))).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
if (!files.length) {
  console.error('No snapshots in plans/serp/snapshots/ yet.');
  process.exit(1);
}
const latestName = files.at(-1);
const previousName = files.length > 1 ? files.at(-2) : null;
const latest = await read(new URL(`snapshots/${latestName}`, root));
const previous = previousName ? await read(new URL(`snapshots/${previousName}`, root)) : null;

const OWN = /(^|\.)butterlu\.com$/i;
const host = (d) => String(d ?? '').toLowerCase().replace(/^www\./, '');
const byQuery = (snap) => new Map((snap?.rows ?? []).map((r) => [r.query.toLowerCase(), r]));
const now = byQuery(latest);
const before = byQuery(previous);

/** Best position of a result matching `test`, or null. */
const best = (row, test) => {
  const hits = (row?.results ?? []).filter(test).map((r) => Number(r.pos)).filter(Number.isFinite);
  return hits.length ? Math.min(...hits) : null;
};
/** Results in positions 1 to 3, in position order. */
const top3Of = (row) =>
  (row?.results ?? []).filter((r) => Number(r.pos) <= 3).sort((a, b) => Number(a.pos) - Number(b.pos));
const ownSite = (r) => OWN.test(host(r.domain));
const ownAny = (r) => ownSite(r) || r.isButterlu === true;

const rows = queries.map((q) => {
  const row = now.get(q.query.toLowerCase());
  const prev = before.get(q.query.toLowerCase());
  const site = best(row, ownSite);
  const any = best(row, ownAny);
  const prevSite = best(prev, ownSite);
  const prevDomains = new Set(top3Of(prev).map((r) => host(r.domain)));
  const top3 = top3Of(row);
  // entered / dropped / moved / same, or untracked when the previous snapshot lacks the query.
  const status = !previous || !prev ? 'untracked' : site != null && prevSite == null ? 'entered' : site == null && prevSite != null ? 'dropped' : site !== prevSite ? 'moved' : 'same';
  return {
    query: q.query,
    cluster: q.cluster ?? '',
    priority: [1, 2, 3].includes(q.priority) ? q.priority : 3,
    tracked: Boolean(row),
    site, // butterlu.com
    anyButterlu: any, // butterlu.com or a ButterLu Etsy listing
    prevSite,
    status,
    siteChange: site != null && prevSite != null ? prevSite - site : null,
    newInTop3: prev ? top3.filter((r) => !prevDomains.has(host(r.domain))).map((r) => host(r.domain)) : [],
    leaders: top3.map((r) => `${host(r.domain)} (${r.pageType ?? '?'})${ownAny(r) ? ' [Butterlu]' : ''}`),
  };
});

const tracked = rows.filter((r) => r.tracked);
const weight = (r) => ({ 1: 3, 2: 2, 3: 1 })[r.priority];
const share = (test) => {
  const total = tracked.reduce((s, r) => s + weight(r), 0) || 1;
  return Math.round((100 * tracked.filter(test).reduce((s, r) => s + weight(r), 0)) / total);
};
const summary = {
  snapshot: latestName,
  previous: previousName,
  tracked: tracked.length,
  missing: rows.filter((r) => !r.tracked).map((r) => r.query),
  // Weighted by priority (1 counts 3x, 2 counts 2x, 3 counts 1x).
  siteTop3Pct: share((r) => r.site != null && r.site <= 3),
  siteTop10Pct: share((r) => r.site != null),
  anyButterluTop10Pct: share((r) => r.anyButterlu != null),
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ summary, rows }, null, 2));
} else {
  console.log(`Snapshot ${latestName}${previousName ? ` vs ${previousName}` : ''}: ${tracked.length} searches`);
  console.log(
    `butterlu.com top 3: ${summary.siteTop3Pct}%  top 10: ${summary.siteTop10Pct}%  ` +
      `any Butterlu page top 10: ${summary.anyButterluTop10Pct}% (priority-weighted)`,
  );
  if (summary.missing.length) console.log(`Not in this snapshot: ${summary.missing.join('; ')}`);
  console.log('');
  for (const r of [...tracked].sort((a, b) => a.priority - b.priority || a.cluster.localeCompare(b.cluster))) {
    const pos = r.site != null ? `#${r.site}` : r.anyButterlu != null ? `other #${r.anyButterlu}` : '-';
    const move =
      r.status === 'entered' ? ' (new)' : r.status === 'dropped' ? ` (out, was #${r.prevSite})` : r.siteChange ? ` (${r.siteChange > 0 ? '+' : ''}${r.siteChange})` : '';
    const fresh = r.newInTop3.length ? `  new in top 3: ${r.newInTop3.join(', ')}` : '';
    console.log(`P${r.priority} ${r.cluster.padEnd(20)} ${pos.padEnd(10)}${move.padEnd(16)} ${r.query}`);
    console.log(`   ${r.leaders.join(' · ')}${fresh}`);
  }
}

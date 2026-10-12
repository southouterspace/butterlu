// Audits the metadata of every active Etsy listing: titles, tags, materials, taxonomy,
// sections, personalisation, prices, images and lifetime engagement. Reads
// plans/etsy-listings.json and plans/clusters.json, writes plans/etsy-metadata-audit.json.
//
//   node scripts/etsy-metadata-audit.mjs
//
// Pure local computation. No network, no writes to Etsy. Views and favourites in the
// export are LIFETIME counts and are not sales: per-listing sales need Etsy OAuth
// (transactions_r), which the export does not use.
import { readFile, writeFile } from 'node:fs/promises';

const read = async (f) => JSON.parse(await readFile(new URL(`../plans/${f}`, import.meta.url), 'utf8'));
const write = (f, data) => writeFile(new URL(`../plans/${f}`, import.meta.url), JSON.stringify(data, null, 2) + '\n');

const etsy = await read('etsy-listings.json');
const clusters = await read('clusters.json');
const listings = etsy.rows;
const SNAPSHOT = new Date(etsy.generatedAt ?? Date.now());
const N = listings.length;

// ---- helpers -------------------------------------------------------------------------
const round = (n, d = 2) => (Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : null);
const pct = (n, of = N) => round((100 * n) / of, 1);
const sum = (xs, f = (x) => x) => xs.reduce((s, x) => s + f(x), 0);
const count = (xs, f) => xs.filter(f).length;
function quantiles(values) {
  const v = [...values].sort((a, b) => a - b);
  if (!v.length) return null;
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * (v.length - 1)))];
  return { min: v[0], p10: q(0.1), p25: q(0.25), median: q(0.5), p75: q(0.75), p90: q(0.9), max: v[v.length - 1], mean: round(sum(v) / v.length, 1) };
}
function histogram(values, edges) {
  // edges [a, b, c] -> buckets "<a", "a-(b-1)", ..., ">=c"
  const out = {};
  const label = (i) => (i === 0 ? `<${edges[0]}` : i === edges.length ? `>=${edges[edges.length - 1]}` : `${edges[i - 1]}-${edges[i] - 1}`);
  for (let i = 0; i <= edges.length; i++) out[label(i)] = 0;
  for (const x of values) {
    let i = edges.findIndex((e) => x < e);
    if (i === -1) i = edges.length;
    out[label(i)]++;
  }
  return out;
}
const tally = (xs) => {
  const m = new Map();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
};
const top = (xs, n) => tally(xs).slice(0, n).map(([value, n]) => ({ value, n }));
const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const tokens = (s) => norm(s).match(/[a-z0-9']+/g) ?? [];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasPhrase = (text, phrase) => new RegExp(`(^|[^a-z0-9])${escapeRe(phrase)}([^a-z0-9]|$)`).test(text);
const yearsSince = (iso) => (SNAPSHOT - new Date(iso)) / (365.25 * 864e5);
const brief = (l) => ({ listingId: l.listingId, title: l.title, views: l.views, numFavorers: l.numFavorers });

// Words that carry no keyword signal on their own.
const STOP = new Set('a an and the for of to with in on my your our is be you me i it by as at from this that are we us its'.split(' '));
const content = (s) => tokens(s).filter((w) => !STOP.has(w));

// ---- product type and page (same rules as lineup-draft.mjs) -------------------------
const PRODUCT_TYPES = [
  ['car-accessory', (l) => l.sectionTitle === 'Car coasters/ornaments'],
  ['brag-board', (l) => l.sectionTitle === 'Photo Blocks Clip Frames'],
  ['add-on', (l) => l.sectionTitle === 'Add ons' || /figurine/i.test(l.title)],
  ['large-frame', (l) => l.price >= 60],
  ['frame', () => true],
];
const productType = (l) => PRODUCT_TYPES.find(([, test]) => test(l))[0];
const pageOf = new Map(clusters.rows.flatMap((r) => r.members.map((m) => [m.etsyListingId, r])));

// Recipient and occasion vocab, a subset of lineup-draft.mjs, used to compare what a
// title names against what the tags name. A listing can match several keys.
const RECIPIENTS = [
  ['godparents', /god ?parents?/],
  ['godmother', /god ?mother|godmom/],
  ['godfather', /god ?father/],
  ['great-grandparent', /great[- ]?grand/],
  ['grandparents', /grandparents?/],
  ['grandpa', /grandpa|grandfather|grandad|granddad|papa|poppy|\bpop\b|pawpaw|abuelo|\bopa\b|gramps/],
  ['grandma', /grandma|grandmother|nana|mimi|gigi|granny|grammy|glamma|abuela|\boma\b|nonna|\bmeme\b/],
  ['aunt', /\baunt|auntie|\btia\b/],
  ['uncle', /uncle|\btio\b/],
  ['mom', /\bmom\b|\bmother\b|\bmama\b|mommy/],
  ['dad', /\bdad\b|\bfather\b|daddy/],
  ['teacher-nanny-coach', /teacher|nanny|coach|daycare|babysitter/],
  ['sister-brother-friend', /sister|brother|sibling|best ?friend|bestie|friendship/],
  ['pet', /\bpets?\b|\bdogs?\b|\bcats?\b|puppy|kitten|fur ?baby|rainbow bridge/],
  ['couple', /couple|boyfriend|girlfriend|husband|wife/],
  ['baby', /\bbaby\b|newborn|nursery/],
  ['graduate', /graduat|sorority|senior/],
];
const OCCASIONS = [
  ['proposal', /will you be my|proposal|be my god/],
  ['memorial', /memorial|\bloss\b|sympathy|rainbow bridge|in memory|remembrance|heaven|miscarriage|bereavement/],
  ['pregnancy-announcement', /announcement|reveal|to be\b|promoted|expecting|ultrasound|sonogram|pregnan/],
  ['baptism', /baptism|christening|communion|dedication/],
  ['wedding', /wedding|bride|groom/],
  ['engagement', /engage/],
  ['anniversary', /anniversary/],
  ['christmas', /christmas|holiday|xmas|stocking/],
  ['mothers-day', /mother'?s day/],
  ['fathers-day', /father'?s day/],
  ['valentines', /valentine/],
  ['birthday', /birthday/],
  ['graduation', /graduat/],
  ['thank-you', /thank you|appreciation/],
];
const VOCAB = [...RECIPIENTS.map(([k, re]) => [`recipient:${k}`, re]), ...OCCASIONS.map(([k, re]) => [`occasion:${k}`, re])];
const matchesOf = (text) => new Set(VOCAB.filter(([, re]) => re.test(text)).map(([k]) => k));

// ---- per-listing facts ---------------------------------------------------------------
const rows = listings.map((l) => {
  const t = norm(l.title);
  const words = l.title.trim().split(/\s+/).filter(Boolean);
  const cw = content(l.title);
  const freq = tally(cw);
  const repeated = freq.filter(([w, n]) => n >= 2).map(([w, n]) => ({ word: w, n }));
  const tagsN = l.tags.map(norm);
  const tagText = tagsN.join(' | ');
  const page = pageOf.get(l.listingId);
  const ageYears = yearsSince(l.originalCreatedAt);
  return {
    l,
    type: productType(l),
    pageKey: page?.pageKey ?? null,
    clusterTier: page?.tier ?? null,
    recipient: page?.recipient ?? null,
    occasion: page?.occasion ?? null,
    titleLen: l.title.length,
    titleWords: words.length,
    first40: l.title.slice(0, 40),
    hasColonStyle: /[:–—|,]/.test(l.title),
    doubleSpaces: /\S {2,}\S/.test(l.title),
    repeated,
    stuffedWords: repeated.filter((r) => r.n >= 3 || !['gift', 'frame', 'picture', 'photo', 'personalized'].includes(r.word)).length,
    giftCount: (t.match(/\bgifts?\b/g) ?? []).length,
    frameCount: (t.match(/\bframes?\b/g) ?? []).length,
    tagsN,
    tagInTitle: tagsN.filter((g) => hasPhrase(t, g)),
    tagAllWordsInTitle: tagsN.filter((g) => tokens(g).every((w) => hasPhrase(t, w))),
    tagDupes: tagsN.length - new Set(tagsN).size,
    titleVocab: matchesOf(t),
    tagVocab: matchesOf(tagText),
    ageYears,
    viewsPerYear: l.views / Math.max(ageYears, 0.25),
    favPerView: l.views ? l.numFavorers / l.views : null,
  };
});

// ---- titles --------------------------------------------------------------------------
// Near-duplicate titles: Jaccard over content words. Exact = same normalised title.
const titleSets = rows.map((r) => new Set(content(r.l.title)));
const jac = (a, b) => {
  let both = 0;
  for (const w of a) if (b.has(w)) both++;
  return both / (a.size + b.size - both || 1);
};
const NEAR = 0.8;
const nearPairs = [];
for (let i = 0; i < rows.length; i++)
  for (let j = i + 1; j < rows.length; j++) {
    const s = jac(titleSets[i], titleSets[j]);
    if (s >= NEAR) nearPairs.push({ a: rows[i].l.listingId, b: rows[j].l.listingId, similarity: round(s), titleA: rows[i].l.title, titleB: rows[j].l.title });
  }
const exactDupTitles = tally(rows.map((r) => norm(r.l.title))).filter(([, n]) => n > 1).map(([title, n]) => ({ title, n }));
const listingsInNearPairs = new Set(nearPairs.flatMap((p) => [p.a, p.b]));

// First-40 analysis: what do the first 40 characters (roughly what shows in search on
// mobile) lead with?
const leadWord = (r) => content(r.first40)[0] ?? '';
const first40StartsGeneric = (r) => /^(personali[sz]ed|custom|unique|gift|picture|photo|frame)\b/i.test(r.l.title.trim());
const first40NamesRecipient = (r) => [...matchesOf(norm(r.first40))].some((k) => k.startsWith('recipient:'));
const first40NamesOccasion = (r) => [...matchesOf(norm(r.first40))].some((k) => k.startsWith('occasion:'));

const titleStyle = (r) => (r.titleWords <= 15 && r.titleLen <= 90 ? 'short-readable' : r.titleWords <= 15 ? 'short-but-long-chars' : 'long-keyword-string');

// Engagement by title style (frames only, to keep product mix out of it).
const frames = rows.filter((r) => r.type === 'frame');
function engagement(group) {
  const g = group.filter((r) => r.l.views > 0);
  return {
    listings: group.length,
    medianViews: quantiles(group.map((r) => r.l.views))?.median ?? null,
    medianFavorers: quantiles(group.map((r) => r.l.numFavorers))?.median ?? null,
    medianViewsPerYear: round(quantiles(group.map((r) => r.viewsPerYear))?.median ?? null, 0),
    pooledFavPerView: round(sum(g, (r) => r.l.numFavorers) / Math.max(1, sum(g, (r) => r.l.views)), 4),
    medianAgeYears: round(quantiles(group.map((r) => r.ageYears))?.median ?? null, 1),
  };
}
const byKey = (xs, f) => {
  const m = new Map();
  for (const x of xs) {
    const k = f(x);
    m.set(k, [...(m.get(k) ?? []), x]);
  }
  return m;
};

const titles = {
  limits: { maxChars: 140, guidance: 'Etsy (2023+) recommends short, readable titles that lead with what the item is; roughly under 15 words. Not a hard rule.' },
  charLength: { quantiles: quantiles(rows.map((r) => r.titleLen)), histogram: histogram(rows.map((r) => r.titleLen), [40, 60, 80, 100, 120, 135]), atOrOver135: count(rows, (r) => r.titleLen >= 135), at140: count(rows, (r) => r.titleLen >= 140) },
  wordCount: { quantiles: quantiles(rows.map((r) => r.titleWords)), histogram: histogram(rows.map((r) => r.titleWords), [8, 12, 16, 20, 24]), over15Words: count(rows, (r) => r.titleWords > 15) },
  style: Object.fromEntries(tally(rows.map(titleStyle))),
  styleEngagementFramesOnly: Object.fromEntries([...byKey(frames, titleStyle)].map(([k, g]) => [k, engagement(g)])),
  styleByOriginalYear: Object.fromEntries(
    [...byKey(rows, (r) => r.l.originalCreatedAt.slice(0, 4))].sort().map(([y, g]) => [y, { listings: g.length, longKeywordString: count(g, (r) => titleStyle(r) === 'long-keyword-string'), medianWords: quantiles(g.map((r) => r.titleWords)).median }]),
  ),
  colonOrSeparator: count(rows, (r) => r.hasColonStyle),
  doubleSpaces: { listings: count(rows, (r) => r.doubleSpaces), note: 'Two or more spaces where a separator was stripped, a sign of pasted keyword strings.' },
  repetition: {
    giftWordAtLeast2: count(rows, (r) => r.giftCount >= 2),
    giftWordAtLeast3: count(rows, (r) => r.giftCount >= 3),
    frameWordAtLeast2: count(rows, (r) => r.frameCount >= 2),
    frameWordAtLeast3: count(rows, (r) => r.frameCount >= 3),
    anyContentWordRepeated: count(rows, (r) => r.repeated.length > 0),
    anyContentWordAtLeast3: count(rows, (r) => r.repeated.some((x) => x.n >= 3)),
    mostRepeatedWords: top(rows.flatMap((r) => r.repeated.map((x) => x.word)), 15),
    worstExamples: [...rows].sort((a, b) => sum(b.repeated, (x) => x.n - 1) - sum(a.repeated, (x) => x.n - 1)).slice(0, 8).map((r) => ({ ...brief(r.l), repeated: r.repeated })),
  },
  first40: {
    startsWithGenericWord: count(rows, first40StartsGeneric),
    namesARecipient: count(rows, first40NamesRecipient),
    namesAnOccasion: count(rows, first40NamesOccasion),
    namesNeither: count(rows, (r) => !first40NamesRecipient(r) && !first40NamesOccasion(r)),
    leadWords: top(rows.map(leadWord), 20),
    leadPhrases3Words: top(rows.map((r) => tokens(r.l.title).slice(0, 3).join(' ')), 20),
  },
  duplicates: {
    exactDuplicateTitles: exactDupTitles,
    nearDuplicatePairs: nearPairs.length,
    listingsInNearDuplicatePairs: listingsInNearPairs.size,
    threshold: `Jaccard >= ${NEAR} over content words (stop words removed)`,
    pairs: nearPairs.sort((a, b) => b.similarity - a.similarity).slice(0, 40),
  },
};

// ---- tags ----------------------------------------------------------------------------
const allTags = rows.flatMap((r) => r.tagsN);
const tagListingCount = tally(rows.flatMap((r) => [...new Set(r.tagsN)]));
const listingsPerTag = new Map(tagListingCount);
const taxonomyWords = new Set(['picture frame', 'picture frames', 'photo frame', 'photo frames', 'frame', 'frames', 'picture', 'photo', 'gift', 'gifts', 'personalized', 'personalized gift', 'custom gift', 'personalized frame', 'custom frame']);
const SHARED_MIN = 25;
const vocabGaps = {};
for (const [k] of VOCAB) {
  const titleOnly = count(rows, (r) => r.titleVocab.has(k) && !r.tagVocab.has(k));
  const tagsOnly = count(rows, (r) => !r.titleVocab.has(k) && r.tagVocab.has(k));
  const both = count(rows, (r) => r.titleVocab.has(k) && r.tagVocab.has(k));
  if (titleOnly + tagsOnly + both) vocabGaps[k] = { inTitleAndTags: both, inTitleNotTags: titleOnly, inTagsNotTitle: tagsOnly };
}
const tags = {
  limits: { maxTags: 13, maxChars: 20 },
  perListing: Object.fromEntries(tally(rows.map((r) => r.l.tags.length))),
  using13: count(rows, (r) => r.l.tags.length === 13),
  missingSlots: sum(rows, (r) => 13 - r.l.tags.length),
  listingsWithFewerThan13: rows.filter((r) => r.l.tags.length < 13).map((r) => ({ ...brief(r.l), tags: r.l.tags.length })),
  totalTagUses: allTags.length,
  distinctTags: listingsPerTag.size,
  charLength: { quantiles: quantiles(allTags.map((g) => g.length)), at20: count(allTags, (g) => g.length === 20), at19or20: count(allTags, (g) => g.length >= 19), histogram: histogram(allTags.map((g) => g.length), [5, 10, 15, 19, 20]) },
  distinctTagsAt20Chars: top(allTags.filter((g) => g.length === 20), 40),
  // A 20-char tag whose last word is not a word used anywhere else but IS the start of a
  // longer one (in any title or shorter tag) was probably cut off at the limit, e.g.
  // "christmas grandparen".
  likelyTruncated: (() => {
    const vocab = new Set([...rows.flatMap((r) => tokens(r.l.title)), ...allTags.filter((g) => g.length < 20).flatMap(tokens)]);
    const words = [...vocab];
    const isCut = (g) => {
      const last = tokens(g).at(-1);
      return g.length === 20 && !vocab.has(last) && words.some((w) => w.length > last.length && w.startsWith(last));
    };
    const cut = allTags.filter(isCut);
    return { tagUses: cut.length, listings: count(rows, (r) => r.tagsN.some((g) => cut.includes(g))), tags: top(cut, 30) };
  })(),
  wordsPerTag: Object.fromEntries(tally(allTags.map((g) => Math.min(tokens(g).length, 4)).map((n) => (n === 4 ? '4+' : String(n))))),
  singleWordTagUses: count(allTags, (g) => tokens(g).length === 1),
  duplicateTagsWithinListing: { listings: count(rows, (r) => r.tagDupes > 0), wastedSlots: sum(rows, (r) => r.tagDupes) },
  repeatsTitle: {
    note: 'A tag phrase that already appears verbatim in the title. Etsy matches title and tags together, so these slots add little new reach; they are not penalised.',
    tagUsesVerbatimInTitle: sum(rows, (r) => r.tagInTitle.length),
    shareOfTagUses: pct(sum(rows, (r) => r.tagInTitle.length), allTags.length),
    tagUsesAllWordsInTitle: sum(rows, (r) => r.tagAllWordsInTitle.length),
    shareAllWordsInTitle: pct(sum(rows, (r) => r.tagAllWordsInTitle.length), allTags.length),
    listingsWith5PlusVerbatim: count(rows, (r) => r.tagInTitle.length >= 5),
    perListingVerbatim: quantiles(rows.map((r) => r.tagInTitle.length)),
  },
  repeatsCategory: { note: 'Generic tags that restate the category or "gift"/"personalized".', tagUses: count(allTags, (g) => taxonomyWords.has(g)), listings: count(rows, (r) => r.tagsN.some((g) => taxonomyWords.has(g))), which: top(allTags.filter((g) => taxonomyWords.has(g)), 15) },
  mostUsed: tagListingCount.slice(0, 40).map(([tag, listings]) => ({ tag, listings })),
  sharedBy: { [`>=${SHARED_MIN}`]: count(tagListingCount, ([, n]) => n >= SHARED_MIN), '>=50': count(tagListingCount, ([, n]) => n >= 50), '>=100': count(tagListingCount, ([, n]) => n >= 100) },
  selfCompetition: {
    note: `Tag uses where ${SHARED_MIN}+ listings carry the identical tag. These listings compete with each other for the same query; Etsy generally shows few listings per shop per search, so most copies earn little.`,
    tagUses: sum(rows, (r) => count(r.tagsN, (g) => listingsPerTag.get(g) >= SHARED_MIN)),
    share: pct(sum(rows, (r) => count(r.tagsN, (g) => listingsPerTag.get(g) >= SHARED_MIN)), allTags.length),
  },
  longTail: {
    tagsUsedByOneListing: count(tagListingCount, ([, n]) => n === 1),
    tagUsesUnique: sum(rows, (r) => count(r.tagsN, (g) => listingsPerTag.get(g) === 1)),
    shareUnique: pct(sum(rows, (r) => count(r.tagsN, (g) => listingsPerTag.get(g) === 1)), allTags.length),
    tags3PlusWords: count(allTags, (g) => tokens(g).length >= 3),
    listingsWithNoUniqueTag: count(rows, (r) => r.tagsN.length && r.tagsN.every((g) => listingsPerTag.get(g) > 1)),
  },
  titleVsTagsVocab: vocabGaps,
};

// ---- materials -----------------------------------------------------------------------
const matsN = rows.flatMap((r) => r.l.materials.map((m) => m.toLowerCase().trim()));
const materials = {
  empty: count(rows, (r) => r.l.materials.length === 0),
  emptyByType: Object.fromEntries(tally(rows.filter((r) => !r.l.materials.length).map((r) => r.type))),
  perListing: quantiles(rows.map((r) => r.l.materials.length)),
  distinctRaw: new Set(rows.flatMap((r) => r.l.materials)).size,
  distinctCaseFolded: new Set(matsN).size,
  caseVariants: Object.entries(
    rows.flatMap((r) => r.l.materials).reduce((m, x) => ((m[x.toLowerCase()] ??= new Set()).add(x), m), {}),
  ).filter(([, s]) => s.size > 1).map(([k, s]) => ({ material: k, spellings: [...s] })),
  mostUsed: top(matsN, 20),
  frameListingsMentioningGlass: count(frames, (r) => r.l.materials.some((m) => /glass/i.test(m))),
  frameListingsMentioningMdf: count(frames, (r) => r.l.materials.some((m) => /mdf/i.test(m))),
  combinations: top(rows.map((r) => r.l.materials.map((m) => m.toLowerCase()).sort().join(', ') || '(none)'), 12),
};

// ---- taxonomy and sections -----------------------------------------------------------
const taxonomy = {
  paths: tally(rows.map((r) => r.l.taxonomyPath)).map(([path, n]) => ({ path, n })),
  byProductType: Object.fromEntries(
    [...byKey(rows, (r) => r.type)].map(([t, g]) => [t, Object.fromEntries(tally(g.map((r) => r.l.taxonomyPath.split(' > ').slice(-2).join(' > '))))]),
  ),
  framesInWeddingsCategory: {
    listings: count(frames, (r) => r.l.taxonomyPath.startsWith('Weddings')),
    whoseTitleIsNotWeddingOrEngagement: frames
      .filter((r) => r.l.taxonomyPath.startsWith('Weddings') && !/wedding|bride|groom|engage|marri|anniversary|proposal|husband|wife|couple|valentine/i.test(r.l.title))
      .map((r) => brief(r.l)),
  },
  weddingTitledFramesInHomeCategory: count(frames, (r) => r.l.taxonomyPath.startsWith('Home') && /wedding|engage|bride|groom/i.test(r.l.title)),
  oddPlacements: rows
    .filter((r) => /Pet Portraits|Digital Prints|Party Favors/.test(r.l.taxonomyPath))
    .map((r) => ({ ...brief(r.l), taxonomyPath: r.l.taxonomyPath, section: r.l.sectionTitle })),
  note: 'Depth and leaf status were not checked against the seller-taxonomy endpoint (no network in this script). "Picture Frames" is the deepest node in each frame path seen here.',
};

const sectionGroups = byKey(rows, (r) => r.l.sectionTitle ?? '(none)');
const sections = {
  count: sectionGroups.size,
  limit: 20,
  rows: [...sectionGroups]
    .map(([title, g]) => ({ section: title, ...engagement(g), favorers: sum(g, (r) => r.l.numFavorers), views: sum(g, (r) => r.l.views), topRecipients: top(g.map((r) => r.recipient ?? '-'), 4) }))
    .sort((a, b) => b.listings - a.listings),
  // A listing whose title intent (lineup-draft) points somewhere else than its section.
  sectionVsIntentMismatches: (() => {
    const expect = {
      'Grandparent Frames': /^(grandma|grandpa|grandparents|great-grandparent|grandparents-to-be)$/,
      'Grandpa/Papa/Pop': /^(grandpa|grandparents|great-grandparent)$/,
      'New Grandparent To Be': /^(grandparents-to-be|grandma|grandpa|grandparents)$/,
      'Godparent Frames': /^(godmother|godfather|godparents)$/,
      'Aunt & Uncle Frames': /^aunt-uncle$/,
      'Mom & Dad Frames': /^(mom|dad|parents-of-couple)$/,
      'Pet Frames': /^pet$/,
      'Teacher/Nanny/Coach': /^teacher-nanny-coach$/,
    };
    const out = rows.filter((r) => r.type === 'frame' && expect[r.l.sectionTitle] && r.recipient && !expect[r.l.sectionTitle].test(r.recipient));
    return { listings: out.length, examples: out.slice(0, 15).map((r) => ({ ...brief(r.l), section: r.l.sectionTitle, titleIntent: r.recipient })) };
  })(),
  singletonOrTiny: [...sectionGroups].filter(([, g]) => g.length <= 3).map(([t, g]) => ({ section: t, listings: g.length })),
};

// ---- attributes, personalisation, variations, prices ----------------------------------
const attributes = {
  present: false,
  note: 'The export has no listing properties (occasion, holiday, recipient, primary colour, orientation, frame material, etc.), no who_made/when_made, no style, and no shipping or processing data. Those need getListingProperties per listing, which the export does not call. Not audited.',
};

const instr = rows.filter((r) => r.l.isPersonalizable).map((r) => r.l.personalizationInstructions ?? '');
const personalization = {
  personalizable: count(rows, (r) => r.l.isPersonalizable),
  notPersonalizable: count(rows, (r) => !r.l.isPersonalizable),
  notPersonalizableByType: Object.fromEntries(tally(rows.filter((r) => !r.l.isPersonalizable).map((r) => r.type))),
  framesNotPersonalizable: rows.filter((r) => !r.l.isPersonalizable && ['frame', 'large-frame'].includes(r.type)).map((r) => brief(r.l)),
  required: count(rows, (r) => r.l.personalizationIsRequired),
  requiredListings: rows.filter((r) => r.l.personalizationIsRequired).map((r) => brief(r.l)),
  charMax: Object.fromEntries(tally(rows.filter((r) => r.l.isPersonalizable).map((r) => r.l.personalizationCharCountMax))),
  questionsPerListing: Object.fromEntries(tally(rows.map((r) => r.l.personalizationQuestions.length))),
  questionTypes: Object.fromEntries(tally(rows.flatMap((r) => r.l.personalizationQuestions.map((q) => `${q.type}: ${q.questionText}`)))),
  photoUploadQuestions: count(rows, (r) => r.l.personalizationQuestions.some((q) => q.maxFiles)),
  instructions: {
    distinctTexts: new Set(instr).size,
    length: quantiles(instr.map((s) => s.length)),
    mentionsColourChart: count(instr, (s) => /colou?r chart|#1 is|drop ?down/i.test(s)),
    mentionsSpellingCheck: count(instr, (s) => /spell/i.test(s)),
    asksForPhoto: count(instr, (s) => /photo|picture|image|upload|email/i.test(s)),
    mostCommon: top(instr, 6),
  },
};

const priceGroups = byKey(rows, (r) => r.type);
const framePriceGroups = byKey(frames, (r) => r.l.price);
const pricing = {
  note: 'price is the MINIMUM across variations (the export cannot read per-option prices without OAuth listings_r). Variation names and options are not in the export.',
  hasVariations: count(rows, (r) => r.l.hasVariations),
  noVariations: count(rows, (r) => !r.l.hasVariations),
  distinctPricePoints: new Set(rows.map((r) => r.l.price)).size,
  pricePoints: tally(rows.map((r) => r.l.price)).map(([price, n]) => ({ price, n })),
  byProductType: Object.fromEntries([...priceGroups].map(([t, g]) => [t, { listings: g.length, prices: Object.fromEntries(tally(g.map((r) => r.l.price))) }])),
  framesByPrice: [...framePriceGroups].map(([price, g]) => ({ price, ...engagement(g) })).sort((a, b) => b.listings - a.listings),
  framePriceByOriginalYear: Object.fromEntries(
    [...byKey(frames, (r) => r.l.originalCreatedAt.slice(0, 4))].sort().map(([y, g]) => [y, Object.fromEntries(tally(g.map((r) => r.l.price)))]),
  ),
  quantity: quantiles(rows.map((r) => r.l.quantity)),
};

// ---- images ---------------------------------------------------------------------------
const imgs = rows.flatMap((r) => r.l.images.map((i) => ({ ...i, listingId: r.l.listingId })));
const imageId = (u) => u.match(/il_fullxfull\.(\d+)_/)?.[1] ?? u;
const imageUse = tally(imgs.map((i) => imageId(i.url)));
const imageUseMap = new Map(imageUse);
const altTally = tally(imgs.filter((i) => i.alt).map((i) => i.alt));
const images = {
  limitNote: 'Etsy now accepts up to 20 photos per listing (the older limit was 10); 201 listings here have more than 10, so 20 is the effective cap. Video data is not in the export, so video use is unknown.',
  perListing: { quantiles: quantiles(rows.map((r) => r.l.images.length)), histogram: Object.fromEntries(tally(rows.map((r) => r.l.images.length)).sort((a, b) => a[0] - b[0])), under5: count(rows, (r) => r.l.images.length < 5), atLeast10: count(rows, (r) => r.l.images.length >= 10), at20: count(rows, (r) => r.l.images.length >= 20) },
  totalImages: imgs.length,
  distinctImages: imageUse.length,
  imagesReusedAcross10PlusListings: count(imageUse, ([, n]) => n >= 10),
  mostReused: imageUse.slice(0, 5).map(([id, listings]) => ({ imageId: id, listings })),
  alt: {
    withAlt: count(imgs, (i) => i.alt),
    withoutAlt: count(imgs, (i) => !i.alt),
    coveragePct: pct(count(imgs, (i) => i.alt), imgs.length),
    listingsWithNoAlt: count(rows, (r) => r.l.images.every((i) => !i.alt)),
    listingsWithAllAlt: count(rows, (r) => r.l.images.length && r.l.images.every((i) => i.alt)),
    primaryImageWithAlt: count(rows, (r) => r.l.images.find((i) => i.rank === 1)?.alt),
    distinctAltTexts: altTally.length,
    looksMachineGenerated: { n: count(imgs, (i) => i.alt && /^(a|an|two|three) [a-z]/.test(i.alt)), note: 'Lower-case caption starting "a ..." in the style of an automatic image captioner.' },
    machineAltByCaption: tally(imgs.filter((i) => i.alt && /^(a|an|two|three) [a-z]/.test(i.alt)).map((i) => `${i.alt} @ ${i.width}x${i.height} rank ${i.rank}`)).slice(0, 8).map(([k, n]) => ({ captionAtSizeAndRank: k, n })),
    machineAltOnSharedImages: {
      n: count(imgs, (i) => i.alt && /^(a|an|two|three) [a-z]/.test(i.alt) && (imageUseMap.get(imageId(i.url)) ?? 0) >= 10),
      note: 'Machine-style captions on images whose Etsy image id is reused by 10+ listings. Most captioned images are separate uploads of the same info cards (same size and rank), see machineAltByCaption.',
    },
    keywordStuffedAlt: { n: count(imgs, (i) => i.alt && i.alt.split(/\s+/).length >= 20), note: 'Alt text of 20+ words in title-case keyword strings.' },
    mostCommonAlt: altTally.slice(0, 10).map(([alt, n]) => ({ alt, n })),
  },
  primaryImage: {
    aspect: Object.fromEntries(tally(rows.map((r) => {
      const p = r.l.images.find((i) => i.rank === 1);
      if (!p) return 'none';
      const a = p.width / p.height;
      return a > 1.2 ? 'landscape' : a < 0.83 ? 'portrait' : 'square-ish';
    }))),
    shortestSideUnder1000: count(rows, (r) => { const p = r.l.images.find((i) => i.rank === 1); return p && Math.min(p.width, p.height) < 1000; }),
    widthUnder2000: count(rows, (r) => { const p = r.l.images.find((i) => i.rank === 1); return p && p.width < 2000; }),
  },
  imageCountVsEngagementFramesOnly: Object.fromEntries([...byKey(frames, (r) => (r.l.images.length < 8 ? '<8' : r.l.images.length < 11 ? '8-10' : r.l.images.length < 15 ? '11-14' : '15+'))].map(([k, g]) => [k, engagement(g)])),
};

// ---- descriptions (length and duplication only; text is not exported) -----------------
const descTally = tally(rows.map((r) => r.l.descriptionSha256));
const descriptions = {
  length: quantiles(rows.map((r) => r.l.descriptionLength)),
  distinct: descTally.length,
  sharedByMoreThanOne: count(descTally, ([, n]) => n > 1),
  listingsWithSharedDescription: sum(descTally.filter(([, n]) => n > 1), ([, n]) => n),
  largestGroup: descTally[0][1],
};

// ---- performance ------------------------------------------------------------------------
const favs = rows.map((r) => r.l.numFavorers).sort((a, b) => b - a);
const totalFav = sum(favs);
const totalViews = sum(rows, (r) => r.l.views);
const shareOfTop = (k) => pct(sum(favs.slice(0, k)), totalFav);
const viewsSorted = rows.map((r) => r.l.views).sort((a, b) => b - a);
const ESTABLISHED = 1; // years
const est = rows.filter((r) => r.ageYears >= ESTABLISHED);
const young = rows.filter((r) => r.ageYears < ESTABLISHED);
const LOW_VIEWS_PER_YEAR = 100;
const LOW_FAVS = 5;
const lowTail = est.filter((r) => r.viewsPerYear < LOW_VIEWS_PER_YEAR && r.l.numFavorers < LOW_FAVS);
const youngQuiet = young.filter((r) => r.l.views < 50);
const groupPerf = (f) =>
  [...byKey(rows, f)]
    .map(([k, g]) => ({ key: k, listings: g.length, favorers: sum(g, (r) => r.l.numFavorers), favShare: pct(sum(g, (r) => r.l.numFavorers), totalFav), views: sum(g, (r) => r.l.views), favPerView: round(sum(g, (r) => r.l.numFavorers) / Math.max(1, sum(g, (r) => r.l.views)), 4), favorersPerListing: round(sum(g, (r) => r.l.numFavorers) / g.length, 0), medianViewsPerYear: round(quantiles(g.map((r) => r.viewsPerYear)).median, 0) }))
    .sort((a, b) => b.favorers - a.favorers);
const performance = {
  note: 'views and numFavorers are LIFETIME counts since the listing was first created, not sales and not recent demand. Age uses originalCreatedAt; createdAt is reset by renewal (all 619 fall within the last ~4 months, the auto-renew cycle).',
  totals: { views: totalViews, favorers: totalFav, pooledFavPerView: round(totalFav / totalViews, 4) },
  views: quantiles(rows.map((r) => r.l.views)),
  favorers: quantiles(rows.map((r) => r.l.numFavorers)),
  viewsPerYear: quantiles(rows.map((r) => round(r.viewsPerYear, 0))),
  favPerView: quantiles(rows.filter((r) => r.l.views >= 200).map((r) => round(r.favPerView, 4))),
  ageYears: { quantiles: quantiles(rows.map((r) => round(r.ageYears, 1))), byOriginalYear: Object.fromEntries(tally(rows.map((r) => r.l.originalCreatedAt.slice(0, 4))).sort()) },
  renewedDates: { createdAtRange: [rows.map((r) => r.l.createdAt).sort()[0], rows.map((r) => r.l.createdAt).sort().at(-1)] },
  concentration: {
    top10ListingsFavShare: shareOfTop(10),
    top25ListingsFavShare: shareOfTop(25),
    top50ListingsFavShare: shareOfTop(50),
    top100ListingsFavShare: shareOfTop(100),
    top50ListingsViewShare: pct(sum(viewsSorted.slice(0, 50)), totalViews),
    listingsFor80PctFav: favs.findIndex((_, i) => sum(favs.slice(0, i + 1)) >= 0.8 * totalFav) + 1,
  },
  zeroFavorers: count(rows, (r) => r.l.numFavorers === 0),
  under10Favorers: count(rows, (r) => r.l.numFavorers < 10),
  under100Views: count(rows, (r) => r.l.views < 100),
  lowTail: {
    rule: `originalCreatedAt >= ${ESTABLISHED} year ago AND < ${LOW_VIEWS_PER_YEAR} lifetime views per year AND < ${LOW_FAVS} favourites`,
    listings: lowTail.length,
    byType: Object.fromEntries(tally(lowTail.map((r) => r.type))),
    bySection: Object.fromEntries(tally(lowTail.map((r) => r.l.sectionTitle))),
    inNearDuplicatePair: count(lowTail, (r) => listingsInNearPairs.has(r.l.listingId)),
    rows: lowTail.sort((a, b) => a.viewsPerYear - b.viewsPerYear).map((r) => ({ ...brief(r.l), ageYears: round(r.ageYears, 1), viewsPerYear: round(r.viewsPerYear, 0), pageKey: r.pageKey })),
  },
  youngQuiet: { rule: `originalCreatedAt < ${ESTABLISHED} year ago AND < 50 lifetime views`, listings: youngQuiet.length, ofYoung: young.length },
  topEngagement: rows.filter((r) => r.l.views >= 1000).sort((a, b) => b.favPerView - a.favPerView).slice(0, 10).map((r) => ({ ...brief(r.l), favPerView: round(r.favPerView, 4) })),
  bottomEngagement: rows.filter((r) => r.l.views >= 1000).sort((a, b) => a.favPerView - b.favPerView).slice(0, 10).map((r) => ({ ...brief(r.l), favPerView: round(r.favPerView, 4) })),
  top20Listings: [...rows].sort((a, b) => b.l.numFavorers - a.l.numFavorers).slice(0, 20).map((r) => ({ ...brief(r.l), ageYears: round(r.ageYears, 1), favPerView: round(r.favPerView, 4), titleWords: r.titleWords, pageKey: r.pageKey })),
  byProductType: groupPerf((r) => r.type),
  byRecipient: groupPerf((r) => (r.type === 'frame' ? r.recipient : `(${r.type})`)),
  byOccasion: groupPerf((r) => (r.type === 'frame' ? r.occasion : `(${r.type})`)),
  byPage: groupPerf((r) => r.pageKey).slice(0, 25),
  bySection: groupPerf((r) => r.l.sectionTitle),
  cohorts: (() => {
    const split = (r) => (r.l.originalCreatedAt < '2022' ? '2015-2021' : '2022-2026');
    return Object.fromEntries(groupPerf(split).map((g) => [g.key, g]));
  })(),
  // Listings created in 2025-2026 that sit on a page which already has an older listing
  // with 100+ favourites: likely competing with the shop's own established listing.
  recentOnEstablishedPage: (() => {
    const recent = rows.filter((r) => r.l.originalCreatedAt >= '2025' && r.pageKey);
    const strong = new Set(rows.filter((r) => r.l.originalCreatedAt < '2025' && r.l.numFavorers >= 100).map((r) => r.pageKey));
    const hit = recent.filter((r) => strong.has(r.pageKey));
    return { recentListings: recent.length, onPageWithEstablishedListing: hit.length, theirFavorers: sum(hit, (r) => r.l.numFavorers), medianViews: quantiles(hit.map((r) => r.l.views))?.median ?? null };
  })(),
  byOriginalYear: groupPerf((r) => r.l.originalCreatedAt.slice(0, 4)).sort((a, b) => a.key.localeCompare(b.key)),
};

// ---- per-listing flags (the work list a later fix loop could read) ---------------------
const listingRows = rows.map((r) => ({
  listingId: r.l.listingId,
  title: r.l.title,
  productType: r.type,
  pageKey: r.pageKey,
  section: r.l.sectionTitle,
  views: r.l.views,
  numFavorers: r.l.numFavorers,
  ageYears: round(r.ageYears, 1),
  viewsPerYear: round(r.viewsPerYear, 0),
  favPerView: round(r.favPerView, 4),
  titleChars: r.titleLen,
  titleWords: r.titleWords,
  tagCount: r.l.tags.length,
  tagsVerbatimInTitle: r.tagInTitle.length,
  tagsShared25Plus: count(r.tagsN, (g) => listingsPerTag.get(g) >= SHARED_MIN),
  images: r.l.images.length,
  imagesWithAlt: count(r.l.images, (i) => i.alt),
  materials: r.l.materials.length,
  flags: [
    r.titleWords > 15 && 'title-over-15-words',
    r.doubleSpaces && 'title-double-spaces',
    r.repeated.some((x) => x.n >= 3) && 'title-word-3x',
    !first40NamesRecipient(r) && !first40NamesOccasion(r) && 'first40-no-recipient-or-occasion',
    listingsInNearPairs.has(r.l.listingId) && 'near-duplicate-title',
    r.l.tags.length < 13 && 'tags-under-13',
    r.tagInTitle.length >= 5 && 'tags-5plus-repeat-title',
    r.tagDupes > 0 && 'tags-duplicate',
    !r.l.materials.length && 'materials-empty',
    r.l.images.every((i) => !i.alt) && 'alt-none',
    lowTail.includes(r) && 'low-tail',
    !r.l.isPersonalizable && ['frame', 'large-frame'].includes(r.type) && 'frame-not-personalizable',
  ].filter(Boolean),
}));
const flagCounts = Object.fromEntries(tally(listingRows.flatMap((r) => r.flags)));

const audit = {
  _schema: {
    description: 'Read-only audit of Etsy listing metadata, from plans/etsy-listings.json and plans/clusters.json. Produced by scripts/etsy-metadata-audit.mjs. Nothing here is applied automatically.',
    caveat: 'views/numFavorers are lifetime, not sales. Listing properties (attributes), variations, video, shipping and descriptions text are not in the export.',
    listings: 'one row per listing with counts and flags; a fix loop would read its work list from here.',
  },
  generatedAt: new Date().toISOString(),
  source: { file: 'plans/etsy-listings.json', exportGeneratedAt: etsy.generatedAt ?? null, listings: N, shop: etsy.shop },
  productTypes: Object.fromEntries(tally(rows.map((r) => r.type))),
  titles,
  tags,
  materials,
  taxonomy,
  sections,
  attributes,
  personalization,
  pricing,
  images,
  descriptions,
  performance,
  flagCounts,
  listings: listingRows,
};
await write('etsy-metadata-audit.json', audit);

console.log(`etsy-metadata-audit: ${N} listings`);
console.log(`  titles: median ${titles.charLength.quantiles.median} chars / ${titles.wordCount.quantiles.median} words, ${titles.wordCount.over15Words} over 15 words, ${nearPairs.length} near-duplicate pairs`);
console.log(`  tags: ${tags.using13} use all 13, ${tags.distinctTags} distinct, ${tags.repeatsTitle.shareOfTagUses}% repeat the title verbatim, ${tags.selfCompetition.share}% shared by ${SHARED_MIN}+ listings`);
console.log(`  images: ${images.alt.coveragePct}% alt coverage; materials empty on ${materials.empty}`);
console.log(`  performance: top 50 listings hold ${performance.concentration.top50ListingsFavShare}% of favourites; low tail ${lowTail.length}`);
console.log(`  flags: ${JSON.stringify(flagCounts)}`);

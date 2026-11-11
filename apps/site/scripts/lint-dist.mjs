// Checks what the content schemas cannot see: the HTML a crawler receives.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { toLabel } from '../src/catalog/check.ts';

const DIST = new URL('../dist/', import.meta.url).pathname;
const MAX_TITLE = 60;

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => {
      const path = join(dir, e.name);
      if (e.isDirectory()) return htmlFiles(path);
      return e.name.endsWith('.html') ? [path] : [];
    }),
  );
  return nested.flat();
}

const labelFailures = new Set();
const count = (html, re) => (html.match(re) ?? []).length;

// Labels (buttons and button-styled links, menu and footer links, form labels, filter chips,
// product and category names) are Title Case and write "and" as "&" (owner, 2026-11-11).
// One rule for the storefront and the admin: toLabel in src/catalog/check.ts. Wording ideas
// are the customer's words, so they aren't checked.
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
// A tag, with quoted attributes that may hold ">" (class names like [&>svg]).
const TAG = /<(?:[^>"']|"[^"]*"|'[^']*')*>/g;
const plain = (inner) =>
  decode(inner.replace(/<span class="sr-only">[\s\S]*?<\/span>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(TAG, ' '))
    .replace(/\s+/g, ' ')
    .trim();
export function labelProblem(label) {
  const want = toLabel(label);
  return want === label ? null : `"${label}" should read "${want}"`;
}
function labels(html) {
  const out = [];
  const attrs = String.raw`((?:[^>"']|"[^"]*"|'[^']*')*)`;
  for (const m of html.matchAll(new RegExp(String.raw`<button\b${attrs}>([\s\S]*?)<\/button>`, 'g'))) if (!/\sdata-idea=/.test(m[1])) out.push(plain(m[2]));
  for (const m of html.matchAll(new RegExp(String.raw`<(label|legend|summary)\b${attrs}>([\s\S]*?)<\/\1>`, 'g'))) out.push(plain(m[3]));
  for (const m of html.matchAll(new RegExp(String.raw`<a\b${attrs}>([\s\S]*?)<\/a>`, 'g'))) {
    if (/class="(?:[^"]*\s)?(?:group\/button|button)\b/.test(m[1])) out.push(plain(m[2]));
  }
  for (const block of html.matchAll(/<(nav|footer)\b[\s\S]*?<\/\1>/g)) {
    for (const m of block[0].matchAll(new RegExp(String.raw`<a\b${attrs}>([\s\S]*?)<\/a>`, 'g'))) out.push(plain(m[2]));
  }
  return out.filter(Boolean);
}

const rules = [
  ['has <html lang>', (html) => /<html[^>]*\slang="[a-z-]+"/i.test(html)],
  ['exactly one <title>', (html) => count(html, /<title>/gi) === 1],
  [`<title> at most ${MAX_TITLE} chars`, (html) => (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '').length <= MAX_TITLE],
  ['one meta description', (html) => count(html, /<meta name="description" content="[^"]+"/gi) === 1],
  ['one canonical', (html, file) => file === '404.html' || count(html, /<link rel="canonical"/gi) === 1],
  // Pages are served without .html (build.format 'file'); the canonical must match.
  ['canonical and og:url have no .html', (html) => !/<link rel="canonical" href="[^"]*\.html"/.test(html) && !/<meta property="og:url" content="[^"]*\.html"/.test(html)],
  ['meta description at most 160 chars', (html) => (html.match(/<meta name="description" content="([^"]*)"/i)?.[1] ?? '').length <= 160],
  // Merchant listings need a product image; link previews need og:image.
  ['product page: og:image and Product markup image', (html, file) => !file.startsWith('products/') || (/<meta property="og:image" content="https:/.test(html) && /"@type":"Product"[^<]*"image":\["https:/.test(html))],
  ['product page: one h1', (html, file) => !file.startsWith('products/') || count(html, /<h1[\s>]/gi) === 1],
  ['labels are Title Case with &', (html, file) => {
    const bad = labels(html).map(labelProblem).find(Boolean);
    if (bad) labelFailures.add(`${file}: ${bad}`);
    return !bad;
  }],
];

const files = await htmlFiles(DIST);
if (files.length === 0) {
  console.error(`lint-dist: no HTML in ${DIST}`);
  process.exit(1);
}

const failures = [];
for (const path of files) {
  const file = relative(DIST, path);
  const html = await readFile(path, 'utf8');
  for (const [name, ok] of rules) {
    if (!ok(html, file)) failures.push(`${file}: ${name}`);
  }
}

if (failures.length > 0) {
  console.error(`lint-dist: ${failures.length} failure(s)\n${failures.join('\n')}`);
  if (labelFailures.size) console.error([...labelFailures].slice(0, 20).join('\n'));
  process.exit(1);
}
console.log(`lint-dist: ${files.length} page(s) pass ${rules.length} rules`);

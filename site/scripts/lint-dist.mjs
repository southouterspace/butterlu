// Checks what the content schemas cannot see: the HTML a crawler receives.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

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

const count = (html, re) => (html.match(re) ?? []).length;

const rules = [
  ['has <html lang>', (html) => /<html[^>]*\slang="[a-z-]+"/i.test(html)],
  ['exactly one <title>', (html) => count(html, /<title>/gi) === 1],
  [`<title> at most ${MAX_TITLE} chars`, (html) => (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '').length <= MAX_TITLE],
  ['one meta description', (html) => count(html, /<meta name="description" content="[^"]+"/gi) === 1],
  ['one canonical', (html, file) => file === '404.html' || count(html, /<link rel="canonical"/gi) === 1],
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
  process.exit(1);
}
console.log(`lint-dist: ${files.length} page(s) pass ${rules.length} rules`);

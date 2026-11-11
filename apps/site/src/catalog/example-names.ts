// Stand-ins in our designs' words and wording ideas: names ("Love, Ava and Noah") and
// years ("Coming 2027"). The editor marks a side that still holds the words we put
// there, so shoppers see what to swap for their own; the mark goes at their first
// change to that side, so a shopper whose child really is Ava isn't nagged. The product
// page says so beside Add to Cart as Shown. Add a name here when a new design or idea
// uses one. Plain TypeScript: the editor script bundles it.
export const EXAMPLE_NAMES = [
  'Alex', 'Ava', 'Bear', 'Bella', 'Buddy', 'Carter', 'Carters', 'Charlie', 'Cooper', 'Daisy', 'Emma', 'Jake', 'James',
  'Jess', 'Jordan', 'Lucas', 'Luis', 'Luna', 'Maria', 'Mateo', 'Max', 'Mia', 'Mike', 'Noah', 'Riley', 'Sam',
  'Sofía', 'Zoe',
] as const;

// Where a listed name is an ordinary word, not a name.
const NOT_NAMES = [/Little Buddy/g, /Buddy by Choice/g];
const NAME = new RegExp(`(?<!\\p{L})(?:${EXAMPLE_NAMES.join('|')})(?!\\p{L})`, 'u');
const YEAR = /(?<!\d)20\d\d(?!\d)/;

/** True when the words hold a stand-in name ("Mike’s" counts; "Maxine" doesn't). */
export const hasExampleName = (text: string) => NAME.test(NOT_NAMES.reduce((t, re) => t.replace(re, ''), text));

/** The note for words we wrote, or '' when they hold nothing to swap. */
export function standInNote(text: string): string {
  const name = hasExampleName(text);
  const year = YEAR.test(text);
  if (name && year) return 'Example names and year: swap in yours.';
  if (name) return 'Example names: swap in yours.';
  if (year) return 'Example year: swap in yours.';
  return '';
}

/** What the product page says beside Add to Cart as Shown, or '' for a design with no stand-ins. */
export function asShownNote(texts: string[]): string {
  const name = texts.some(hasExampleName);
  const year = texts.some((t) => YEAR.test(t));
  if (name && year) return 'As shown, it prints the example names and year.';
  if (name) return 'As shown, it prints the example names.';
  if (year) return 'As shown, it prints the example year.';
  return '';
}

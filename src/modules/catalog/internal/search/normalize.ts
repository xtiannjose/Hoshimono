import { SYNONYM_GROUPS } from "./synonyms";

const MAX_QUERY_LENGTH = 100;
const MAX_TERMS = 8;
const MAX_TERM_LENGTH = 40;

/** Lowercase, accent-free words of a query. Only [a-z0-9] survive. */
export function normalizeTerms(query: string): string[] {
  return (
    query
      .slice(0, MAX_QUERY_LENGTH)
      .normalize("NFKD") // also folds ligatures and full-width letters to ASCII
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      // "1.5 kg" and "1/2 kilo" stay one number, so they read as one size.
      .replace(/(\d)[.,/](?=\d)/g, "$1")
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .slice(0, MAX_TERMS)
      .map((t) => t.slice(0, MAX_TERM_LENGTH))
  );
}

const UNIT_WORDS = new Set([
  "g",
  "gm",
  "gram",
  "grams",
  "kg",
  "kilo",
  "kilos",
  "ml",
  "l",
  "ltr",
  "liter",
  "liters",
  "litre",
  "litres",
  "pc",
  "pcs",
  "piece",
  "pieces",
  "pack",
  "packs",
  "dozen",
  "doz",
]);
// "5kg", "1l", "12pcs", and egg-tray sizes such as "30s".
const SIZE = /^\d+(?:g|gm|kg|ml|l|ltr|pcs?|s)$/;

/**
 * Search words without pack sizes: "rice 5kg" and "12 pcs eggs" search for
 * the Product, not the size. A number counts as a size only when a unit
 * follows it, so "3 in 1" keeps its numbers. Keeps everything if nothing
 * else would remain.
 */
export function searchTerms(query: string): string[] {
  const terms = normalizeTerms(query);
  const kept = terms.filter((t, i) => {
    if (SIZE.test(t) || UNIT_WORDS.has(t)) return false;
    const next = terms[i + 1];
    return !(
      /^\d+$/.test(t) &&
      next !== undefined &&
      (UNIT_WORDS.has(next) || SIZE.test(next))
    );
  });
  return kept.length > 0 ? kept : terms;
}

const groupsByWord = new Map<string, readonly string[]>();
for (const group of SYNONYM_GROUPS) {
  for (const member of group) {
    if (!member.includes(" ")) groupsByWord.set(member, group);
  }
}

/** Every word in the synonym list, so a Filipino word is never "corrected" away. */
export const SYNONYM_WORDS: ReadonlySet<string> = new Set(
  SYNONYM_GROUPS.flat().flatMap((m) => m.split(" "))
);

const SYNONYM_GROUP_LIST: readonly (readonly string[])[] = SYNONYM_GROUPS;

// Two-word synonyms ("bitter gourd"), longest first.
const PHRASES = SYNONYM_GROUPS.flatMap((group) =>
  group
    .filter((m) => m.includes(" "))
    .map((m) => ({ member: m, words: m.split(" "), group }))
).sort((a, b) => b.words.length - a.words.length);

/** One synonym, written for tsquery: phrases join with <->, never a prefix. */
function exactly(member: string): string {
  return member.split(" ").join(" <-> ");
}

function clause(options: Iterable<string>): string {
  return `(${[...new Set(options)].join(" | ")})`;
}

function termClause(term: string, prefix: boolean, typing: boolean): string {
  const star = prefix ? ":*" : "";
  const options = [`${term}${star}`];
  // Postgres reads the "1" in "3-in-1" as the signed number "-1".
  if (/^\d+$/.test(term)) options.push(`'-${term}'${star}`);
  const groups = new Set<readonly string[]>();
  const own = groupsByWord.get(term);
  if (own) groups.add(own);
  if (typing && !own && term.length >= 4) {
    for (const group of SYNONYM_GROUP_LIST) {
      const words = group.flatMap((m) => m.split(" "));
      if (words.some((w) => w.startsWith(term))) groups.add(group);
    }
  }
  for (const group of groups) {
    for (const member of group)
      if (member !== term) options.push(exactly(member));
  }
  return clause(options);
}

/**
 * A Postgres tsquery. Every term must match. The words the Customer typed
 * match as prefixes (`prefix: true`) so results appear while typing;
 * synonyms match only as whole words, so "itlog" finds eggs, not Eggplant.
 * Consecutive words that spell a two-word synonym ("bitter gourd") match
 * as one phrase or its synonyms ("ampalaya"). The last typed word also
 * brings in synonym groups whose words it starts, so "gata" finds milk.
 * Input words are [a-z0-9] only, so the string is always valid tsquery.
 */
export function toTsQuery(
  terms: string[],
  { prefix, any = false }: { prefix: boolean; any?: boolean }
): string {
  const clauses: string[] = [];
  for (let i = 0; i < terms.length;) {
    const phrase = PHRASES.find(({ words }) =>
      words.every((w, k) => terms[i + k] === w)
    );
    if (phrase) {
      const typed = phrase.words
        .map((w, k) => (prefix && k === phrase.words.length - 1 ? `${w}:*` : w))
        .join(" <-> ");
      clauses.push(
        clause([
          typed,
          ...phrase.group.filter((m) => m !== phrase.member).map(exactly),
        ])
      );
      i += phrase.words.length;
      continue;
    }
    clauses.push(
      termClause(terms[i], prefix, prefix && i === terms.length - 1)
    );
    i++;
  }
  // `any`: at least one term, used only to narrow candidates with the index.
  return clauses.join(any ? " | " : " & ");
}

/**
 * Optimal string alignment distance (a swap of neighbours counts as one
 * edit), or `limit + 1` as soon as the distance must exceed `limit`. Uses
 * three reused rows, so cost stays small across a whole vocabulary.
 */
export function editDistanceWithin(
  a: string,
  b: string,
  limit: number
): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const width = b.length + 1;
  let before = new Int32Array(width);
  let previous = new Int32Array(width);
  let current = new Int32Array(width);
  for (let j = 0; j < width; j++) previous[j] = j;
  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let d = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
      if (
        i > 1 &&
        j > 1 &&
        a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
        a.charCodeAt(i - 2) === b.charCodeAt(j - 1)
      ) {
        d = Math.min(d, before[j - 2] + 1);
      }
      current[j] = d;
      if (d < rowMin) rowMin = d;
    }
    if (rowMin > limit) return limit + 1;
    [before, previous, current] = [previous, current, before];
  }
  return Math.min(previous[b.length], limit + 1);
}

/** True when `a` and `b` differ only by one swap of neighbouring letters. */
function isOneSwap(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const diff: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push(i);
  return (
    diff.length === 2 &&
    diff[1] === diff[0] + 1 &&
    a[diff[0]] === b[diff[1]] &&
    a[diff[1]] === b[diff[0]]
  );
}

/**
 * How far a typo may be from the word it means. Words of 4 letters or fewer
 * only forgive a swap ("mlik"), because one edit turns "ham" into "jam".
 */
function allowedEdits(length: number): number {
  return length <= 8 ? 1 : 2;
}

/**
 * The closest catalogue word to a term the catalogue does not know.
 * `vocabulary` maps each word to how many Products use it; ties go to the
 * more common word, then alphabetical order, so results are stable.
 */
export function correctTerm(
  term: string,
  vocabulary: ReadonlyMap<string, number>
): string {
  if (term.length < 3 || /^\d+$/.test(term) || vocabulary.has(term))
    return term;
  // Still being typed: some Product word starts with it.
  for (const [word, uses] of vocabulary) {
    if (uses > 0 && word.startsWith(term)) return term;
  }

  const limit = allowedEdits(term.length);
  let best: { word: string; distance: number; uses: number } | null = null;
  for (const [word, uses] of vocabulary) {
    const distance = editDistanceWithin(term, word, limit);
    if (distance > limit) continue;
    if (term.length <= 4 && !isOneSwap(term, word)) continue;
    if (
      !best ||
      distance < best.distance ||
      (distance === best.distance && uses > best.uses) ||
      (distance === best.distance && uses === best.uses && word < best.word)
    ) {
      best = { word, distance, uses };
    }
  }
  return best?.word ?? term;
}

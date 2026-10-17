import { SYNONYM_GROUPS } from "./synonyms";

const MAX_QUERY_LENGTH = 100;
const MAX_TERMS = 8;
const MAX_TERM_LENGTH = 40;

/** Lowercase, accent-free words of a query. Only [a-z0-9] survive. */
export function normalizeTerms(query: string): string[] {
  return query
    .slice(0, MAX_QUERY_LENGTH)
    .normalize("NFKD") // also folds ligatures and full-width letters to ASCII
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, MAX_TERMS)
    .map((t) => t.slice(0, MAX_TERM_LENGTH));
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
]);
const SIZE = /^\d+(?:g|gm|kg|ml|l|ltr|pcs?)$/;

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

/** One synonym, written for tsquery: phrases join with <->, never a prefix. */
function exactly(member: string): string {
  return member.split(" ").join(" <-> ");
}

/**
 * A Postgres tsquery. Every term must match. The word the Customer typed
 * matches as a prefix (`prefix: true`) so results appear while typing;
 * synonyms match only as whole words, so "itlog" finds eggs, not Eggplant.
 * The last typed word also brings in synonym groups whose words it starts,
 * so "gata" already finds milk. Input words are [a-z0-9] only.
 */
export function toTsQuery(
  terms: string[],
  { prefix }: { prefix: boolean }
): string {
  return terms
    .map((term, index) => {
      const options = new Set<string>([prefix ? `${term}:*` : term]);
      const groups = new Set<readonly string[]>();
      const own = groupsByWord.get(term);
      if (own) groups.add(own);
      const typing = prefix && index === terms.length - 1;
      if (typing && !own && term.length >= 4) {
        for (const group of SYNONYM_GROUP_LIST) {
          const words = group.flatMap((m) => m.split(" "));
          if (words.some((w) => w.startsWith(term))) groups.add(group);
        }
      }
      for (const group of groups) {
        for (const member of group)
          if (member !== term) options.add(exactly(member));
      }
      return `(${[...options].join(" | ")})`;
    })
    .join(" & ");
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

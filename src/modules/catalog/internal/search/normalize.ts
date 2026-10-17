import { SYNONYM_GROUPS } from "./synonyms";

const MAX_QUERY_LENGTH = 100;
const MAX_TERMS = 8;
const MAX_TERM_LENGTH = 40;

/** Lowercase, accent-free words of a query. Only [a-z0-9] survive. */
export function normalizeTerms(query: string): string[] {
  return query
    .slice(0, MAX_QUERY_LENGTH)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, MAX_TERMS)
    .map((t) => t.slice(0, MAX_TERM_LENGTH));
}

const groupsByWord = new Map<string, string[][]>();
for (const group of SYNONYM_GROUPS) {
  const phrases = group.map((member) => member.split(" "));
  for (const member of group) {
    if (!member.includes(" ")) groupsByWord.set(member, phrases);
  }
}

/** Every word in the synonym list, so a Filipino word is never "corrected". */
export const SYNONYM_WORDS: ReadonlySet<string> = new Set(
  SYNONYM_GROUPS.flat().flatMap((m) => m.split(" "))
);

/** The term itself plus its synonyms, each as a list of words. */
function alternatives(term: string): string[][] {
  return groupsByWord.get(term) ?? [[term]];
}

/**
 * A Postgres tsquery: every term must match, each term matches itself or a
 * synonym, and the last word of each alternative matches as a prefix so
 * results appear while the Customer types. Input words are [a-z0-9] only.
 */
export function toTsQuery(terms: string[]): string {
  return terms
    .map((term) => {
      const options = alternatives(term).map((words) =>
        words
          .map((w, i) => (i === words.length - 1 ? `${w}:*` : w))
          .join(" <-> ")
      );
      return `(${options.join(" | ")})`;
    })
    .join(" & ");
}

/** Optimal string alignment distance: one swap of neighbours counts as one edit. */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) =>
      i === 0 ? j : j === 0 ? i : 0
    )
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Short words get one edit, longer words two, very short words none. */
function maxEdits(length: number): number {
  return length <= 2 ? 0 : length <= 5 ? 1 : 2;
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
  if (vocabulary.has(term)) return term;
  for (const word of vocabulary.keys()) if (word.startsWith(term)) return term;

  const limit = maxEdits(term.length);
  let best: { word: string; distance: number; uses: number } | null = null;
  for (const [word, uses] of vocabulary) {
    if (Math.abs(word.length - term.length) > limit) continue;
    const distance = editDistance(term, word);
    if (distance > limit) continue;
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

import type { ContentStatus } from "@/generated/prisma/enums";
import type { Client } from "@/lib/db";
import { slugify } from "@/lib/slug";

export type FieldErrors = Record<string, string>;

/** A form result (ADR 0009): the saved row, or an error per field. */
export type SaveResult =
  { ok: true; id: string; slug: string } | { ok: false; errors: FieldErrors };

export type { ContentStatus };

/** A refusal naming one field. */
export const refused = (field: string, message: string): SaveResult => ({
  ok: false,
  errors: { [field]: message },
});

export const MAX_TITLE = 120;
export const MAX_TEXT = 2000;

/** Trimmed, blank entries dropped. */
export const filled = (items: string[]) =>
  items.map((s) => s.trim()).filter(Boolean);

export const wholeIn = (n: number, min: number, max: number) =>
  Number.isInteger(n) && n >= min && n <= max;

/**
 * A slug made once from the title, unique in its table: "chicken-adobo",
 * then "chicken-adobo-2". It never changes afterwards, so links keep working.
 */
export async function uniqueSlug(
  title: string,
  fallback: string,
  /** Slugs in use that start with `base`. */
  startingWith: (base: string) => Promise<string[]>
): Promise<string> {
  const base = slugify(title).slice(0, 80) || fallback;
  const used = new Set(await startingWith(base));
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** Published keeps the first publishing time; going back to draft keeps it too. */
export function publishedAt(
  status: ContentStatus,
  before: Date | null | undefined
): Date | null {
  return status === "published" ? (before ?? new Date()) : (before ?? null);
}

export type { Client };

import { en } from "@/i18n/en";
import { fil } from "@/i18n/fil";
import type { Lang } from "@/i18n/lang";

// Store UTC, show Asia/Manila (CLAUDE.md). Manila has no daylight saving.
const ZONE = "Asia/Manila";

const WORDS = { en: en.dates, fil: fil.dates };
const LOCALE = { en: "en-PH", fil: "fil-PH" };

/** `date` moved by `minutes`; negative goes back. */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** `date` moved by whole 24-hour days; safe because Manila has no DST. */
export function addDays(date: Date, days: number): Date {
  return addMinutes(date, days * 24 * 60);
}

/** "2026-10-19": the Manila calendar date of an instant. */
export function manilaDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const time = new Intl.DateTimeFormat("en-PH", {
  timeZone: ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const parts = (
  date: Date,
  options: Intl.DateTimeFormatOptions,
  lang: Lang = "en"
) => {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: ZONE,
    ...options,
  }).formatToParts(date)) {
    out[p.type] = p.value;
  }
  return out;
};

/** "Thu, 22 Oct" ("Huw, 22 Okt"): day before month (docs/05 section 8). */
function dayLabel(date: Date, lang: Lang): string {
  const p = parts(
    date,
    { weekday: "short", day: "numeric", month: "short" },
    lang
  );
  return `${p.weekday}, ${p.day} ${p.month}`;
}

function dayName(date: Date, now: Date, lang: Lang): string {
  const target = manilaDate(date);
  if (target === manilaDate(now)) return WORDS[lang].today;
  if (target === manilaDate(addDays(now, 1))) {
    return WORDS[lang].tomorrow;
  }
  return dayLabel(date, lang);
}

const clock = (date: Date) =>
  time
    .format(date)
    .replace(/\s?([AP]M)$/i, " $1")
    .toUpperCase();

/** "4:12 PM" in Manila. */
export function formatTime(date: Date): string {
  return clock(date);
}

/** { day: "Today", time: "2:00 to 4:00 PM" }, for layouts that show them apart. */
export function slotParts(
  startsAt: Date,
  endsAt: Date,
  now = new Date(),
  lang: Lang = "en"
): { day: string; time: string } {
  const start = clock(startsAt);
  const end = clock(endsAt);
  const sameHalf = start.slice(-2) === end.slice(-2);
  return {
    day: dayName(startsAt, now, lang),
    time: `${sameHalf ? start.slice(0, -3) : start} ${WORDS[lang].to} ${end}`,
  };
}

/** "Today, 2:00 to 4:00 PM" or "Thu, 22 Oct, 8:00 to 10:00 AM". */
export function formatSlot(
  startsAt: Date,
  endsAt: Date,
  now = new Date(),
  lang: Lang = "en"
): string {
  const { day, time } = slotParts(startsAt, endsAt, now, lang);
  return `${day}, ${time}`;
}

/** "21 Oct 2026", in Manila. */
export function formatDate(date: Date, lang: Lang = "en"): string {
  const p = parts(
    date,
    { day: "numeric", month: "short", year: "numeric" },
    lang
  );
  return `${p.day} ${p.month} ${p.year}`;
}

/** "19 Oct 2026, 4:05 PM" in Manila. */
export function formatDateTime(date: Date, lang: Lang = "en"): string {
  return `${formatDate(date, lang)}, ${clock(date)}`;
}

/** Day names by JavaScript weekday number (0 is Sunday), as Slot templates store them. */
export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** "2026-10-21T08:00" in Manila, for an <input type="datetime-local">. */
export function toManilaInput(date: Date): string {
  return new Date(date.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 16);
}

/** The instant a datetime-local value means in Manila; Invalid Date if it is not one. */
export function fromManilaInput(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? new Date(`${value}:00+08:00`)
    : new Date(Number.NaN);
}

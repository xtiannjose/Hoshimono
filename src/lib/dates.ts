// Store UTC, show Asia/Manila (CLAUDE.md). Manila has no daylight saving.
const ZONE = "Asia/Manila";

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

const day = new Intl.DateTimeFormat("en-PH", {
  timeZone: ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});

function dayName(date: Date, now: Date): string {
  const target = manilaDate(date);
  if (target === manilaDate(now)) return "Today";
  if (target === manilaDate(new Date(now.getTime() + 86_400_000))) {
    return "Tomorrow";
  }
  return day.format(date);
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

/** "Today, 2:00 to 4:00 PM" or "Thu, Oct 22, 8:00 to 10:00 AM". */
export function formatSlot(
  startsAt: Date,
  endsAt: Date,
  now = new Date()
): string {
  const start = clock(startsAt);
  const end = clock(endsAt);
  const sameHalf = start.slice(-2) === end.slice(-2);
  return `${dayName(startsAt, now)}, ${sameHalf ? start.slice(0, -3) : start} to ${end}`;
}

/** "Oct 19, 2026, 4:05 PM" in Manila. */
export function formatDateTime(date: Date): string {
  const d = new Intl.DateTimeFormat("en-PH", {
    timeZone: ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  return `${d}, ${clock(date)}`;
}

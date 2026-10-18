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

const parts = (date: Date, options: Intl.DateTimeFormatOptions) => {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-PH", {
    timeZone: ZONE,
    ...options,
  }).formatToParts(date)) {
    out[p.type] = p.value;
  }
  return out;
};

/** "Thu, 22 Oct": day before month (docs/05 section 8). */
function dayLabel(date: Date): string {
  const p = parts(date, { weekday: "short", day: "numeric", month: "short" });
  return `${p.weekday}, ${p.day} ${p.month}`;
}

function dayName(date: Date, now: Date): string {
  const target = manilaDate(date);
  if (target === manilaDate(now)) return "Today";
  if (target === manilaDate(new Date(now.getTime() + 86_400_000))) {
    return "Tomorrow";
  }
  return dayLabel(date);
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

/** "Today, 2:00 to 4:00 PM" or "Thu, 22 Oct, 8:00 to 10:00 AM". */
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

/** "19 Oct 2026, 4:05 PM" in Manila. */
export function formatDateTime(date: Date): string {
  const p = parts(date, { day: "numeric", month: "short", year: "numeric" });
  return `${p.day} ${p.month} ${p.year}, ${clock(date)}`;
}

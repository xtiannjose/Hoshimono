import { formatDate } from "@/lib/dates";

/** "Running", "Starts 25 Oct", "Ended" or "Off", for staff lists. */
export function offerStatus(
  o: { isActive: boolean; startsAt: Date; endsAt: Date },
  now: Date
): { label: string; tone: "on" | "soon" | "off" } {
  if (!o.isActive) return { label: "Off", tone: "off" };
  if (now < o.startsAt)
    return { label: `Starts ${formatDate(o.startsAt)}`, tone: "soon" };
  if (now >= o.endsAt) return { label: "Ended", tone: "off" };
  return { label: `Running to ${formatDate(o.endsAt)}`, tone: "on" };
}

export const TONE = {
  on: "bg-accent-soft text-foreground",
  soon: "bg-warn-soft text-warn",
  off: "bg-muted text-muted-foreground",
} as const;

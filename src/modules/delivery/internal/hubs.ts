import { db } from "@/lib/db";

// shortcut: one Hub at launch (PRD assumptions). A Customer's Zone names
// their Hub; guests, before an address, use the active one.
/** The active Hub, or null before any Hub is set up (a fresh database). */
export async function getDefaultHubId(): Promise<string | null> {
  const hub = await db.hub.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return hub?.id ?? null;
}

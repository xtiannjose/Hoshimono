import { db } from "@/lib/db";

// shortcut: one Hub at launch (PRD assumptions). Batch 2.3 resolves the Hub
// from the Customer's Zone; until then everything uses the active Hub.
/** The active Hub, or null before any Hub is set up (a fresh database). */
export async function getDefaultHubId(): Promise<string | null> {
  const hub = await db.hub.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return hub?.id ?? null;
}

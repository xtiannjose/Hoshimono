import { db } from "@/lib/db";

// shortcut: one Hub at launch (PRD assumptions). Batch 2.3 resolves the Hub
// from the Customer's Zone; until then everything uses the active Hub.
export async function getDefaultHubId(): Promise<string> {
  const hub = await db.hub.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!hub) throw new Error("No active Hub");
  return hub.id;
}

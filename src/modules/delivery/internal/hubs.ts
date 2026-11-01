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

export type HubStatus = {
  notice: string | null;
  noticeUntil: Date | null;
  onlinePaused: boolean;
};

/** What staff set for a Hub that is closed or short-handed (docs/runbook.md, 3). */
export async function getHubStatus(hubId: string): Promise<HubStatus | null> {
  return db.hub.findUnique({
    where: { id: hubId },
    select: { notice: true, noticeUntil: true, onlinePaused: true },
  });
}

export async function setHubStatus(
  hubId: string,
  status: HubStatus
): Promise<void> {
  await db.hub.update({
    where: { id: hubId },
    data: {
      notice: status.notice?.trim() || null,
      noticeUntil: status.noticeUntil,
      onlinePaused: status.onlinePaused,
    },
  });
}

/** The notice to show across the shop now, or null. */
export async function getShopNotice(now = new Date()): Promise<string | null> {
  const hub = await db.hub.findFirst({
    where: {
      isActive: true,
      notice: { not: null },
      OR: [{ noticeUntil: null }, { noticeUntil: { gt: now } }],
    },
    orderBy: { createdAt: "asc" },
    select: { notice: true },
  });
  return hub?.notice ?? null;
}

/** GCash and card are off at this Hub's Checkout: cash on delivery only. */
export async function onlinePaused(hubId: string): Promise<boolean> {
  const hub = await db.hub.findUnique({
    where: { id: hubId },
    select: { onlinePaused: true },
  });
  return hub?.onlinePaused ?? false;
}

import { db } from "@/lib/db";

/**
 * Delete ended sign-in sessions and sign-in codes and links (cron tick):
 * each session row keeps the browser and IP it signed in from, and none
 * is needed once it has ended. Returns how many went.
 */
export async function purgeEndedSignIns(now = new Date()): Promise<number> {
  const [sessions, codes] = await Promise.all([
    db.authSession.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.authVerification.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
  return sessions.count + codes.count;
}

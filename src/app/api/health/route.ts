import { connection } from "next/server";

import { db } from "@/lib/db";

// Uptime check: the app is up and can reach the database.
export async function GET() {
  await connection(); // never prerender
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[health] database unreachable:", error);
    return Response.json({ ok: false }, { status: 503 });
  }
}

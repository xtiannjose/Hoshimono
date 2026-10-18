import { connection } from "next/server";

import { exportProductsCsv } from "@/modules/catalog";
import { getStaff } from "@/modules/identity";

// Every Product as CSV, in the import format (PRD ADM-1).
export async function GET() {
  await connection();
  const staff = await getStaff("merchandiser");
  if (!staff) return new Response("Not found", { status: 404 });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(await exportProductsCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hoshimono-products-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

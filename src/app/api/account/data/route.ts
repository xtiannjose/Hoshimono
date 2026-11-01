import { connection } from "next/server";

import { takeToken } from "@/lib/rate-limit";
import { currentCustomer } from "@/modules/identity";
import { exportCustomerData } from "@/server/customer-data";

// "Download my data" (ADR 0020): everything the shop keeps about the
// signed-in Customer, as one JSON file.
export async function GET() {
  await connection();
  const customer = await currentCustomer();
  if (!customer) return new Response("Sign in first.", { status: 401 });
  if (!(await takeToken(`export:${customer.id}`, 5, 60 * 60)).ok) {
    return new Response("Too many downloads. Please try again in an hour.", {
      status: 429,
    });
  }
  const data = await exportCustomerData(customer.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hoshimono-my-data.json"',
      "Cache-Control": "private, no-store",
    },
  });
}

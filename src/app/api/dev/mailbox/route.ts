import { connection } from "next/server";

import { devMailboxEnabled, lastLink } from "@/modules/identity";

// The last sign-in link sent to an address, for end-to-end tests only.
export async function GET(request: Request) {
  await connection();
  if (!devMailboxEnabled()) return new Response("Not found", { status: 404 });
  const email = new URL(request.url).searchParams.get("email") ?? "";
  const url = lastLink(email);
  return url
    ? Response.json({ url })
    : new Response("No link yet", { status: 404 });
}

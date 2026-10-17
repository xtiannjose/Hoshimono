import { connection } from "next/server";

import { devMailboxEnabled, lastLink } from "@/modules/identity";
import { lastMessage } from "@/modules/notifications";

// For end-to-end tests only: ?email= gives the last sign-in link sent to an
// address; ?to= gives the last email or SMS text sent to a recipient.
export async function GET(request: Request) {
  await connection();
  if (!devMailboxEnabled()) return new Response("Not found", { status: 404 });
  const params = new URL(request.url).searchParams;
  const to = params.get("to");
  if (to) {
    const text = lastMessage(to);
    return text
      ? Response.json({ text })
      : new Response("No message yet", { status: 404 });
  }
  const url = lastLink(params.get("email") ?? "");
  return url
    ? Response.json({ url })
    : new Response("No link yet", { status: 404 });
}

import { connection } from "next/server";

import { testMailboxEnabled } from "@/lib/test-mode";
import { lastMessage, lastSignInLink } from "@/modules/notifications";

// For end-to-end tests only: ?to= gives the last email or SMS text sent to
// a recipient; ?email= gives the last sign-in link emailed to it.
export async function GET(request: Request) {
  await connection();
  if (!testMailboxEnabled()) return new Response("Not found", { status: 404 });
  const params = new URL(request.url).searchParams;
  const to = params.get("to");
  if (to) {
    const text = lastMessage(to);
    return text
      ? Response.json({ text })
      : new Response("No message yet", { status: 404 });
  }
  const url = lastSignInLink(params.get("email") ?? "");
  return url
    ? Response.json({ url })
    : new Response("No link yet", { status: 404 });
}

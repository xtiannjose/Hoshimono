import { connection } from "next/server";

import { testMailboxEnabled } from "@/lib/test-mode";
import { lastMessage } from "@/modules/notifications";

// For end-to-end tests only: ?to= gives the last email or SMS text sent to
// a recipient; ?email= gives the sign-in link inside the last email.
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
  const text = lastMessage(params.get("email") ?? "");
  const url = text ? /https?:\/\/\S+/.exec(text)?.[0] : undefined;
  return url
    ? Response.json({ url })
    : new Response("No link yet", { status: 404 });
}

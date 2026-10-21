import { connection } from "next/server";

import { testMailboxEnabled } from "@/lib/test-mode";
import { emailSignInLink } from "@/modules/identity";
import { lastMessage } from "@/modules/notifications";

import { TEST_ACCOUNTS } from "../accounts";

/**
 * Sign in as a test account: send its magic link, then send the browser to
 * it, as if it were clicked in the email. Development and the local e2e
 * build only (testMailboxEnabled).
 */
export async function GET(request: Request) {
  await connection();
  const as = new URL(request.url).searchParams.get("as");
  const account = TEST_ACCOUNTS.find((a) => a.email === as);
  if (!testMailboxEnabled() || !account) {
    return new Response("Not found", { status: 404 });
  }
  await emailSignInLink(account.email, account.next);
  const link = /https?:\/\/\S+/.exec(lastMessage(account.email) ?? "")?.[0];
  return link
    ? Response.redirect(link, 303)
    : new Response("No sign-in link was sent", { status: 500 });
}

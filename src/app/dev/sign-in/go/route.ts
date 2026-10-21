import { connection } from "next/server";

import { testMailboxEnabled } from "@/lib/test-mode";
import { emailSignInLink } from "@/modules/identity";
import { lastSignInLink } from "@/modules/notifications";

import { TEST_ACCOUNTS } from "../accounts";

// One sign-in at a time: between sending a link and reading it back, a
// second sign-in to the same account would overwrite it, and two browsers
// would race for one single-use link (parallel e2e workers).
let previous: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(work: () => Promise<T>): Promise<T> {
  const run = previous.then(work, work);
  previous = run.catch(() => undefined);
  return run;
}

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
  const link = await oneAtATime(async () => {
    await emailSignInLink(account.email, account.next);
    return lastSignInLink(account.email);
  });
  return link
    ? Response.redirect(link, 303)
    : new Response("No sign-in link was sent", { status: 500 });
}

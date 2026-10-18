// Where console messages and the dev mailbox may run. Development always
// (the senders log instead of sending). A production build only for the
// end-to-end suite: E2E_MAILBOX=1 and an app URL on localhost. The URL is
// inlined at build time, so a build for a real domain can never qualify,
// even if E2E_MAILBOX were set there by mistake.

const localApp = () =>
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(
    process.env.NEXT_PUBLIC_APP_URL ?? ""
  );

/** Console email and SMS senders may run (they never reach a person). */
export function consoleMessagesAllowed(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    (process.env.E2E_MAILBOX === "1" && localApp())
  );
}

/** The e2e mailbox may keep sign-in links, codes and notices in memory. */
export function testMailboxEnabled(): boolean {
  return process.env.E2E_MAILBOX === "1" && consoleMessagesAllowed();
}

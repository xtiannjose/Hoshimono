// Tests that write data use names unique to this run, so a retry or a
// repeat never collides with what an earlier attempt saved, and parallel
// tests never share a user (sign-in links are rate limited per address).
export const RUN = Date.now().toString(36);
let count = 0;

/** A new Customer email for this test: no Orders, Cart or address yet. */
export function freshEmail(label: string): string {
  return `${label}-${RUN}-${process.pid}-${++count}@example.com`;
}

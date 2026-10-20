import { consoleMessagesAllowed } from "@/lib/test-mode";

import { createFakeProvider } from "./fake";
import { createPaymongo } from "./paymongo";
import type { PaymentProvider } from "./provider";

/**
 * A provider by name, PAYMENT_PROVIDER by default (the one new Orders pay
 * through). Null while its keys are not set (no account yet, or a build
 * without payments). The stand-in "fake" runs only where console messages
 * may (development and the local e2e build), never on a real domain.
 */
export function paymentProvider(
  name = process.env.PAYMENT_PROVIDER
): PaymentProvider | null {
  if (name === "fake") {
    return consoleMessagesAllowed()
      ? createFakeProvider(
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
        )
      : null;
  }
  if (name !== "paymongo") return null;
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) return null;
  return createPaymongo({ secretKey, webhookSecret });
}

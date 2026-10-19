import { createPaymongo } from "./paymongo";
import type { PaymentProvider } from "./provider";

/**
 * The provider PAYMENT_PROVIDER names, or null while its keys are not set
 * (no account yet, or a build without payments).
 */
export function paymentProvider(name?: string): PaymentProvider | null {
  const wanted = name ?? process.env.PAYMENT_PROVIDER;
  if (wanted !== "paymongo" || process.env.PAYMENT_PROVIDER !== "paymongo")
    return null;
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) return null;
  return createPaymongo({ secretKey, webhookSecret });
}

/**
 * Philippine mobile numbers as typed ("0917 123 4567", "+63 917-123-4567",
 * "639171234567") to "+639171234567"; null if it is not one.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s().-]/g, "");
  const match = /^(?:\+63|63|0)(9\d{9})$/.exec(digits);
  return match ? `+63${match[1]}` : null;
}

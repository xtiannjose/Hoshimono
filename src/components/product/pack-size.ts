// The pack size in words, given the words: safe for Client Components,
// which must not import every language's dictionary (format.ts does).
import type { Messages } from "@/i18n/messages";

export type PackSize = { value: number; unit: "g" | "ml" | "pc" };

function decimal(value: number): string {
  return String(Number((value / 1000).toFixed(3)));
}

/** "1 kg", "450 g", "1.5 L", "12 pcs"; Weighed Products get "approx.". */
export function packSizeLabel(
  size: PackSize,
  isWeighed: boolean,
  t: Pick<Messages["product"], "pieces" | "approx">
): string {
  const text =
    size.unit === "g"
      ? size.value >= 1000
        ? `${decimal(size.value)} kg`
        : `${size.value} g`
      : size.unit === "ml"
        ? size.value >= 1000
          ? `${decimal(size.value)} L`
          : `${size.value} ml`
        : t.pieces(size.value);
  return isWeighed ? t.approx(text) : text;
}

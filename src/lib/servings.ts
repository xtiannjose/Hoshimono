/**
 * How many to buy for `servings` when `quantity` serves `base`, rounded up;
 * a fixed count (a bottle of soy sauce) never changes (ADR 0013). Shared by
 * the Recipe page and the server, which recomputes it.
 */
export function scaledCount(
  row: { quantity: number; scales: boolean },
  servings: number,
  base: number
): number {
  return row.scales
    ? Math.max(1, Math.ceil((row.quantity * servings) / base))
    : row.quantity;
}

---
status: accepted
---

# Money is stored and computed as integer centavos

All monetary values are integers in centavos (PHP 59.00 is `5900`) in the database, in server code and in API payloads. Floating-point arithmetic cannot represent most decimal prices exactly, and errors would surface as one-centavo mismatches between the Cart, the Order, the payment provider and the receipt.

## Rules

- Columns are named `*_cents` and typed as integers (`Int`, or `BigInt` for aggregates).
- Percentages (VAT, discounts) are applied with a single documented rounding rule in `lib/money.ts` (round half up, applied per Order Line, then summed). Totals are never recomputed from rounded display values.
- Formatting to `₱1,249.00` happens only at the UI edge through `formatMoney`.
- Weighed Products compute `price_cents` per 100 g or per kg times integer grams, rounded once per line.

## Considered options

`Decimal` columns and a decimal library were rejected: they work, but invite mixing types at boundaries and make accidental float conversion easy. Integer arithmetic makes the wrong thing hard.

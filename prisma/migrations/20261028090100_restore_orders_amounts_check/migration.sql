-- Dropping authorised_cents dropped the whole check it was part of; the
-- other amounts keep their guard.
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_amounts_check" CHECK (
    "subtotal_cents" >= 0 AND "discount_cents" >= 0 AND "discount_cents" <= "subtotal_cents"
    AND "delivery_fee_cents" >= 0 AND "vat_cents" >= 0
    AND ("final_total_cents" IS NULL OR "final_total_cents" >= 0)
  );

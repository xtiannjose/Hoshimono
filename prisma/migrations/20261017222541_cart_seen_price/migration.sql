-- Price a Cart Line was last set at, so the Cart can flag a change (CRT-5).
-- No default: no Cart exists outside development yet.
ALTER TABLE "cart_lines" ADD COLUMN "seen_price_cents" INTEGER NOT NULL;
ALTER TABLE "cart_lines"
  ADD CONSTRAINT "cart_lines_seen_price_check" CHECK ("seen_price_cents" >= 0);

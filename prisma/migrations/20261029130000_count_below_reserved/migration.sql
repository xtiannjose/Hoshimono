-- A physical count may find fewer than Orders have reserved (ADR 0022):
-- the shelf number is the truth, free stock is never below 0, and the
-- reserved Orders come up short at the pick.
ALTER TABLE "stock_levels" DROP CONSTRAINT "stock_levels_quantities_check";
ALTER TABLE "stock_levels"
  ADD CONSTRAINT "stock_levels_quantities_check" CHECK ("on_hand" >= 0 AND "reserved" >= 0 AND "low_stock_threshold" >= 0);

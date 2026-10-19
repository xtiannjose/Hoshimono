-- Partial indexes for the cron tick's housekeeping (review fixes, Batch 2.x).
-- Guest Carts idle for 30 days, and Carts checked out 30 days ago.
CREATE INDEX "carts_guest_idle_idx" ON "carts" ("updated_at")
  WHERE "customer_id" IS NULL AND "checked_out_at" IS NULL;
CREATE INDEX "carts_checked_out_idx" ON "carts" ("checked_out_at")
  WHERE "checked_out_at" IS NOT NULL;
-- expireUnpaidOrders: only Orders still waiting for payment.
CREATE INDEX "orders_pending_payment_idx" ON "orders" ("placed_at")
  WHERE "status" = 'pending_payment';

-- Refunds staff record when money went back outside the app (ADR 0023).
-- The new reason's index is the next migration: a value added to an enum
-- can be used only once it is committed.
ALTER TYPE "RefundReason" ADD VALUE 'staff';

ALTER TABLE "refunds" ADD COLUMN "paid_back_by" TEXT;

DROP INDEX "refunds_payment_id_reason_not_claim_key";

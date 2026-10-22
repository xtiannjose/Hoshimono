-- CreateEnum
CREATE TYPE "ClaimReason" AS ENUM ('not_fresh', 'damaged', 'missing', 'wrong_item');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('open', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ClaimPayback" AS ENUM ('refund', 'voucher');

-- AlterEnum
ALTER TYPE "RefundReason" ADD VALUE 'claim';

-- DropIndex
DROP INDEX "refunds_payment_id_reason_key";

-- AlterTable
ALTER TABLE "refunds" ADD COLUMN     "claim_id" UUID;

-- CreateTable
CREATE TABLE "freshness_claims" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_line_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "reason" "ClaimReason" NOT NULL,
    "units" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "photo_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "claimed_cents" INTEGER NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'open',
    "resolved_cents" INTEGER,
    "payback" "ClaimPayback",
    "voucher_id" UUID,
    "decided_by_id" UUID,
    "decided_at" TIMESTAMPTZ(3),
    "decision_note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "freshness_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "freshness_claims_order_line_id_key" ON "freshness_claims"("order_line_id");

-- CreateIndex
CREATE INDEX "freshness_claims_status_created_at_idx" ON "freshness_claims"("status", "created_at");

-- CreateIndex
CREATE INDEX "freshness_claims_order_id_idx" ON "freshness_claims"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_claim_id_key" ON "refunds"("claim_id");

-- CreateIndex
CREATE INDEX "refunds_payment_id_reason_idx" ON "refunds"("payment_id", "reason");

-- AddForeignKey
ALTER TABLE "freshness_claims" ADD CONSTRAINT "freshness_claims_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freshness_claims" ADD CONSTRAINT "freshness_claims_order_line_id_fkey" FOREIGN KEY ("order_line_id") REFERENCES "order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freshness_claims" ADD CONSTRAINT "freshness_claims_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freshness_claims" ADD CONSTRAINT "freshness_claims_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freshness_claims" ADD CONSTRAINT "freshness_claims_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "freshness_claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Hand-added (ADR 0016).
-- One Refund per Payment and reason, except claims, which have one each.
CREATE UNIQUE INDEX "refunds_payment_id_reason_not_claim_key" ON "refunds"("payment_id", "reason") WHERE "claim_id" IS NULL;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_claim_check" CHECK (("reason"::text = 'claim') = ("claim_id" IS NOT NULL));
ALTER TABLE "freshness_claims" ADD CONSTRAINT "freshness_claims_numbers_check" CHECK (
  "units" >= 1 AND "claimed_cents" >= 0 AND ("resolved_cents" IS NULL OR "resolved_cents" BETWEEN 0 AND "claimed_cents")
);
ALTER TABLE "freshness_claims" ADD CONSTRAINT "freshness_claims_decided_check" CHECK (
  ("status" = 'open') = ("decided_at" IS NULL)
  AND ("status" <> 'approved' OR ("resolved_cents" IS NOT NULL AND "payback" IS NOT NULL))
);
ALTER TABLE "freshness_claims" ADD CONSTRAINT "freshness_claims_photos_check" CHECK (cardinality("photo_urls") <= 3);

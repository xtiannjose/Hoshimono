-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('cancelled', 'picked', 'late_payment');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('pending', 'sending', 'sent', 'needs_review');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "payment_ref" TEXT;

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "reason" "RefundReason" NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'pending',
    "provider_ref" TEXT,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(3),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refunds_payment_id_reason_key" ON "refunds"("payment_id", "reason");

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-added: a refund always moves money.
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_amount_check" CHECK ("amount_cents" > 0);

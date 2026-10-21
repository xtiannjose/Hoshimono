-- AlterEnum
ALTER TYPE "StaffRole" ADD VALUE 'rider';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "delivery_pin" TEXT,
ADD COLUMN     "dispatched_at" TIMESTAMPTZ(3),
ADD COLUMN     "pin_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rider_id" UUID;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "collected_note" TEXT;

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "cash_handovers" (
    "id" UUID NOT NULL,
    "rider_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "recorded_cents" INTEGER NOT NULL,
    "counted_cents" INTEGER NOT NULL,
    "counted_by" UUID NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_handovers_rider_id_day_key" ON "cash_handovers"("rider_id", "day");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_counted_by_fkey" FOREIGN KEY ("counted_by") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- CreateIndex
CREATE INDEX "orders_rider_id_idx" ON "orders"("rider_id");

-- Hand-added: cash is never negative.
ALTER TABLE "cash_handovers" ADD CONSTRAINT "cash_handovers_cents_check" CHECK ("recorded_cents" >= 0 AND "counted_cents" >= 0);

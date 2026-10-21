-- CreateEnum
CREATE TYPE "PromotionKind" AS ENUM ('percent', 'amount');

-- CreateEnum
CREATE TYPE "VoucherKind" AS ENUM ('percent', 'amount', 'free_delivery');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "referral_code" TEXT,
ADD COLUMN     "referred_by_id" UUID;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "voucher_id" UUID;

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PromotionKind" NOT NULL,
    "value" INTEGER NOT NULL,
    "product_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "category_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "VoucherKind" NOT NULL,
    "value" INTEGER NOT NULL,
    "max_discount_cents" INTEGER,
    "min_spend_cents" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "usage_limit" INTEGER,
    "per_customer_limit" INTEGER NOT NULL DEFAULT 1,
    "first_order_only" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "customer_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_redemptions" (
    "id" UUID NOT NULL,
    "voucher_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "discount_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_rewards" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "referee_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "referrer_voucher_id" UUID NOT NULL,
    "referee_voucher_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotions_is_active_ends_at_idx" ON "promotions"("is_active", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");

-- CreateIndex
CREATE INDEX "vouchers_customer_id_idx" ON "vouchers"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_redemptions_order_id_key" ON "voucher_redemptions"("order_id");

-- CreateIndex
CREATE INDEX "voucher_redemptions_voucher_id_idx" ON "voucher_redemptions"("voucher_id");

-- CreateIndex
CREATE INDEX "voucher_redemptions_customer_id_idx" ON "voucher_redemptions"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_rewards_referee_id_key" ON "referral_rewards"("referee_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_rewards_order_id_key" ON "referral_rewards"("order_id");

-- CreateIndex
CREATE INDEX "referral_rewards_referrer_id_idx" ON "referral_rewards"("referrer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_referral_code_key" ON "customers"("referral_code");

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Hand-added (ADR 0015).
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_value_check" CHECK (
  ("kind" = 'percent' AND "value" BETWEEN 1 AND 90) OR ("kind" = 'amount' AND "value" > 0)
);
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_dates_check" CHECK ("starts_at" < "ends_at");
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_target_check" CHECK (cardinality("product_ids") + cardinality("category_ids") > 0);
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_value_check" CHECK (
  ("kind" = 'percent' AND "value" BETWEEN 1 AND 90)
  OR ("kind" = 'amount' AND "value" > 0)
  OR ("kind" = 'free_delivery' AND "value" = 0)
);
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_dates_check" CHECK ("starts_at" < "ends_at");
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_limits_check" CHECK (
  "min_spend_cents" >= 0 AND ("usage_limit" IS NULL OR "usage_limit" > 0)
  AND "per_customer_limit" > 0 AND ("max_discount_cents" IS NULL OR "max_discount_cents" > 0)
);
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_code_check" CHECK ("code" = upper("code") AND "code" ~ '^[A-Z0-9-]{3,24}$');
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_discount_check" CHECK ("discount_cents" >= 0);
ALTER TABLE "customers" ADD CONSTRAINT "customers_not_own_referrer_check" CHECK ("referred_by_id" IS NULL OR "referred_by_id" <> "id");

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "reminded_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "ref" TEXT;

-- CreateTable
CREATE TABLE "stock_alerts" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_lists" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_items" (
    "list_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_items_pkey" PRIMARY KEY ("list_id","product_id")
);

-- CreateIndex
CREATE INDEX "stock_alerts_product_id_idx" ON "stock_alerts"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_alerts_customer_id_product_id_key" ON "stock_alerts"("customer_id", "product_id");

-- CreateIndex
CREATE INDEX "shopping_lists_customer_id_idx" ON "shopping_lists"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_template_channel_ref_key" ON "notifications"("template", "channel", "ref");

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-added (ADR 0014).
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_name_check" CHECK (btrim("name") <> '' AND length("name") <= 60);
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_quantity_check" CHECK ("quantity" BETWEEN 1 AND 99);
-- A message has an Order or a ref, never neither (old rows all have an Order).
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_about_check" CHECK ("order_id" IS NOT NULL OR "ref" IS NOT NULL);

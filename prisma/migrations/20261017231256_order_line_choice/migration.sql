-- The Customer's chosen substitute ("I'll choose") and picker note, copied from the Cart Line.
-- AlterTable
ALTER TABLE "order_lines" ADD COLUMN     "note" TEXT,
ADD COLUMN     "preferred_product_id" UUID;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_preferred_product_id_fkey" FOREIGN KEY ("preferred_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

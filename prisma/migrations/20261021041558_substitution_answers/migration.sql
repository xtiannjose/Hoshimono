-- DropIndex
DROP INDEX "substitutions_order_line_id_idx";

-- AlterTable
ALTER TABLE "substitutions" ADD COLUMN     "quantity" INTEGER NOT NULL,
ADD COLUMN     "token" TEXT,
ADD COLUMN     "window_ends_at" TIMESTAMPTZ(3);

-- CreateIndex
CREATE UNIQUE INDEX "substitutions_token_key" ON "substitutions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "substitutions_order_line_id_key" ON "substitutions"("order_line_id");


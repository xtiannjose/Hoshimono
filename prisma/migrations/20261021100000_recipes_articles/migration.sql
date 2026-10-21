-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'published');

-- AlterEnum
ALTER TYPE "StaffRole" ADD VALUE 'content_editor';

-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT NOT NULL DEFAULT '',
    "photo_url" TEXT,
    "photo_alt" TEXT NOT NULL DEFAULT '',
    "servings" INTEGER NOT NULL,
    "prep_minutes" INTEGER NOT NULL DEFAULT 0,
    "cook_minutes" INTEGER NOT NULL DEFAULT 0,
    "steps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "product_id" UUID,
    "label" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "scales" BOOLEAN NOT NULL DEFAULT true,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT NOT NULL DEFAULT '',
    "photo_url" TEXT,
    "photo_alt" TEXT NOT NULL DEFAULT '',
    "sections" JSONB NOT NULL DEFAULT '[]',
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_products" (
    "article_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "article_products_pkey" PRIMARY KEY ("article_id","product_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recipes_slug_key" ON "recipes"("slug");

-- CreateIndex
CREATE INDEX "recipes_status_published_at_idx" ON "recipes"("status", "published_at");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipe_id_position_idx" ON "recipe_ingredients"("recipe_id", "position");

-- CreateIndex
CREATE INDEX "recipe_ingredients_product_id_idx" ON "recipe_ingredients"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_status_published_at_idx" ON "articles"("status", "published_at");

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_products" ADD CONSTRAINT "article_products_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_products" ADD CONSTRAINT "article_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-added (ADR 0013): what Prisma cannot express.
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_numbers_check" CHECK ("servings" BETWEEN 1 AND 50 AND "prep_minutes" >= 0 AND "cook_minutes" >= 0);
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_published_check" CHECK ("status" = 'draft' OR "published_at" IS NOT NULL);
ALTER TABLE "articles" ADD CONSTRAINT "articles_published_check" CHECK ("status" = 'draft' OR "published_at" IS NOT NULL);
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_what_check" CHECK ("product_id" IS NOT NULL OR coalesce(btrim("label"), '') <> '');
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_quantity_check" CHECK ("quantity" BETWEEN 1 AND 99);

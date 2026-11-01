-- The shopping funnel (ADR 0017): counts per Manila day, nothing about who.
CREATE TYPE "funnel_step" AS ENUM ('product_viewed', 'added_to_cart', 'checkout_started', 'order_placed');

CREATE TABLE "funnel_counts" (
    "day" DATE NOT NULL,
    "step" "funnel_step" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "funnel_counts_pkey" PRIMARY KEY ("day","step")
);

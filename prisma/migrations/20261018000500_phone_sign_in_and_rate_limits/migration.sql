-- Mobile OTP sign-in fields and the rate-limit counters (Batch 2.6).
ALTER TABLE "auth_users" ADD COLUMN "phone_number" TEXT,
ADD COLUMN "phone_number_verified" BOOLEAN;

CREATE UNIQUE INDEX "auth_users_phone_number_key" ON "auth_users"("phone_number");

CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "reset_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "rate_limits_reset_at_idx" ON "rate_limits"("reset_at");

-- Staff can block an account that abuses the shop (docs/security-review.md, M1).
ALTER TABLE "customers" ADD COLUMN "blocked_at" TIMESTAMPTZ(3);

-- Order notices run before reminders and alerts when the queue is long
-- (docs/security-review.md, H1).
ALTER TABLE "jobs" ADD COLUMN "priority" SMALLINT NOT NULL DEFAULT 0;

-- One Refund per Payment and reason, except claims (one each) and staff
-- records (as many as were paid back, ADR 0023).
CREATE UNIQUE INDEX "refunds_payment_id_reason_not_claim_key" ON "refunds"("payment_id", "reason") WHERE "claim_id" IS NULL AND "reason" <> 'staff';

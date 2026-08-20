ALTER TABLE "payments"
  ADD COLUMN "stripeCheckoutSessionId" TEXT,
  ADD COLUMN "checkoutUrl" TEXT;

CREATE UNIQUE INDEX "payments_stripeCheckoutSessionId_key"
  ON "payments"("stripeCheckoutSessionId");

CREATE INDEX "payments_stripeCheckoutSessionId_idx"
  ON "payments"("stripeCheckoutSessionId");

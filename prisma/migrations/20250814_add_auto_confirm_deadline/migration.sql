ALTER TABLE "reservations" ADD COLUMN "autoConfirmDeadline" TIMESTAMP(3);

CREATE INDEX "reservations_autoConfirmDeadline_idx" ON "reservations"("autoConfirmDeadline");

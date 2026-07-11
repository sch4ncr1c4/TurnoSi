ALTER TABLE "Customer"
ADD COLUMN "blockedAt" TIMESTAMP(3),
ADD COLUMN "blockedReason" TEXT,
ADD COLUMN "noShowCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Customer_organizationId_blockedAt_idx"
ON "Customer"("organizationId", "blockedAt");

CREATE TABLE "ServiceResource" (
    "serviceId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceResource_pkey" PRIMARY KEY ("serviceId", "resourceId")
);

CREATE INDEX "ServiceResource_resourceId_idx" ON "ServiceResource"("resourceId");

ALTER TABLE "ServiceResource"
ADD CONSTRAINT "ServiceResource_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceResource"
ADD CONSTRAINT "ServiceResource_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "Resource"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Service" ADD COLUMN "branchId" TEXT;

UPDATE "Service" AS service
SET "branchId" = branch.id
FROM "Branch" AS branch
WHERE branch."organizationId" = service."organizationId"
  AND branch."isMain" = true
  AND service."branchId" IS NULL;

CREATE INDEX "Service_organizationId_branchId_idx" ON "Service"("organizationId", "branchId");

ALTER TABLE "Service"
ADD CONSTRAINT "Service_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Branch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "phone" TEXT,
  "whatsapp" TEXT,
  "address" TEXT,
  "city" TEXT,
  "province" TEXT,
  "isMain" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Branch"
  ADD CONSTRAINT "Branch_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Branch_organizationId_slug_key" ON "Branch"("organizationId", "slug");
CREATE INDEX "Branch_organizationId_isActive_idx" ON "Branch"("organizationId", "isActive");

ALTER TABLE "Resource" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "branchId" TEXT;
ALTER TABLE "AvailabilityRule" ADD COLUMN "branchId" TEXT;
ALTER TABLE "AvailabilityException" ADD COLUMN "branchId" TEXT;

ALTER TABLE "Resource"
  ADD CONSTRAINT "Resource_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AvailabilityRule"
  ADD CONSTRAINT "AvailabilityRule_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AvailabilityException"
  ADD CONSTRAINT "AvailabilityException_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Resource_organizationId_branchId_idx" ON "Resource"("organizationId", "branchId");
CREATE INDEX "Appointment_organizationId_branchId_startsAt_idx" ON "Appointment"("organizationId", "branchId", "startsAt");
CREATE INDEX "AvailabilityRule_organizationId_branchId_weekday_idx" ON "AvailabilityRule"("organizationId", "branchId", "weekday");
CREATE INDEX "AvailabilityException_organizationId_branchId_startsAt_idx" ON "AvailabilityException"("organizationId", "branchId", "startsAt");

INSERT INTO "Branch" (
  "id",
  "organizationId",
  "name",
  "slug",
  "phone",
  "whatsapp",
  "address",
  "city",
  "province",
  "isMain",
  "isActive",
  "updatedAt"
)
SELECT
  'branch_' || "id",
  "id",
  'Sede principal',
  'sede-principal',
  "phone",
  "whatsapp",
  "address",
  "city",
  "province",
  true,
  true,
  CURRENT_TIMESTAMP
FROM "Organization";

UPDATE "Resource"
SET "branchId" = 'branch_' || "organizationId"
WHERE "branchId" IS NULL;

UPDATE "Appointment"
SET "branchId" = 'branch_' || "organizationId"
WHERE "branchId" IS NULL;

UPDATE "AvailabilityRule"
SET "branchId" = 'branch_' || "organizationId"
WHERE "branchId" IS NULL;

UPDATE "AvailabilityException"
SET "branchId" = 'branch_' || "organizationId"
WHERE "branchId" IS NULL;

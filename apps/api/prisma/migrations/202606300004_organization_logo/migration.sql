CREATE TABLE "OrganizationLogo" (
    "organizationId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizationLogo_pkey" PRIMARY KEY ("organizationId")
);

ALTER TABLE "OrganizationLogo"
ADD CONSTRAINT "OrganizationLogo_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

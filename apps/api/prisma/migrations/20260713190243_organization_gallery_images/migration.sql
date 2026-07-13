-- CreateTable
CREATE TABLE "OrganizationGalleryImage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationGalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationGalleryImage_organizationId_slot_key" ON "OrganizationGalleryImage"("organizationId", "slot");

-- AddForeignKey
ALTER TABLE "OrganizationGalleryImage" ADD CONSTRAINT "OrganizationGalleryImage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

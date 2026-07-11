-- AlterTable: Add deletedAt to Customer and Appointment
ALTER TABLE "Customer" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex: Partial unique index for active customers (email per org)
CREATE UNIQUE INDEX "Customer_org_email_active" ON "Customer"("organizationId", "email") WHERE "deletedAt" IS NULL;

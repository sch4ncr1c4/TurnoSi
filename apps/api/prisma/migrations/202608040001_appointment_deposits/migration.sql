CREATE TYPE "AppointmentPaymentStatus" AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back',
  'unknown'
);

ALTER TABLE "Organization"
ADD COLUMN "mercadoPagoAccessTokenEncrypted" TEXT,
ADD COLUMN "depositEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "depositAmountCents" INTEGER;

CREATE TABLE "AppointmentDepositPayment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "mercadoPagoPreferenceId" TEXT,
  "mercadoPagoPaymentId" TEXT,
  "status" "AppointmentPaymentStatus" NOT NULL DEFAULT 'pending',
  "amountCents" INTEGER NOT NULL,
  "currencyId" TEXT NOT NULL DEFAULT 'ARS',
  "checkoutUrl" TEXT,
  "statusDetail" TEXT,
  "paidAt" TIMESTAMP(3),
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppointmentDepositPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentDepositPayment_appointmentId_key" ON "AppointmentDepositPayment"("appointmentId");
CREATE UNIQUE INDEX "AppointmentDepositPayment_mercadoPagoPreferenceId_key" ON "AppointmentDepositPayment"("mercadoPagoPreferenceId");
CREATE UNIQUE INDEX "AppointmentDepositPayment_mercadoPagoPaymentId_key" ON "AppointmentDepositPayment"("mercadoPagoPaymentId");
CREATE INDEX "AppointmentDepositPayment_organizationId_createdAt_idx" ON "AppointmentDepositPayment"("organizationId", "createdAt");
CREATE INDEX "AppointmentDepositPayment_status_idx" ON "AppointmentDepositPayment"("status");

ALTER TABLE "AppointmentDepositPayment"
ADD CONSTRAINT "AppointmentDepositPayment_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentDepositPayment"
ADD CONSTRAINT "AppointmentDepositPayment_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

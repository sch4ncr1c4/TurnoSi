CREATE TYPE "AppointmentPaymentMethod" AS ENUM (
  'mercadopago',
  'cash',
  'bank_transfer',
  'other'
);

ALTER TABLE "AppointmentDepositPayment"
ADD COLUMN "method" "AppointmentPaymentMethod";

UPDATE "AppointmentDepositPayment"
SET "method" = 'mercadopago'
WHERE "mercadoPagoPreferenceId" IS NOT NULL
   OR "mercadoPagoPaymentId" IS NOT NULL
   OR "checkoutUrl" IS NOT NULL;

UPDATE "AppointmentDepositPayment"
SET "method" = 'other'
WHERE "method" IS NULL
  AND "status" = 'approved';

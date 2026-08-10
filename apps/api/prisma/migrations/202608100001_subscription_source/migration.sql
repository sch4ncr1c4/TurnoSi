CREATE TYPE "SubscriptionSource" AS ENUM ('mercadopago', 'manual');

ALTER TABLE "OrganizationSubscription"
ADD COLUMN "source" "SubscriptionSource" NOT NULL DEFAULT 'mercadopago';

UPDATE "OrganizationSubscription"
SET "source" = 'manual'
WHERE "mercadoPagoPreapprovalId" IS NULL
  AND "status" = 'authorized'
  AND "plan" <> 'trial';

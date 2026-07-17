CREATE TYPE "SubscriptionPaymentStatus" AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back',
  'unknown'
);

ALTER TABLE "OrganizationSubscription"
ADD COLUMN "paymentGraceEndsAt" TIMESTAMP(3),
ADD COLUMN "lastPaymentStatus" "SubscriptionPaymentStatus";

CREATE TABLE "OrganizationSubscriptionPayment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "mercadoPagoPaymentId" TEXT NOT NULL,
  "mercadoPagoInvoiceId" TEXT,
  "mercadoPagoPreapprovalId" TEXT,
  "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'pending',
  "statusDetail" TEXT,
  "amountCents" INTEGER,
  "currencyId" TEXT,
  "paidAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrganizationSubscriptionPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationSubscriptionPayment_mercadoPagoPaymentId_key"
ON "OrganizationSubscriptionPayment"("mercadoPagoPaymentId");

CREATE UNIQUE INDEX "OrganizationSubscriptionPayment_mercadoPagoInvoiceId_key"
ON "OrganizationSubscriptionPayment"("mercadoPagoInvoiceId")
WHERE "mercadoPagoInvoiceId" IS NOT NULL;

CREATE INDEX "OrganizationSubscriptionPayment_organizationId_createdAt_idx"
ON "OrganizationSubscriptionPayment"("organizationId", "createdAt");

CREATE INDEX "OrganizationSubscriptionPayment_mercadoPagoPreapprovalId_idx"
ON "OrganizationSubscriptionPayment"("mercadoPagoPreapprovalId");

CREATE INDEX "OrganizationSubscriptionPayment_status_idx"
ON "OrganizationSubscriptionPayment"("status");

ALTER TABLE "OrganizationSubscriptionPayment"
ADD CONSTRAINT "OrganizationSubscriptionPayment_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationSubscriptionPayment"
ADD CONSTRAINT "OrganizationSubscriptionPayment_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "OrganizationSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

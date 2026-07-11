CREATE TYPE "SubscriptionPlan" AS ENUM ('initial', 'professional', 'operation');
CREATE TYPE "SubscriptionStatus" AS ENUM ('pending', 'authorized', 'paused', 'canceled');

CREATE TABLE "OrganizationSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'pending',
    "mercadoPagoPreapprovalId" TEXT,
    "payerEmail" TEXT,
    "nextPaymentAt" TIMESTAMP(3),
    "lastWebhookAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizationSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationSubscription_organizationId_key"
ON "OrganizationSubscription"("organizationId");

CREATE UNIQUE INDEX "OrganizationSubscription_mercadoPagoPreapprovalId_key"
ON "OrganizationSubscription"("mercadoPagoPreapprovalId");

ALTER TABLE "OrganizationSubscription"
ADD CONSTRAINT "OrganizationSubscription_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'trial';

ALTER TABLE "OrganizationSubscription"
ADD COLUMN "trialEndsAt" TIMESTAMP(3);

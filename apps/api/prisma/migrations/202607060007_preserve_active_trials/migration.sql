UPDATE "OrganizationSubscription"
SET
  "plan" = 'trial',
  "status" = 'authorized',
  "trialEndsAt" = "trialStartedAt" + INTERVAL '7 days',
  "mercadoPagoPreapprovalId" = NULL,
  "payerEmail" = NULL,
  "nextPaymentAt" = NULL
WHERE
  "trialStartedAt" IS NOT NULL
  AND "trialEndsAt" IS NULL
  AND "status" = 'pending';

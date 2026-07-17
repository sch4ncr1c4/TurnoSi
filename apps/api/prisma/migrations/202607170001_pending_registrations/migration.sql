CREATE TABLE "PendingRegistrationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingRegistrationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingRegistrationToken_tokenHash_key" ON "PendingRegistrationToken"("tokenHash");
CREATE INDEX "PendingRegistrationToken_email_idx" ON "PendingRegistrationToken"("email");
CREATE INDEX "PendingRegistrationToken_expiresAt_idx" ON "PendingRegistrationToken"("expiresAt");

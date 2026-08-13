CREATE TABLE "ReservationNotificationState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "seenUntil" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReservationNotificationState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReservationNotificationState_userId_organizationId_key"
  ON "ReservationNotificationState"("userId", "organizationId");

CREATE INDEX "ReservationNotificationState_organizationId_seenUntil_idx"
  ON "ReservationNotificationState"("organizationId", "seenUntil");

ALTER TABLE "ReservationNotificationState"
  ADD CONSTRAINT "ReservationNotificationState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReservationNotificationState"
  ADD CONSTRAINT "ReservationNotificationState_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Membership"
RENAME COLUMN "dailyCapacity" TO "hourlyCapacity";

ALTER TABLE "Membership"
ALTER COLUMN "hourlyCapacity" SET DEFAULT 2;

UPDATE "Membership"
SET "hourlyCapacity" = 2;

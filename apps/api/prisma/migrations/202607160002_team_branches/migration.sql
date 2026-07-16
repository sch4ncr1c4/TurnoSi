CREATE TABLE "MembershipBranch" (
  "membershipId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MembershipBranch_pkey" PRIMARY KEY ("membershipId", "branchId")
);

ALTER TABLE "MembershipBranch"
  ADD CONSTRAINT "MembershipBranch_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "Membership"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MembershipBranch"
  ADD CONSTRAINT "MembershipBranch_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "MembershipBranch_branchId_idx" ON "MembershipBranch"("branchId");

INSERT INTO "MembershipBranch" ("membershipId", "branchId")
SELECT m."id", b."id"
FROM "Membership" m
JOIN "Branch" b
  ON b."organizationId" = m."organizationId"
 AND b."isMain" = true
 AND b."isActive" = true
ON CONFLICT DO NOTHING;

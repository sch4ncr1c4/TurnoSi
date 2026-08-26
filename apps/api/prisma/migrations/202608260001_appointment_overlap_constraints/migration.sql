CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_resource_no_overlap"
  EXCLUDE USING gist (
    "organizationId" WITH =,
    "resourceId" WITH =,
    tsrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("resourceId" IS NOT NULL AND "deletedAt" IS NULL AND "status" IN ('pending', 'confirmed'));

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_assignee_no_overlap"
  EXCLUDE USING gist (
    "organizationId" WITH =,
    "assignedUserId" WITH =,
    tsrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("assignedUserId" IS NOT NULL AND "deletedAt" IS NULL AND "status" IN ('pending', 'confirmed'));

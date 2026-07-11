import { z } from "zod";
import { MembershipRole } from "@prisma/client";

export const teamMemberParamsSchema = z.object({
  membershipId: z.string().cuid()
});

const teamRoleSchema = z.nativeEnum(MembershipRole);

export const createTeamMemberSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(40),
  email: z.string().trim().email().max(254),
  role: teamRoleSchema,
  bookingsEnabled: z.boolean().default(true),
  visibleInPublicBooking: z.boolean().default(true),
  hourlyCapacity: z.number().int().min(1).max(12).default(2)
});

export const updateTeamMemberSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(40),
  email: z.string().trim().email().max(254),
  role: teamRoleSchema,
  bookingsEnabled: z.boolean(),
  visibleInPublicBooking: z.boolean(),
  hourlyCapacity: z.number().int().min(1).max(12)
});

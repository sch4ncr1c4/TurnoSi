import { z } from "zod";
import { MembershipRole } from "@prisma/client";

export const teamMemberParamsSchema = z.object({
  membershipId: z.string().cuid()
});

export const resetTeamMemberPasswordSchema = z.object({
  password: z.string().min(12).max(128)
});

const teamRoleSchema = z.nativeEnum(MembershipRole);

export const createTeamMemberSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(40),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(12).max(128),
  role: teamRoleSchema,
  bookingsEnabled: z.boolean().default(true),
  visibleInPublicBooking: z.boolean().default(true),
  hourlyCapacity: z.number().int().min(1).max(12).default(2),
  branchIds: z.array(z.string().min(1)).default([])
});

export const updateTeamMemberSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(40),
  role: teamRoleSchema,
  bookingsEnabled: z.boolean(),
  visibleInPublicBooking: z.boolean(),
  hourlyCapacity: z.number().int().min(1).max(12),
  branchIds: z.array(z.string().min(1)).default([])
});

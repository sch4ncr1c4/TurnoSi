import { z } from "zod";

export const publicBookingParamsSchema = z.object({
  organizationSlug: z.string().min(2).max(120)
});

export const publicSlotsQuerySchema = z.object({
  serviceId: z.string().cuid(),
  branchId: z.string().min(1).optional(),
  assigneeId: z.string().cuid().optional(),
  days: z.coerce.number().int().min(1).max(30).default(14)
});

export const createPublicBookingSchema = z.object({
  serviceId: z.string().cuid(),
  branchId: z.string().min(1).optional(),
  assigneeId: z.string().cuid().optional(),
  startsAt: z.string().datetime(),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(40),
  email: z.string().trim().email().max(254)
});

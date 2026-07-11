import { z } from "zod";

export const customersQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["all", "active", "blocked"]).default("all")
});

export const createCustomerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(500).optional()
});

export const customerParamsSchema = z.object({
  customerId: z.string().cuid()
});

export const blockCustomerSchema = z.object({
  reason: z.string().trim().min(3).max(300)
});

import { z } from "zod";

export const createSubscriptionSchema = z.object({
  plan: z.enum(["initial", "professional", "operation"]),
  payerEmail: z.string().trim().email().max(254).optional()
});

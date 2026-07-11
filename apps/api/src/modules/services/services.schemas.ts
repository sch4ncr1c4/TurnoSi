import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  bufferBeforeMinutes: z.coerce.number().int().min(0).max(180).default(0),
  bufferAfterMinutes: z.coerce.number().int().min(0).max(180).default(0),
  priceCents: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
  isOnlineBookable: z.boolean().default(true),
  createdByUserId: z.string().cuid().optional()
});

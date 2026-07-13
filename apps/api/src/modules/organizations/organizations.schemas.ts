import { z } from "zod";

export const updateOrganizationSettingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().max(120),
  phone: z.string().trim().max(40),
  whatsapp: z.string().trim().max(40),
  publicEmail: z.string().trim().email().or(z.literal("")),
  address: z.string().trim().max(240),
  city: z.string().trim().max(120),
  province: z.string().trim().max(120),
  instagram: z.string().trim().max(80),
  description: z.string().trim().max(600),
  galleryFocus: z
    .array(
      z.object({
        slot: z.union([z.literal(0), z.literal(1)]),
        focusX: z.number().int().min(0).max(100),
        focusY: z.number().int().min(0).max(100),
        zoom: z.number().int().min(100).max(220)
      })
    )
    .max(2)
}).partial();

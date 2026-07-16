import { z } from "zod";

const slotSchema = z.object({
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440)
}).refine((slot) => slot.startMinute < slot.endMinute, {
  message: "Slot start must be before slot end"
});

export const weeklyAvailabilitySchema = z.object({
  days: z.array(z.object({
    weekday: z.number().int().min(0).max(6),
    slots: z.array(slotSchema).max(8)
  })).length(7)
}).superRefine(({ days }, context) => {
  if (new Set(days.map((day) => day.weekday)).size !== 7) {
    context.addIssue({ code: "custom", message: "Each weekday must appear once" });
  }
  for (const day of days) {
    const sorted = [...day.slots].sort((a, b) => a.startMinute - b.startMinute);
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].startMinute < sorted[index - 1].endMinute) {
        context.addIssue({
          code: "custom",
          path: ["days", day.weekday, "slots"],
          message: "Availability slots cannot overlap"
        });
      }
    }
  }
});

export const branchQuerySchema = z.object({
  branchId: z.string().min(1).optional()
});

export const exceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().trim().min(2).max(120),
  detail: z.string().trim().max(500),
  status: z.enum(["No laborable", "Horario especial", "Bloque parcial"]),
  enabled: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional()
});

export const exceptionParamsSchema = z.object({
  exceptionId: z.string().cuid()
});

export const catalogItemSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().max(80).optional().default(""),
  durationMinutes: z.number().int().min(5).max(480),
  capacity: z.number().int().min(1).max(1000),
  bufferMinutes: z.number().int().min(0).max(180),
  priceCents: z.number().int().min(0).nullable(),
  resourceName: z.string().trim().max(120),
  online: z.boolean()
});

export const catalogParamsSchema = z.object({
  serviceId: z.string().cuid()
});

export const catalogCategorySchema = z.object({
  name: z.string().trim().min(2).max(80)
});

export const catalogCategoryParamsSchema = z.object({
  categoryId: z.string().cuid()
});

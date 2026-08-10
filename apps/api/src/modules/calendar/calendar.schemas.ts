import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";

export const calendarQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime()
}).superRefine((data, context) => {
  const from = new Date(data.from);
  const to = new Date(data.to);
  if (to <= from) {
    context.addIssue({ code: "custom", message: "Invalid date range" });
  }
  if (to.getTime() - from.getTime() > 93 * 24 * 60 * 60 * 1000) {
    context.addIssue({ code: "custom", message: "Date range cannot exceed 93 days" });
  }
});

export const calendarAppointmentParamsSchema = z.object({
  appointmentId: z.string().cuid()
});

export const updateCalendarStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus)
});

export const calendarRecentQuerySchema = z.object({
  since: z.string().datetime().optional()
});

export const createManualCalendarAppointmentSchema = z.object({
  serviceId: z.string().cuid(),
  branchId: z.string().min(1).optional(),
  assigneeId: z.string().cuid().optional(),
  startsAt: z.string().datetime(),
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(40),
  email: z
    .string()
    .trim()
    .max(254)
    .optional()
    .transform((value) => value || null)
    .pipe(z.string().email().nullable()),
  depositPaid: z.boolean().default(false),
  notes: z.string().trim().max(1000).optional()
});

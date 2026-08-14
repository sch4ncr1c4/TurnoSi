import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";

const calendarMinDate = new Date("2026-01-01T00:00:00.000Z");

export const calendarQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(120).optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z
    .enum(["pending", "confirmed", "paid", "paid_deposit", "completed", "canceled", "no_show"])
    .optional()
}).superRefine((data, context) => {
  const from = new Date(data.from);
  const to = new Date(data.to);
  const day = data.day ? new Date(`${data.day}T00:00:00.000Z`) : null;
  if (from < calendarMinDate || (day && day < calendarMinDate)) {
    context.addIssue({ code: "custom", message: "Calendar cannot query before 2026" });
  }
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

export const calendarIndicatorsQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime()
}).superRefine((data, context) => {
  const from = new Date(data.from);
  const to = new Date(data.to);
  if (from < calendarMinDate) {
    context.addIssue({ code: "custom", message: "Calendar cannot query before 2026" });
  }
  if (to <= from) {
    context.addIssue({ code: "custom", message: "Invalid date range" });
  }
  if (to.getTime() - from.getTime() > 45 * 24 * 60 * 60 * 1000) {
    context.addIssue({ code: "custom", message: "Indicator range cannot exceed 45 days" });
  }
});

export const updateCalendarStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus)
});

export const markCalendarDepositPaymentSchema = z.object({
  amountCents: z.number().int().min(1).max(10_000_000).optional(),
  method: z.enum(["cash", "bank_transfer", "other"]).default("cash")
});

export const rescheduleCalendarAppointmentSchema = z.object({
  startsAt: z.string().datetime()
});

export const calendarRecentQuerySchema = z.object({
  since: z.string().datetime().optional()
});

export const reservationNotificationSeenSchema = z.object({
  seenUntil: z.string().datetime()
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

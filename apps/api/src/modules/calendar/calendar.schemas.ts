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

import { AppointmentStatus, BookingChannel } from "@prisma/client";
import { z } from "zod";

export const appointmentsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  assignedUserId: z.string().cuid().optional()
});

export const createAppointmentSchema = z.object({
  customerId: z.string().cuid(),
  serviceId: z.string().cuid(),
  resourceId: z.string().cuid().optional(),
  assignedUserId: z.string().cuid().optional(),
  channel: z.nativeEnum(BookingChannel),
  title: z.string().min(2).max(120),
  notes: z.string().max(1000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.nativeEnum(AppointmentStatus).default(AppointmentStatus.pending)
});

export const appointmentParamsSchema = z.object({
  appointmentId: z.string().cuid()
});

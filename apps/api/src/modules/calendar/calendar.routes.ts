import { Router } from "express";

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { ok } from "../../lib/http.js";
import { authRateLimit } from "../../middlewares/rate-limit.js";
import { auditLog } from "../audit/audit.service.js";
import {
  calendarAppointmentParamsSchema,
  calendarQuerySchema,
  updateCalendarStatusSchema
} from "./calendar.schemas.js";

export const calendarRouter = Router();

calendarRouter.get("/appointments", async (request, response) => {
  const query = calendarQuerySchema.parse(request.query);
  const tenant = request.tenant!;

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId: tenant.organizationId,
      deletedAt: null,
      ...(tenant.role === "member" ? { assignedUserId: tenant.userId } : {}),
      startsAt: { gte: new Date(query.from), lt: new Date(query.to) }
    },
    include: {
      customer: true,
      service: true,
      assignedUser: {
        select: { firstName: true, lastName: true, email: true }
      }
    },
    orderBy: { startsAt: "asc" }
  });

  response.json(ok(appointments.map((appointment) => ({
    id: appointment.id,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    service: appointment.service.name,
    client: appointment.customer.fullName,
    assignee: appointment.assignedUser
      ? [appointment.assignedUser.firstName, appointment.assignedUser.lastName]
          .filter(Boolean).join(" ") || appointment.assignedUser.email
      : "Sin asignar",
    status: appointment.status,
    channel: appointment.channel
  }))));
});

calendarRouter.patch("/appointments/:appointmentId/status", authRateLimit, async (request, response) => {
  const { appointmentId } = calendarAppointmentParamsSchema.parse(request.params);
  const data = updateCalendarStatusSchema.parse(request.body);
  const tenant = request.tenant!;

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: tenant.organizationId,
      deletedAt: null,
      ...(tenant.role === "member" ? { assignedUserId: tenant.userId } : {})
    },
    select: { id: true, customerId: true, status: true }
  });
  if (!appointment) throw new AppError(404, "NOT_FOUND", "Appointment not found");

  await prisma.$transaction(async (transaction) => {
    await transaction.appointment.update({
      where: { id: appointment.id },
      data: { status: data.status }
    });
    if (appointment.status !== "no_show" && data.status === "no_show") {
      await transaction.customer.update({
        where: { id: appointment.customerId },
        data: { noShowCount: { increment: 1 } }
      });
    } else if (appointment.status === "no_show" && data.status !== "no_show") {
      await transaction.customer.updateMany({
        where: { id: appointment.customerId, noShowCount: { gt: 0 } },
        data: { noShowCount: { decrement: 1 } }
      });
    }
  });

  await auditLog({
    organizationId: tenant.organizationId,
    userId: request.auth!.sub,
    action: "appointment.status_changed",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: { status: data.status }
  });

  response.json(ok({ updated: true }));
});

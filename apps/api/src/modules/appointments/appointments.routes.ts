import { Router } from "express";

import { prisma } from "../../database/prisma.js";
import { AppError, notFound } from "../../lib/app-error.js";
import { ok } from "../../lib/http.js";
import { assertMembership, requireEditor } from "../../lib/membership.js";
import { paginate, paginatedResponse, paginationSchema } from "../../lib/pagination.js";
import { organizationParamsSchema } from "../../lib/schemas.js";
import { softDelete, restore } from "../../lib/soft-delete.js";
import { authRateLimit, authenticatedRateLimit } from "../../middlewares/rate-limit.js";
import { auditLog } from "../audit/audit.service.js";
import {
  appointmentsQuerySchema,
  createAppointmentSchema,
  appointmentParamsSchema
} from "./appointments.schemas.js";

export const appointmentsRouter = Router({ mergeParams: true });

appointmentsRouter.get("/", authenticatedRateLimit, async (request, response) => {
  const { organizationId } = organizationParamsSchema.parse(request.params);
  await assertMembership(request.auth!.sub, organizationId);
  const { from, to, status, assignedUserId, ...pagination } = appointmentsQuerySchema
    .merge(paginationSchema)
    .parse(request.query);

  const where = {
    organizationId,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(assignedUserId ? { assignedUserId } : {}),
    ...(from || to
      ? {
          startsAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {})
          }
        }
      : {})
  };

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        customer: true,
        service: true,
        resource: true,
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { startsAt: "asc" },
      ...paginate(pagination)
    }),
    prisma.appointment.count({ where })
  ]);

  response.json(ok(paginatedResponse(appointments, total, pagination)));
});

appointmentsRouter.post("/", authRateLimit, async (request, response) => {
  const { organizationId } = organizationParamsSchema.parse(request.params);
  const membership = await assertMembership(request.auth!.sub, organizationId);
  requireEditor(membership.role);
  const bodyData = createAppointmentSchema.parse(request.body);
  const data = { ...bodyData, createdById: request.auth!.sub };
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);

  if (endsAt <= startsAt) {
    throw new AppError(
      400,
      "INVALID_APPOINTMENT_RANGE",
      "Appointment end time must be after start time"
    );
  }

  const [organization, customer, service, resource, assignedUser, createdBy] =
    await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId }
      }),
      prisma.customer.findFirst({
        where: { id: data.customerId, organizationId, deletedAt: null }
      }),
      prisma.service.findFirst({
        where: { id: data.serviceId, organizationId, isActive: true }
      }),
      data.resourceId
        ? prisma.resource.findFirst({
            where: { id: data.resourceId, organizationId, isActive: true }
          })
        : Promise.resolve(null),
      data.assignedUserId
        ? prisma.membership.findFirst({
            where: { organizationId, userId: data.assignedUserId }
          })
        : Promise.resolve(null),
      data.createdById
        ? prisma.membership.findFirst({
            where: { organizationId, userId: data.createdById }
          })
        : Promise.resolve(null)
    ]);

  if (!organization) throw notFound("Organization not found");
  if (!customer) throw notFound("Customer not found");
  if (!service) throw notFound("Service not found");
  if (data.resourceId && !resource) throw notFound("Resource not found");
  if (data.assignedUserId && !assignedUser) throw notFound("Assigned user not found");
  if (data.createdById && !createdBy) throw notFound("Created by user not found");

  const conflictScopes = [
    ...(data.resourceId ? [{ resourceId: data.resourceId }] : []),
    ...(data.assignedUserId ? [{ assignedUserId: data.assignedUserId }] : [])
  ];

  const overlappingAppointment =
    conflictScopes.length > 0
      ? await prisma.appointment.findFirst({
          where: {
            organizationId,
            deletedAt: null,
            OR: conflictScopes,
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
            status: {
              in: ["pending", "confirmed"]
            }
          }
        })
      : null;

  if (overlappingAppointment) {
    throw new AppError(
      409,
      "APPOINTMENT_CONFLICT",
      "There is already an appointment in that time range"
    );
  }

  const appointment = await prisma.appointment.create({
    data: {
      organizationId,
      customerId: data.customerId,
      serviceId: data.serviceId,
      resourceId: data.resourceId,
      createdById: data.createdById,
      assignedUserId: data.assignedUserId,
      channel: data.channel,
      title: data.title,
      notes: data.notes,
      startsAt,
      endsAt,
      status: data.status
    },
    include: {
      customer: true,
      service: true,
      resource: true,
      assignedUser: {
        select: { id: true, firstName: true, lastName: true, email: true }
      }
    }
  });

  await auditLog({ userId: request.auth!.sub, organizationId, action: "appointment.create", entityType: "appointment", entityId: appointment.id });
  response.status(201).json(ok(appointment));
});

appointmentsRouter.delete("/:appointmentId", authRateLimit, async (request, response) => {
  const { organizationId } = organizationParamsSchema.parse(request.params);
  const membership = await assertMembership(request.auth!.sub, organizationId);
  requireEditor(membership.role);
  const { appointmentId } = appointmentParamsSchema.parse(request.params);

  const deleted = await softDelete("appointment", {
    id: appointmentId,
    organizationId
  });
  if (!deleted) {
    response.status(404).json({ success: false, message: "Appointment not found", code: "NOT_FOUND" });
    return;
  }

  response.json(ok({ deleted: true }));
});

appointmentsRouter.post("/:appointmentId/restore", authRateLimit, async (request, response) => {
  const { organizationId } = organizationParamsSchema.parse(request.params);
  const membership = await assertMembership(request.auth!.sub, organizationId);
  requireEditor(membership.role);
  const { appointmentId } = appointmentParamsSchema.parse(request.params);

  const restored = await restore("appointment", {
    id: appointmentId,
    organizationId
  });
  if (!restored) {
    response.status(404).json({ success: false, message: "Appointment not found", code: "NOT_FOUND" });
    return;
  }

  response.json(ok({ restored: true }));
});

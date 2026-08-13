import { Router } from "express";

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { ok } from "../../lib/http.js";
import { requireEditor } from "../../lib/membership.js";
import { authRateLimit } from "../../middlewares/rate-limit.js";
import { auditLog } from "../audit/audit.service.js";
import { visibleOperationalAppointmentWhere } from "../appointments/appointment-visibility.js";
import {
  customerIdentityData,
  customerIdentityWhere
} from "../customers/customer-identity.js";
import {
  calculateSlots,
  expireStaleDepositHolds
} from "../public-booking/public-booking.routes.js";
import {
  calendarAppointmentParamsSchema,
  calendarQuerySchema,
  calendarRecentQuerySchema,
  createManualCalendarAppointmentSchema,
  updateCalendarStatusSchema
} from "./calendar.schemas.js";

export const calendarRouter = Router();

calendarRouter.get("/appointments", async (request, response) => {
  const query = calendarQuerySchema.parse(request.query);
  const tenant = request.tenant!;
  await expireStaleDepositHolds(tenant.organizationId);

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId: tenant.organizationId,
      deletedAt: null,
      ...(tenant.role === "member" ? { assignedUserId: tenant.userId } : {}),
      startsAt: { gte: new Date(query.from), lt: new Date(query.to) },
      AND: [visibleOperationalAppointmentWhere]
    },
    include: {
      customer: true,
      service: true,
      depositPayment: true,
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
    createdAt: appointment.createdAt,
    service: appointment.service.name,
    client: appointment.customer.fullName,
    assignee: appointment.assignedUser
      ? [appointment.assignedUser.firstName, appointment.assignedUser.lastName]
          .filter(Boolean).join(" ") || appointment.assignedUser.email
      : "Sin asignar",
    status: appointment.status,
    channel: appointment.channel,
    depositPayment: appointment.depositPayment
      ? {
          status: appointment.depositPayment.status,
          amountCents: appointment.depositPayment.amountCents,
          paidAt: appointment.depositPayment.paidAt
        }
      : null
  }))));
});

calendarRouter.get("/appointments/recent", async (request, response) => {
  const query = calendarRecentQuerySchema.parse(request.query);
  const tenant = request.tenant!;
  const since = query.since
    ? new Date(query.since)
    : new Date(Date.now() - 24 * 60 * 60 * 1000);

  await expireStaleDepositHolds(tenant.organizationId);

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId: tenant.organizationId,
      deletedAt: null,
      channel: "web",
      createdAt: { gt: since },
      ...(tenant.role === "member" ? { assignedUserId: tenant.userId } : {}),
      AND: [visibleOperationalAppointmentWhere]
    },
    include: {
      customer: true,
      service: true,
      depositPayment: true,
      assignedUser: {
        select: { firstName: true, lastName: true, email: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  response.json(ok(appointments.map((appointment) => ({
    id: appointment.id,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    createdAt: appointment.createdAt,
    service: appointment.service.name,
    client: appointment.customer.fullName,
    assignee: appointment.assignedUser
      ? [appointment.assignedUser.firstName, appointment.assignedUser.lastName]
          .filter(Boolean).join(" ") || appointment.assignedUser.email
      : "Sin asignar",
    status: appointment.status,
    channel: appointment.channel,
    depositPayment: appointment.depositPayment
      ? {
          status: appointment.depositPayment.status,
          amountCents: appointment.depositPayment.amountCents,
          paidAt: appointment.depositPayment.paidAt
        }
      : null
  }))));
});

calendarRouter.post("/appointments/manual", authRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const data = createManualCalendarAppointmentSchema.parse(request.body);
  const organization = await prisma.organization.findUnique({
    where: { id: tenant.organizationId },
    select: { slug: true }
  });
  if (!organization) throw new AppError(404, "NOT_FOUND", "Organization not found");

  const context = await calculateSlots(
    organization.slug,
    data.serviceId,
    30,
    data.branchId,
    data.assigneeId
  );
  if (context.teamMembers.length > 0 && !data.assigneeId) {
    throw new AppError(400, "ASSIGNEE_REQUIRED", "Assigned user is required");
  }
  const slotIsAvailable = context.days.some((day) =>
    day.slots.some((slot) => slot.startsAt === data.startsAt)
  );
  if (!slotIsAvailable) {
    throw new AppError(409, "SLOT_UNAVAILABLE", "Selected slot is no longer available");
  }

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(startsAt.getTime() + context.service.durationMinutes * 60_000);
  const [firstName, ...lastNameParts] = data.customerName.trim().split(/\s+/);
  const identity = customerIdentityData(data);
  const appointment = await prisma.$transaction(async (transaction) => {
    const existing = await transaction.customer.findFirst({
      where: customerIdentityWhere(tenant.organizationId, data)
    });
    if (existing?.blockedAt) {
      throw new AppError(403, "CUSTOMER_BLOCKED", "Customer is blocked");
    }

    const customer = existing
      ? await transaction.customer.update({
          where: { id: existing.id },
          data: {
            firstName,
            lastName: lastNameParts.join(" ") || null,
            fullName: data.customerName,
            ...(identity.phone ? { phone: identity.phone } : {}),
            ...(identity.email ? { email: identity.email } : {})
          }
        })
      : await transaction.customer.create({
          data: {
            organizationId: tenant.organizationId,
            firstName,
            lastName: lastNameParts.join(" ") || null,
            fullName: data.customerName,
            phone: identity.phone,
            email: identity.email
          }
        });

    return transaction.appointment.create({
      data: {
        organizationId: tenant.organizationId,
        branchId: context.branch.id,
        customerId: customer.id,
        serviceId: context.service.id,
        resourceId: context.resourceId,
        assignedUserId: data.assigneeId ?? null,
        createdById: request.auth!.sub,
        channel: "in_person",
        title: context.service.name,
        notes: data.notes,
        startsAt,
        endsAt,
        status: "confirmed",
        ...(context.organization.depositEnabled && context.organization.depositAmountCents
          ? {
              depositPayment: {
                create: {
                  organizationId: tenant.organizationId,
                  amountCents: context.organization.depositAmountCents,
                  status: data.depositPaid ? "approved" : "pending",
                  paidAt: data.depositPaid ? new Date() : null,
                  statusDetail: data.depositPaid ? "manual_payment" : "manual_unpaid"
                }
              }
            }
          : {})
      },
      include: { depositPayment: true }
    });
  });

  await auditLog({
    organizationId: tenant.organizationId,
    userId: request.auth!.sub,
    action: "appointment.manual_create",
    entityType: "Appointment",
    entityId: appointment.id,
    metadata: { depositPaid: data.depositPaid }
  });

  response.status(201).json(
    ok({
      id: appointment.id,
      startsAt: appointment.startsAt,
      depositPayment: appointment.depositPayment
        ? {
            status: appointment.depositPayment.status,
            amountCents: appointment.depositPayment.amountCents
          }
        : null
    })
  );
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

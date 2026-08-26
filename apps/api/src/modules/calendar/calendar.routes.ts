import { Router } from "express";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { ok } from "../../lib/http.js";
import { requireEditor } from "../../lib/membership.js";
import { authenticatedRateLimit, authRateLimit } from "../../middlewares/rate-limit.js";
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
  calendarIndicatorsQuerySchema,
  calendarQuerySchema,
  calendarRecentQuerySchema,
  createManualCalendarAppointmentSchema,
  markCalendarDepositPaymentSchema,
  rescheduleCalendarAppointmentSchema,
  reservationNotificationSeenSchema,
  updateCalendarStatusSchema
} from "./calendar.schemas.js";

export const calendarRouter = Router();

function calendarAppointmentPayload(appointment: Prisma.AppointmentGetPayload<{
  include: {
    customer: true;
    service: true;
    depositPayment: true;
    assignedUser: {
      select: { firstName: true; lastName: true; email: true };
    };
  };
}>) {
  return {
    id: appointment.id,
    serviceId: appointment.serviceId,
    branchId: appointment.branchId,
    assigneeId: appointment.assignedUserId,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    createdAt: appointment.createdAt,
    confirmedByBusinessAt: appointment.confirmedByBusinessAt,
    service: appointment.service.name,
    client: appointment.customer.fullName,
    customerPhone: appointment.customer.phone,
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
          method: appointment.depositPayment.method,
          paidAt: appointment.depositPayment.paidAt
        }
      : null
  };
}

calendarRouter.get("/notifications/reservations", async (request, response) => {
  const tenant = request.tenant!;
  const states = await prisma.$queryRaw<Array<{ seenUntil: string | null }>>`
    SELECT to_char("seenUntil", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "seenUntil"
    FROM "ReservationNotificationState"
    WHERE "userId" = ${tenant.userId}
      AND "organizationId" = ${tenant.organizationId}
    LIMIT 1
  `;

  response.json(ok({
    seenUntil: states[0]?.seenUntil ?? null
  }));
});

calendarRouter.put("/notifications/reservations", authRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  const data = reservationNotificationSeenSchema.parse(request.body);
  const seenUntil = new Date(data.seenUntil);
  const seenUntilIso = seenUntil.toISOString();
  const stateId = randomUUID();

  await prisma.$executeRaw`
    INSERT INTO "ReservationNotificationState" (
      "id",
      "userId",
      "organizationId",
      "seenUntil",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${stateId},
      ${tenant.userId},
      ${tenant.organizationId},
      ${seenUntilIso}::timestamp,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("userId", "organizationId")
    DO UPDATE SET
      "seenUntil" = GREATEST(
        "ReservationNotificationState"."seenUntil",
        EXCLUDED."seenUntil"
      ),
      "updatedAt" = CURRENT_TIMESTAMP
  `;

  const states = await prisma.$queryRaw<Array<{ seenUntil: string | null }>>`
    SELECT to_char("seenUntil", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "seenUntil"
    FROM "ReservationNotificationState"
    WHERE "userId" = ${tenant.userId}
      AND "organizationId" = ${tenant.organizationId}
    LIMIT 1
  `;

  response.json(ok({ seenUntil: states[0]?.seenUntil ?? seenUntilIso }));
});

calendarRouter.get("/appointments", async (request, response) => {
  const query = calendarQuerySchema.parse(request.query);
  const tenant = request.tenant!;
  await expireStaleDepositHolds(tenant.organizationId);

  const search = query.search?.trim();
  const searchDigits = search?.replace(/\D/g, "");
  const from = query.day ? new Date(`${query.day}T00:00:00.000Z`) : new Date(query.from);
  const to = query.day
    ? new Date(new Date(`${query.day}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000)
    : new Date(query.to);
  const andWhere: Prisma.AppointmentWhereInput[] = [visibleOperationalAppointmentWhere];

  if (search) {
    andWhere.push({
      OR: [
        { customer: { fullName: { contains: search, mode: "insensitive" } } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search, mode: "insensitive" } } },
        ...(searchDigits ? [{ customer: { phone: { contains: searchDigits } } }] : []),
        { service: { name: { contains: search, mode: "insensitive" } } },
        { assignedUser: { firstName: { contains: search, mode: "insensitive" } } },
        { assignedUser: { lastName: { contains: search, mode: "insensitive" } } },
        { assignedUser: { email: { contains: search, mode: "insensitive" } } }
      ]
    });
  }

  if (query.status === "paid_deposit") {
    andWhere.push({
      status: "confirmed",
      depositPayment: { is: { status: "approved" } }
    });
  } else if (query.status) {
    andWhere.push({ status: query.status });
  }

  const where: Prisma.AppointmentWhereInput = {
    organizationId: tenant.organizationId,
    deletedAt: null,
    ...(tenant.role === "member" ? { assignedUserId: tenant.userId } : {}),
    startsAt: { gte: from, lt: to },
    AND: andWhere
  };

  const include = {
    customer: true,
    service: true,
    depositPayment: true,
    assignedUser: {
      select: { firstName: true, lastName: true, email: true }
    }
  } satisfies Prisma.AppointmentInclude;

  const appointments = await prisma.appointment.findMany({
    where,
    include,
    orderBy: { startsAt: "asc" },
    ...(query.limit ? { skip: query.offset, take: query.limit } : {})
  });

  if (query.limit) {
    const total = await prisma.appointment.count({ where });
    response.json(ok({
      items: appointments.map(calendarAppointmentPayload),
      total,
      limit: query.limit,
      offset: query.offset
    }));
    return;
  }

  response.json(ok(appointments.map(calendarAppointmentPayload)));
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
    serviceId: appointment.serviceId,
    branchId: appointment.branchId,
    assigneeId: appointment.assignedUserId,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    createdAt: appointment.createdAt,
    confirmedByBusinessAt: appointment.confirmedByBusinessAt,
    service: appointment.service.name,
    client: appointment.customer.fullName,
    customerPhone: appointment.customer.phone,
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
          method: appointment.depositPayment.method,
          paidAt: appointment.depositPayment.paidAt
        }
      : null
  }))));
});

calendarRouter.get("/appointments/indicators", async (request, response) => {
  const query = calendarIndicatorsQuerySchema.parse(request.query);
  const tenant = request.tenant!;

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId: tenant.organizationId,
      deletedAt: null,
      ...(tenant.role === "member" ? { assignedUserId: tenant.userId } : {}),
      startsAt: { gte: new Date(query.from), lt: new Date(query.to) },
      AND: [visibleOperationalAppointmentWhere]
    },
    select: { startsAt: true }
  });

  const counts = new Map<string, number>();
  for (const appointment of appointments) {
    const date = appointment.startsAt.toISOString().slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  response.json(ok(
    [...counts.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((first, second) => first.date.localeCompare(second.date))
  ));
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
    const conflict = await transaction.appointment.findFirst({
      where: {
        organizationId: tenant.organizationId,
        deletedAt: null,
        status: { in: ["pending", "confirmed"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        OR: [
          ...(context.resourceId ? [{ resourceId: context.resourceId }] : []),
          ...(data.assigneeId ? [{ assignedUserId: data.assigneeId }] : [])
        ]
      },
      select: { id: true }
    });
    if (conflict) {
      throw new AppError(409, "APPOINTMENT_CONFLICT", "There is already an appointment in that time range");
    }
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
        status: data.depositPaid ? "confirmed" : "pending",
        ...(context.organization.depositEnabled && context.organization.depositAmountCents
          ? {
              depositPayment: {
                create: {
                  organizationId: tenant.organizationId,
                  amountCents: context.organization.depositAmountCents,
                  method: data.depositPaid ? "cash" : null,
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
  }, { isolationLevel: "Serializable" });

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
            amountCents: appointment.depositPayment.amountCents,
            method: appointment.depositPayment.method
          }
        : null
    })
  );
});

calendarRouter.get("/appointments/:appointmentId/reschedule-slots", async (request, response) => {
  const { appointmentId } = calendarAppointmentParamsSchema.parse(request.params);
  const tenant = request.tenant!;
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: tenant.organizationId,
      deletedAt: null,
      ...(tenant.role === "member" ? { assignedUserId: tenant.userId } : {})
    },
    select: {
      id: true,
      serviceId: true,
      branchId: true,
      assignedUserId: true,
      organization: {
        select: { slug: true }
      }
    }
  });
  if (!appointment) throw new AppError(404, "NOT_FOUND", "Appointment not found");

  const result = await calculateSlots(
    appointment.organization.slug,
    appointment.serviceId,
    30,
    appointment.branchId ?? undefined,
    appointment.assignedUserId ?? undefined,
    appointment.id
  );

  response.json(ok({
    days: result.days,
    suggestedAssigneeId: result.suggestedAssignee?.userId ?? null
  }));
});

calendarRouter.patch("/appointments/:appointmentId/status", authenticatedRateLimit, async (request, response) => {
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
      data: {
        status: data.status,
        confirmedByBusinessAt: data.status === "confirmed" ? new Date() : null
      }
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

calendarRouter.patch("/appointments/:appointmentId/reschedule", authRateLimit, async (request, response) => {
  const { appointmentId } = calendarAppointmentParamsSchema.parse(request.params);
  const data = rescheduleCalendarAppointmentSchema.parse(request.body);
  const tenant = request.tenant!;
  requireEditor(tenant.role);

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: tenant.organizationId,
      deletedAt: null,
      ...(tenant.role === "member" ? { assignedUserId: tenant.userId } : {})
    },
    include: {
      service: { select: { durationMinutes: true } },
      organization: { select: { slug: true } }
    }
  });
  if (!appointment) throw new AppError(404, "NOT_FOUND", "Appointment not found");

  const startsAt = new Date(data.startsAt);
  const sameSlot = startsAt.getTime() === appointment.startsAt.getTime();
  const context = await calculateSlots(
    appointment.organization.slug,
    appointment.serviceId,
    30,
    appointment.branchId ?? undefined,
    appointment.assignedUserId ?? undefined,
    appointment.id
  );
  const slotIsAvailable =
    sameSlot ||
    context.days.some((day) =>
      day.slots.some((slot) => slot.startsAt === data.startsAt)
    );
  if (!slotIsAvailable) {
    throw new AppError(409, "SLOT_UNAVAILABLE", "Selected slot is no longer available");
  }

  const endsAt = new Date(
    startsAt.getTime() + appointment.service.durationMinutes * 60_000
  );
  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { startsAt, endsAt }
  });

  await auditLog({
    organizationId: tenant.organizationId,
    userId: request.auth!.sub,
    action: "appointment.rescheduled",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: {
      previousStartsAt: appointment.startsAt,
      startsAt
    }
  });

  response.json(ok({ startsAt, endsAt }));
});

calendarRouter.patch("/appointments/:appointmentId/deposit-payment", authenticatedRateLimit, async (request, response) => {
  const { appointmentId } = calendarAppointmentParamsSchema.parse(request.params);
  const data = markCalendarDepositPaymentSchema.parse(request.body ?? {});
  const tenant = request.tenant!;
  requireEditor(tenant.role);

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: tenant.organizationId,
      deletedAt: null
    },
    select: {
      id: true,
      customerId: true,
      status: true,
      depositPayment: {
        select: {
          id: true,
          amountCents: true,
          method: true
        }
      },
      organization: {
        select: {
          depositAmountCents: true
        }
      }
    }
  });
  if (!appointment) throw new AppError(404, "NOT_FOUND", "Appointment not found");

  const amountCents =
    data.amountCents ??
    appointment.depositPayment?.amountCents ??
    appointment.organization.depositAmountCents;
  if (!amountCents) {
    throw new AppError(
      400,
      "DEPOSIT_NOT_CONFIGURED",
      "Deposit amount is not configured"
    );
  }

  const depositPayment = await prisma.$transaction(async (transaction) => {
    const paidAt = new Date();
    await transaction.appointment.update({
      where: { id: appointment.id },
      data: { status: "confirmed" }
    });
    if (appointment.status === "no_show") {
      await transaction.customer.updateMany({
        where: { id: appointment.customerId, noShowCount: { gt: 0 } },
        data: { noShowCount: { decrement: 1 } }
      });
    }

    if (appointment.depositPayment) {
      return transaction.appointmentDepositPayment.update({
        where: { id: appointment.depositPayment.id },
        data: {
          status: "approved",
          amountCents,
          method: data.method,
          paidAt,
          statusDetail: "manual_payment"
        },
        select: { status: true, amountCents: true, method: true, paidAt: true }
      });
    }

    return transaction.appointmentDepositPayment.create({
      data: {
        organizationId: tenant.organizationId,
        appointmentId: appointment.id,
        amountCents,
        method: data.method,
        status: "approved",
        paidAt,
        statusDetail: "manual_payment"
      },
      select: { status: true, amountCents: true, method: true, paidAt: true }
    });
  });

  await auditLog({
    organizationId: tenant.organizationId,
    userId: request.auth!.sub,
    action: "appointment.deposit_paid",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: { amountCents, method: data.method }
  });

  response.json(ok({ status: "confirmed", depositPayment }));
});

calendarRouter.delete("/appointments/:appointmentId/deposit-payment", authenticatedRateLimit, async (request, response) => {
  const { appointmentId } = calendarAppointmentParamsSchema.parse(request.params);
  const tenant = request.tenant!;
  requireEditor(tenant.role);

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: tenant.organizationId,
      deletedAt: null
    },
    select: {
      id: true,
      depositPayment: {
        select: {
          id: true,
          amountCents: true,
          checkoutUrl: true,
          mercadoPagoPreferenceId: true,
          mercadoPagoPaymentId: true,
          method: true,
          status: true
        }
      }
    }
  });
  if (!appointment) throw new AppError(404, "NOT_FOUND", "Appointment not found");
  if (!appointment.depositPayment) {
    response.json(ok({ depositPayment: null }));
    return;
  }
  if (
    appointment.depositPayment.mercadoPagoPaymentId ||
    appointment.depositPayment.mercadoPagoPreferenceId ||
    appointment.depositPayment.checkoutUrl ||
    appointment.depositPayment.method === "mercadopago"
  ) {
    throw new AppError(
      409,
      "EXTERNAL_PAYMENT_CANNOT_BE_CLEARED",
      "Online deposit payments cannot be cleared manually"
    );
  }

  await prisma.appointmentDepositPayment.delete({
    where: { id: appointment.depositPayment.id }
  });

  await auditLog({
    organizationId: tenant.organizationId,
    userId: request.auth!.sub,
    action: "appointment.deposit_cleared",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: {
      amountCents: appointment.depositPayment.amountCents,
      method: appointment.depositPayment.method,
      previousStatus: appointment.depositPayment.status
    }
  });

  response.json(ok({ depositPayment: null }));
});

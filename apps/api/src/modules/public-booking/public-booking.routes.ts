import { Prisma } from "@prisma/client";
import { Router } from "express";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

import { env } from "../../config/env.js";
import { serveGalleryImage, serveLogo } from "../../lib/logo.js";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { decryptSecret } from "../../lib/crypto.js";
import { ok } from "../../lib/http.js";
import { zonedTimeToUtc } from "../../lib/timezone.js";
import {
  publicBookingRateLimit,
  publicSlotsRateLimit
} from "../../middlewares/rate-limit.js";
import {
  createPublicBookingSchema,
  publicBookingParamsSchema,
  publicSlotsQuerySchema
} from "./public-booking.schemas.js";
import {
  assigneeHasCapacity,
  slotHasCapacity,
  type ScheduledAppointment
} from "./booking-capacity.service.js";
import { hasActiveSubscription } from "../billing/subscription-access.service.js";
import {
  customerIdentityData,
  customerIdentityWhere
} from "../customers/customer-identity.js";

export const publicBookingRouter = Router();

const DEPOSIT_PAYMENT_HOLD_MINUTES = 15;

function normalizeAppointmentPaymentStatus(status?: string) {
  if (status === "approved") return "approved" as const;
  if (status === "rejected") return "rejected" as const;
  if (status === "cancelled" || status === "canceled") return "cancelled" as const;
  if (status === "refunded") return "refunded" as const;
  if (status === "charged_back") return "charged_back" as const;
  if (status === "pending" || status === "in_process" || status === "authorized") {
    return "pending" as const;
  }
  return "unknown" as const;
}

function marketplaceOrigin() {
  return env.WEB_ORIGIN.split(",")[0];
}

function publicApiOrigin() {
  return env.API_PUBLIC_URL ?? marketplaceOrigin();
}

function merchantPreferenceClient(accessTokenEncrypted: string) {
  const accessToken = decryptSecret(accessTokenEncrypted, env.AUTH_SECRET);
  return new Preference(new MercadoPagoConfig({ accessToken }));
}

function merchantPaymentClient(accessTokenEncrypted: string) {
  const accessToken = decryptSecret(accessTokenEncrypted, env.AUTH_SECRET);
  return new Payment(new MercadoPagoConfig({ accessToken }));
}

function depositPaymentHoldCutoff() {
  return new Date(Date.now() - DEPOSIT_PAYMENT_HOLD_MINUTES * 60_000);
}

function activeAppointmentConflictWhere(
  holdCutoff: Date
): Prisma.AppointmentWhereInput {
  return {
    OR: [
      { status: "confirmed" },
      {
        status: "pending",
        OR: [
          { depositPayment: { is: null } },
          {
            depositPayment: {
              is: {
                status: "pending",
                createdAt: { gte: holdCutoff }
              }
            }
          }
        ]
      }
    ]
  };
}

export async function expireStaleDepositHolds(organizationId: string) {
  const holdCutoff = depositPaymentHoldCutoff();

  await prisma.appointment.updateMany({
    where: {
      organizationId,
      deletedAt: null,
      status: "pending",
      depositPayment: {
        is: {
          status: "pending",
          createdAt: { lt: holdCutoff }
        }
      }
    },
    data: { deletedAt: new Date() }
  });

  await prisma.appointmentDepositPayment.updateMany({
    where: {
      organizationId,
      status: "pending",
      createdAt: { lt: holdCutoff }
    },
    data: {
      status: "cancelled",
      statusDetail: "hold_expired"
    }
  });
}

async function syncAppointmentDepositPayment(organizationId: string, paymentId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { mercadoPagoAccessTokenEncrypted: true }
  });
  if (!organization?.mercadoPagoAccessTokenEncrypted) return;

  const payment = await merchantPaymentClient(
    organization.mercadoPagoAccessTokenEncrypted
  ).get({ id: paymentId });
  const depositId = String(payment.external_reference ?? "").replace(
    "booking-deposit:",
    ""
  );
  if (!depositId) return;

  const status = normalizeAppointmentPaymentStatus(payment.status);
  await prisma.$transaction(async (transaction) => {
    const deposit = await transaction.appointmentDepositPayment.findFirst({
      where: { id: depositId, organizationId },
      select: { id: true, appointmentId: true }
    });
    if (!deposit) return;

    await transaction.appointmentDepositPayment.update({
      where: { id: deposit.id },
      data: {
        mercadoPagoPaymentId: paymentId,
        method: "mercadopago",
        status,
        statusDetail: payment.status_detail ?? null,
        paidAt: payment.date_approved ? new Date(payment.date_approved) : null,
        raw: payment as object
      }
    });

    if (status === "approved") {
      await transaction.appointment.update({
        where: { id: deposit.appointmentId },
        data: { status: "confirmed" }
      });
    }
  });
}

publicBookingRouter.post("/webhooks/mercadopago", async (request, response) => {
  const organizationId = String(request.query.organizationId ?? "");
  const dataId =
    String(request.query["data.id"] ?? "") ||
    String((request.body as { data?: { id?: string } }).data?.id ?? "");
  const type = String(request.query.type ?? request.body?.type ?? "");

  if (!organizationId || !dataId || type !== "payment") {
    response.sendStatus(200);
    return;
  }

  await syncAppointmentDepositPayment(organizationId, dataId);
  response.sendStatus(200);
});

function isResourceOnlyBookingCategory(category: string | null) {
  return category?.toLowerCase().includes("cancha") ?? false;
}

function localDateInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function localHourInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}-${value.hour}`;
}

function localMinuteInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(value.hour) * 60 + Number(value.minute);
}

function subtractWindow(
  windows: { start: number; end: number }[],
  blocked: { start: number; end: number }
) {
  return windows.flatMap((window) => {
    if (blocked.end <= window.start || blocked.start >= window.end) return [window];
    const next = [];
    if (blocked.start > window.start) {
      next.push({ start: window.start, end: Math.min(blocked.start, window.end) });
    }
    if (blocked.end < window.end) {
      next.push({ start: Math.max(blocked.end, window.start), end: window.end });
    }
    return next;
  });
}

async function getPublicBranch(organization: {
  id: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
}, branchId?: string) {
  if (branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId: organization.id, isActive: true }
    });
    if (!branch) throw new AppError(404, "NOT_FOUND", "Branch not found");
    return branch;
  }
  const existing = await prisma.branch.findFirst({
    where: { organizationId: organization.id, isMain: true, isActive: true }
  });
  if (existing) return existing;
  return prisma.branch.create({
    data: {
      organizationId: organization.id,
      name: "Sede principal",
      slug: "sede-principal",
      phone: organization.phone,
      whatsapp: organization.whatsapp,
      address: organization.address,
      city: organization.city,
      province: organization.province,
      isMain: true
    }
  });
}

async function getPublicContext(slug: string, serviceId: string, branchId?: string) {
  const organization = await prisma.organization.findUnique({
    where: { slug }
  });
  if (!organization) throw new AppError(404, "NOT_FOUND", "Business not found");
  if (!(await hasActiveSubscription(organization.id))) {
    throw new AppError(
      403,
      "BOOKING_UNAVAILABLE",
      "Online booking is not available"
    );
  }
  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      organizationId: organization.id,
      isActive: true,
      isOnlineBookable: true
    },
    include: { resourceLinks: { include: { resource: true }, take: 1 } }
  });
  if (!service) throw new AppError(404, "NOT_FOUND", "Service not found");
  const branch = await getPublicBranch(organization, branchId);
  const teamMembers = isResourceOnlyBookingCategory(organization.category)
    ? []
    : await prisma.membership.findMany({
        where: {
          organizationId: organization.id,
          bookingsEnabled: true,
          visibleInPublicBooking: true,
          branches: { some: { branchId: branch.id } }
        },
        select: {
          userId: true,
          hourlyCapacity: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: "asc" }
      });
  const mappedTeamMembers = teamMembers.map((member) => ({
    userId: member.userId,
      hourlyCapacity: member.hourlyCapacity,
    name:
      [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") ||
      member.user.email
  }));
  return {
    organization,
    branch,
    service,
    resourceId: service.resourceLinks[0]?.resourceId ?? null,
    teamMembers: mappedTeamMembers
  };
}

async function getPublicTeam(organization: {
  id: string;
  category: string | null;
  memberships: {
    userId: string;
    hourlyCapacity: number;
    branches: { branchId: string }[];
    user: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  }[];
}) {
  if (isResourceOnlyBookingCategory(organization.category)) return [];
  return organization.memberships.map((member) => ({
    id: member.userId,
    branchIds: member.branches.map((branch) => branch.branchId),
    name:
      [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") ||
      member.user.email,
    hourlyCapacity: member.hourlyCapacity
  }));
}

function publicServicePayload(service: {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number | null;
  resourceLinks: { resource: { name: string } }[];
}) {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    durationMinutes: service.durationMinutes,
    priceCents: service.priceCents,
    resourceName: service.resourceLinks[0]?.resource.name ?? null
  };
}

function getRecommendedAssignee(
  appointments: ScheduledAppointment[],
  teamMembers: { userId: string; hourlyCapacity: number; name: string }[],
  timezone: string
) {
  if (teamMembers.length === 0) return null;
  const today = localDateInTimezone(new Date(), timezone);
  return [...teamMembers]
    .sort((first, second) => {
      const firstCount = appointments.filter(
        (appointment) =>
          appointment.assignedUserId === first.userId &&
          localDateInTimezone(appointment.startsAt, timezone) === today
      ).length;
      const secondCount = appointments.filter(
        (appointment) =>
          appointment.assignedUserId === second.userId &&
          localDateInTimezone(appointment.startsAt, timezone) === today
      ).length;
      return firstCount - secondCount || first.name.localeCompare(second.name);
    })[0];
}

export async function calculateSlots(
  slug: string,
  serviceId: string,
  dayCount: number,
  branchId?: string,
  selectedAssigneeId?: string,
  excludeAppointmentId?: string
) {
  const { organization, branch, service, resourceId, teamMembers } = await getPublicContext(
    slug,
    serviceId,
    branchId
  );
  await expireStaleDepositHolds(organization.id);
  const selectedAssignee = selectedAssigneeId
    ? teamMembers.find((member) => member.userId === selectedAssigneeId) ?? null
    : null;
  if (selectedAssigneeId && !selectedAssignee) {
    throw new AppError(404, "NOT_FOUND", "Team member not found");
  }
  const today = localDateInTimezone(new Date(), organization.timezone);
  const requiresTeam = !isResourceOnlyBookingCategory(organization.category);
  const base = new Date(`${today}T00:00:00.000Z`);
  const lastDay = new Date(base.getTime() + (dayCount - 1) * 86_400_000);

  const dayStart = zonedTimeToUtc(today, 0, organization.timezone);
  const dayEnd = zonedTimeToUtc(
    lastDay.toISOString().slice(0, 10),
    1440,
    organization.timezone
  );
  const activeConflictWhere = activeAppointmentConflictWhere(depositPaymentHoldCutoff());

  const [availabilityRules, availabilityExceptions, appointments] =
    await Promise.all([
      prisma.availabilityRule.findMany({
        where: {
          organizationId: organization.id,
          branchId: branch.id,
          userId: null,
          resourceId: null
        },
        orderBy: [{ weekday: "asc" }, { startMinute: "asc" }]
      }),
      prisma.availabilityException.findMany({
        where: {
          organizationId: organization.id,
          branchId: branch.id,
          userId: null,
          resourceId: null,
          startsAt: { lt: dayEnd },
          endsAt: { gt: dayStart }
        }
      }),
      prisma.appointment.findMany({
        where: {
          organizationId: organization.id,
          branchId: branch.id,
          ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
          deletedAt: null,
          startsAt: { lt: new Date(dayEnd.getTime() + 180 * 60_000) },
          endsAt: { gt: new Date(dayStart.getTime() - 180 * 60_000) },
          AND: [
            activeConflictWhere,
            resourceId
              ? { OR: [{ serviceId: service.id }, { resourceId }] }
              : { serviceId: service.id }
          ]
        },
        select: {
          serviceId: true,
          resourceId: true,
          assignedUserId: true,
          startsAt: true,
          endsAt: true,
          service: {
            select: {
              bufferBeforeMinutes: true,
              bufferAfterMinutes: true
            }
          }
        }
      })
    ]);

  const result = [];
  for (let offset = 0; offset < dayCount; offset += 1) {
    const dateValue = new Date(base.getTime() + offset * 86_400_000);
    const date = dateValue.toISOString().slice(0, 10);
    const weekday = (dateValue.getUTCDay() + 6) % 7;
    let windows = availabilityRules
      .filter((rule) => rule.weekday === weekday)
      .map((rule) => ({ start: rule.startMinute, end: rule.endMinute }));
    const slotDayStart = zonedTimeToUtc(date, 0, organization.timezone);
    const slotDayEnd = zonedTimeToUtc(date, 1440, organization.timezone);
    const exceptions = availabilityExceptions.filter(
      (exception) => localDateInTimezone(exception.startsAt, organization.timezone) === date
    );
    if (exceptions.some((exception) =>
      !exception.isAvailable &&
      exception.startsAt.getTime() <= slotDayStart.getTime() &&
      exception.endsAt.getTime() >= slotDayEnd.getTime()
    )) {
      windows = [];
    }
    const special = exceptions.find((exception) => exception.isAvailable);
    if (special) {
      windows = [{
        start: localMinuteInTimezone(special.startsAt, organization.timezone),
        end: localMinuteInTimezone(special.endsAt, organization.timezone)
      }];
    }
    for (const exception of exceptions.filter((item) => !item.isAvailable)) {
      if (
        exception.startsAt.getTime() <= slotDayStart.getTime() &&
        exception.endsAt.getTime() >= slotDayEnd.getTime()
      ) continue;
      windows = subtractWindow(windows, {
        start: localMinuteInTimezone(exception.startsAt, organization.timezone),
        end: localMinuteInTimezone(exception.endsAt, organization.timezone)
      });
    }
    const dayAppointments = appointments.filter(
      (appointment) =>
        appointment.endsAt.getTime() +
          appointment.service.bufferAfterMinutes * 60_000 >
          slotDayStart.getTime() &&
        appointment.startsAt.getTime() -
          appointment.service.bufferBeforeMinutes * 60_000 <
          slotDayEnd.getTime()
    );
    const slots = windows.flatMap((window) => {
      const values = [];
      for (
        let minute = window.start + service.bufferBeforeMinutes;
        minute + service.durationMinutes + service.bufferAfterMinutes <= window.end;
        minute += organization.bookingIntervalMinutes
      ) {
        const startsAt = zonedTimeToUtc(date, minute, organization.timezone);
        const endsAt = new Date(
          startsAt.getTime() + service.durationMinutes * 60_000
        );
        const hasServiceSlot = slotHasCapacity(
          dayAppointments,
          { service, resourceId },
          startsAt,
          endsAt
        );
        const eligibleAssignees =
          teamMembers.length === 0
            ? []
            : teamMembers.filter((member) =>
                assigneeHasCapacity(
                  dayAppointments,
                  member,
                  startsAt,
                  endsAt,
                  organization.timezone,
                  { service, resourceId }
                )
              );
        if (
          hasServiceSlot &&
          (!requiresTeam ||
            (selectedAssignee
              ? eligibleAssignees.some(
                  (member) => member.userId === selectedAssignee.userId
                )
              : eligibleAssignees.length > 0)) &&
          startsAt > new Date()
        ) {
          values.push({
            time: `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
            startsAt: startsAt.toISOString()
          });
        }
      }
      return values;
    });
    result.push({ date, slots });
  }
  return {
    organization,
    branch,
    service,
    resourceId,
    days: result,
    teamMembers,
    suggestedAssignee: getRecommendedAssignee(
      appointments,
      teamMembers,
      organization.timezone
    )
  };
}

publicBookingRouter.get("/:organizationSlug", async (request, response) => {
  const { organizationSlug } = publicBookingParamsSchema.parse(request.params);
  const organization = await prisma.organization.findUnique({
    where: { slug: organizationSlug },
    include: {
      memberships: {
        where: {
          bookingsEnabled: true,
          visibleInPublicBooking: true
        },
        select: {
          userId: true,
          hourlyCapacity: true,
          branches: { select: { branchId: true } },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: "asc" }
      },
      services: {
        where: { isActive: true, isOnlineBookable: true },
        include: { resourceLinks: { include: { resource: true }, take: 1 } },
        orderBy: { name: "asc" }
      },
      branches: {
        where: { isActive: true },
        orderBy: [{ isMain: "desc" }, { name: "asc" }]
      },
      logo: { select: { organizationId: true, updatedAt: true } },
      galleryImages: { select: { slot: true, focusX: true, focusY: true, zoom: true, updatedAt: true } }
    }
  });
  if (!organization) throw new AppError(404, "NOT_FOUND", "Business not found");
  if (!(await hasActiveSubscription(organization.id))) {
    throw new AppError(
      403,
      "BOOKING_UNAVAILABLE",
      "Online booking is not available"
    );
  }
  if (organization.branches.length === 0) {
    const branch = await getPublicBranch(organization);
    organization.branches.push(branch);
  }
  response.json(ok({
    organization: {
      name: organization.name,
      slug: organization.slug,
      category: organization.category,
      address: organization.address,
      city: organization.city,
      province: organization.province,
      description: organization.description,
      phone: organization.phone,
      whatsapp: organization.whatsapp,
      publicEmail: organization.publicEmail,
      instagram: organization.instagram,
      deposit: {
        enabled: Boolean(
          organization.depositEnabled &&
          organization.depositAmountCents &&
          organization.mercadoPagoAccessTokenEncrypted
        ),
        amountCents: organization.depositAmountCents
      },
      hasLogo: Boolean(organization.logo),
      logoVersion: organization.logo?.updatedAt.getTime() ?? null,
      galleryImageSlots: organization.galleryImages.map((image) => image.slot).sort()
      ,
      galleryVersions: organization.galleryImages
        .map((image) => ({
          slot: image.slot,
          version: image.updatedAt.getTime()
        }))
        .sort((first, second) => first.slot - second.slot),
      galleryFocus: organization.galleryImages
        .map((image) => ({
          slot: image.slot,
          focusX: image.focusX,
          focusY: image.focusY,
          zoom: image.zoom
        }))
        .sort((first, second) => first.slot - second.slot)
    },
    branches: organization.branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address ?? organization.address,
      city: branch.city ?? organization.city,
      province: branch.province ?? organization.province,
      phone: branch.phone ?? organization.phone,
      whatsapp: branch.whatsapp ?? organization.whatsapp,
      isMain: branch.isMain
    })),
    team: await getPublicTeam(organization),
    services: organization.services.map(publicServicePayload)
  }));
});

publicBookingRouter.get("/:organizationSlug/logo", async (request, response) => {
  const { organizationSlug } = publicBookingParamsSchema.parse(request.params);
  const organization = await prisma.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true }
  });
  if (!organization) return response.sendStatus(404);
  await serveLogo(organization.id, response, { cacheControl: "public, max-age=300" });
});

publicBookingRouter.get("/:organizationSlug/gallery/:slot", async (request, response) => {
  const { organizationSlug } = publicBookingParamsSchema.parse(request.params);
  const slot = Number(request.params.slot);
  if (Number.isNaN(slot) || slot < 0 || slot > 1) return response.sendStatus(404);
  const organization = await prisma.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true }
  });
  if (!organization) return response.sendStatus(404);
  await serveGalleryImage(organization.id, slot, response, {
    cacheControl: "public, max-age=300"
  });
});

publicBookingRouter.get("/:organizationSlug/slots", publicSlotsRateLimit, async (request, response) => {
  const { organizationSlug } = publicBookingParamsSchema.parse(request.params);
  const query = publicSlotsQuerySchema.parse(request.query);
  const result = await calculateSlots(
    organizationSlug,
    query.serviceId,
    query.days,
    query.branchId,
    query.assigneeId
  );
  response.json(
    ok({
      days: result.days,
      suggestedAssigneeId: result.suggestedAssignee?.userId ?? null
    })
  );
});

publicBookingRouter.post(
  "/:organizationSlug/appointments",
  publicBookingRateLimit,
  async (request, response) => {
    const { organizationSlug } = publicBookingParamsSchema.parse(request.params);
    const data = createPublicBookingSchema.parse(request.body);
    const context = await calculateSlots(
      organizationSlug,
      data.serviceId,
      30,
      data.branchId,
      data.assigneeId
    );
    const valid = context.days.some((day) =>
      day.slots.some((slot) => slot.startsAt === data.startsAt)
    );
    if (!valid) throw new AppError(409, "SLOT_UNAVAILABLE", "Selected slot is no longer available");

    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(startsAt.getTime() + context.service.durationMinutes * 60_000);
    const [firstName, ...lastNameParts] = data.name.trim().split(/\s+/);
    const depositRequired = Boolean(
      context.organization.depositEnabled &&
      context.organization.depositAmountCents &&
      context.organization.mercadoPagoAccessTokenEncrypted
    );
    const activeConflictWhere = activeAppointmentConflictWhere(depositPaymentHoldCutoff());
    let appointment = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        appointment = await prisma.$transaction(async (transaction) => {
          const candidates: ScheduledAppointment[] =
            await transaction.appointment.findMany({
              where: {
                organizationId: context.organization.id,
                branchId: context.branch.id,
                deletedAt: null,
                startsAt: {
                  lt: new Date(
                    endsAt.getTime() +
                      (context.service.bufferAfterMinutes + 180) * 60_000
                  )
                },
                endsAt: {
                  gt: new Date(
                    startsAt.getTime() -
                      (context.service.bufferBeforeMinutes + 180) * 60_000
                  )
                },
                AND: [
                  activeConflictWhere,
                  context.resourceId
                    ? {
                        OR: [
                          { serviceId: context.service.id },
                          { resourceId: context.resourceId }
                        ]
                      }
                    : { serviceId: context.service.id }
                ]
              },
              select: {
                serviceId: true,
                resourceId: true,
                assignedUserId: true,
                startsAt: true,
                endsAt: true,
                service: {
                  select: {
                    bufferBeforeMinutes: true,
                    bufferAfterMinutes: true
                  }
                }
              }
            });
          if (!slotHasCapacity(candidates, context, startsAt, endsAt)) {
            throw new AppError(
              409,
              "SLOT_UNAVAILABLE",
              "Selected slot is no longer available"
            );
          }
          const assignedUserId =
            context.teamMembers.length === 0
              ? null
              : data.assigneeId
                ? assigneeHasCapacity(
                    candidates,
                    {
                      userId: data.assigneeId,
                      hourlyCapacity:
                        context.teamMembers.find((member) => member.userId === data.assigneeId)
                          ?.hourlyCapacity ?? 0
                    },
                    startsAt,
                    endsAt,
                    context.organization.timezone,
                    context
                  )
                  ? data.assigneeId
                  : null
                : [...context.teamMembers]
                    .sort((first, second) => {
                      const firstLoad = candidates.filter(
                        (appointment) =>
                          appointment.assignedUserId === first.userId &&
                          localHourInTimezone(
                            appointment.startsAt,
                            context.organization.timezone
                          ) ===
                            localHourInTimezone(
                              startsAt,
                              context.organization.timezone
                            )
                      ).length;
                      const secondLoad = candidates.filter(
                        (appointment) =>
                          appointment.assignedUserId === second.userId &&
                          localHourInTimezone(
                            appointment.startsAt,
                            context.organization.timezone
                          ) ===
                            localHourInTimezone(
                              startsAt,
                              context.organization.timezone
                            )
                      ).length;
                      return firstLoad - secondLoad || first.name.localeCompare(second.name);
                    })
                    .find((member) =>
                      assigneeHasCapacity(
                        candidates,
                        member,
                        startsAt,
                        endsAt,
                        context.organization.timezone,
                        context
                      )
                    )?.userId ?? null;
          if (context.teamMembers.length > 0 && !assignedUserId) {
            throw new AppError(
              409,
              "SLOT_UNAVAILABLE",
              "Selected slot is no longer available"
            );
          }
          const identity = customerIdentityData(data);
          const existing = await transaction.customer.findFirst({
            where: customerIdentityWhere(context.organization.id, data)
          });
          if (existing?.blockedAt) {
            throw new AppError(
              403,
              "BOOKING_NOT_ALLOWED",
              "Online booking is not available for this customer"
            );
          }
          const bookingDay = localDateInTimezone(
            startsAt,
            context.organization.timezone
          );
          const bookingDayStart = zonedTimeToUtc(
            bookingDay,
            0,
            context.organization.timezone
          );
          const bookingDayEnd = zonedTimeToUtc(
            bookingDay,
            1440,
            context.organization.timezone
          );
          const duplicateDailyAppointment = await transaction.appointment.findFirst({
            where: {
              organizationId: context.organization.id,
              deletedAt: null,
              startsAt: { gte: bookingDayStart, lt: bookingDayEnd },
              AND: [
                activeConflictWhere,
                {
                  customer: customerIdentityWhere(context.organization.id, data)
                }
              ]
            },
            select: { id: true }
          });
          if (duplicateDailyAppointment) {
            throw new AppError(
              409,
              "CUSTOMER_DAILY_LIMIT",
              "Customer already has an appointment for that day"
            );
          }
          const customer = existing
            ? await transaction.customer.update({
                where: { id: existing.id },
                data: {
                  firstName,
                  lastName: lastNameParts.join(" ") || null,
                  fullName: data.name,
                  ...(identity.email ? { email: identity.email } : {}),
                  ...(identity.phone ? { phone: identity.phone } : {})
                }
              })
            : await transaction.customer.create({
                data: {
                  organizationId: context.organization.id,
                  firstName,
                  lastName: lastNameParts.join(" ") || null,
                  fullName: data.name,
                  email: identity.email,
                  phone: identity.phone
                }
              });
          return transaction.appointment.create({
            data: {
              organizationId: context.organization.id,
              branchId: context.branch.id,
              customerId: customer.id,
              serviceId: context.service.id,
              resourceId: context.resourceId,
              assignedUserId,
              channel: "web",
              title: context.service.name,
              startsAt,
              endsAt,
              status: "pending",
              ...(depositRequired
                ? {
                    depositPayment: {
                      create: {
                        organizationId: context.organization.id,
                        amountCents: context.organization.depositAmountCents!,
                        method: "mercadopago"
                      }
                    }
                  }
                : {})
            },
            include: { depositPayment: true }
          });
        }, { isolationLevel: "Serializable" });
        break;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < 2
        ) {
          continue;
        }
        throw error;
      }
    }
    if (!appointment) {
      throw new AppError(409, "SLOT_UNAVAILABLE", "Selected slot is no longer available");
    }

    if (
      appointment.depositPayment &&
      context.organization.mercadoPagoAccessTokenEncrypted
    ) {
      try {
        const preference = await merchantPreferenceClient(
          context.organization.mercadoPagoAccessTokenEncrypted
        ).create({
          body: {
            external_reference: `booking-deposit:${appointment.depositPayment.id}`,
            notification_url: `${publicApiOrigin()}/api/v1/public/booking/webhooks/mercadopago?organizationId=${context.organization.id}`,
            back_urls: {
              success: `${marketplaceOrigin()}/book/${organizationSlug}?payment=success`,
              pending: `${marketplaceOrigin()}/book/${organizationSlug}?payment=pending`,
              failure: `${marketplaceOrigin()}/book/${organizationSlug}?payment=failure`
            },
            items: [
              {
                id: context.service.id,
                title: `Seña - ${context.service.name}`,
                quantity: 1,
                unit_price: appointment.depositPayment.amountCents / 100,
                currency_id: "ARS"
              }
            ]
          }
        });
        const checkoutUrl = preference.init_point ?? preference.sandbox_init_point;
        if (!preference.id || !checkoutUrl) {
          throw new Error("Mercado Pago did not return a checkout URL");
        }
        await prisma.appointmentDepositPayment.update({
          where: { id: appointment.depositPayment.id },
          data: {
            mercadoPagoPreferenceId: preference.id,
            checkoutUrl
          }
        });
        response.status(201).json(
          ok({
            id: appointment.id,
            startsAt: appointment.startsAt,
            status: "pending_payment",
            checkoutUrl
          })
        );
        return;
      } catch (error) {
        await prisma.$transaction([
          prisma.appointment.update({
            where: { id: appointment.id },
            data: { deletedAt: new Date() }
          }),
          prisma.appointmentDepositPayment.update({
            where: { id: appointment.depositPayment.id },
            data: { status: "unknown" }
          })
        ]);
        throw error;
      }
    }

    response.status(201).json(
      ok({ id: appointment.id, startsAt: appointment.startsAt, status: "pending" })
    );
  }
);

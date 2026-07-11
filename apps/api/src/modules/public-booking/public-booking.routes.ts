import { Prisma } from "@prisma/client";
import { Router } from "express";

import { serveLogo } from "../../lib/logo.js";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
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

export const publicBookingRouter = Router();

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

async function getPublicContext(slug: string, serviceId: string) {
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
  const teamMembers = isResourceOnlyBookingCategory(organization.category)
    ? []
    : await prisma.membership.findMany({
        where: {
          organizationId: organization.id,
          bookingsEnabled: true,
          visibleInPublicBooking: true
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

async function calculateSlots(
  slug: string,
  serviceId: string,
  dayCount: number,
  selectedAssigneeId?: string
) {
  const { organization, service, resourceId, teamMembers } = await getPublicContext(
    slug,
    serviceId
  );
  const selectedAssignee = selectedAssigneeId
    ? teamMembers.find((member) => member.userId === selectedAssigneeId) ?? null
    : null;
  if (selectedAssigneeId && !selectedAssignee) {
    throw new AppError(404, "NOT_FOUND", "Team member not found");
  }
  const today = localDateInTimezone(new Date(), organization.timezone);
  const base = new Date(`${today}T00:00:00.000Z`);
  const lastDay = new Date(base.getTime() + (dayCount - 1) * 86_400_000);

  const dayStart = zonedTimeToUtc(today, 0, organization.timezone);
  const dayEnd = zonedTimeToUtc(
    lastDay.toISOString().slice(0, 10),
    1440,
    organization.timezone
  );

  const [availabilityRules, availabilityExceptions, appointments] =
    await Promise.all([
      prisma.availabilityRule.findMany({
        where: {
          organizationId: organization.id,
          userId: null,
          resourceId: null
        },
        orderBy: [{ weekday: "asc" }, { startMinute: "asc" }]
      }),
      prisma.availabilityException.findMany({
        where: {
          organizationId: organization.id,
          userId: null,
          resourceId: null,
          startsAt: { lt: dayEnd },
          endsAt: { gt: dayStart }
        }
      }),
      prisma.appointment.findMany({
        where: {
          organizationId: organization.id,
          deletedAt: null,
          startsAt: { lt: new Date(dayEnd.getTime() + 180 * 60_000) },
          endsAt: { gt: new Date(dayStart.getTime() - 180 * 60_000) },
          status: { in: ["pending", "confirmed"] },
          ...(resourceId
            ? { OR: [{ serviceId: service.id }, { resourceId }] }
            : { serviceId: service.id })
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
    const exceptions = availabilityExceptions.filter(
      (exception) => exception.startsAt.toISOString().slice(0, 10) === date
    );
    if (exceptions.some((exception) => !exception.isAvailable &&
      exception.startsAt.getUTCHours() === 0 && exception.endsAt.getUTCHours() === 23)) {
      windows = [];
    }
    const special = exceptions.find((exception) => exception.isAvailable);
    if (special) {
      windows = [{
        start: special.startsAt.getUTCHours() * 60 + special.startsAt.getUTCMinutes(),
        end: special.endsAt.getUTCHours() * 60 + special.endsAt.getUTCMinutes()
      }];
    }

    const slotDayStart = zonedTimeToUtc(date, 0, organization.timezone);
    const slotDayEnd = zonedTimeToUtc(date, 1440, organization.timezone);
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
          (teamMembers.length === 0 ||
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
      logo: { select: { organizationId: true } }
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
      instagram: organization.instagram,
      hasLogo: Boolean(organization.logo)
    },
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

publicBookingRouter.get("/:organizationSlug/slots", publicSlotsRateLimit, async (request, response) => {
  const { organizationSlug } = publicBookingParamsSchema.parse(request.params);
  const query = publicSlotsQuerySchema.parse(request.query);
  const result = await calculateSlots(
    organizationSlug,
    query.serviceId,
    query.days,
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
      data.assigneeId
    );
    const valid = context.days.some((day) =>
      day.slots.some((slot) => slot.startsAt === data.startsAt)
    );
    if (!valid) throw new AppError(409, "SLOT_UNAVAILABLE", "Selected slot is no longer available");

    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(startsAt.getTime() + context.service.durationMinutes * 60_000);
    const [firstName, ...lastNameParts] = data.name.trim().split(/\s+/);
    let appointment = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        appointment = await prisma.$transaction(async (transaction) => {
          const candidates: ScheduledAppointment[] =
            await transaction.appointment.findMany({
              where: {
                organizationId: context.organization.id,
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
                status: { in: ["pending", "confirmed"] },
                ...(context.resourceId
                  ? {
                      OR: [
                        { serviceId: context.service.id },
                        { resourceId: context.resourceId }
                      ]
                    }
                  : { serviceId: context.service.id })
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
      if (
        context.teamMembers.length > 0 &&
        !assignedUserId
      ) {
        throw new AppError(
          409,
          "SLOT_UNAVAILABLE",
          "Selected slot is no longer available"
        );
      }
      const email = data.email.toLowerCase();
      const existing = await transaction.customer.findFirst({
        where: {
          organizationId: context.organization.id,
          deletedAt: null,
          OR: [{ email }, { phone: data.phone }]
        }
      });
      if (existing?.blockedAt) {
        throw new AppError(
          403,
          "BOOKING_NOT_ALLOWED",
          "Online booking is not available for this customer"
        );
      }
      const customer = existing
        ? await transaction.customer.update({
            where: { id: existing.id },
            data: { firstName, lastName: lastNameParts.join(" ") || null, fullName: data.name, phone: data.phone }
          })
        : await transaction.customer.create({
            data: {
              organizationId: context.organization.id,
              firstName,
              lastName: lastNameParts.join(" ") || null,
              fullName: data.name,
              email,
              phone: data.phone
            }
          });
          return transaction.appointment.create({
        data: {
          organizationId: context.organization.id,
          customerId: customer.id,
          serviceId: context.service.id,
          resourceId: context.resourceId,
          assignedUserId,
          channel: "web",
          title: context.service.name,
          startsAt,
          endsAt,
          status: "confirmed"
        }
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
    response.status(201).json(ok({ id: appointment.id, startsAt: appointment.startsAt }));
  }
);

import { Router } from "express";

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { ok } from "../../lib/http.js";
import { requireEditor } from "../../lib/membership.js";
import { slugify } from "../../lib/slugify.js";
import { zonedTimeToUtc, parseTimeString } from "../../lib/timezone.js";
import { authRateLimit } from "../../middlewares/rate-limit.js";
import {
  catalogItemSchema,
  catalogParamsSchema,
  exceptionParamsSchema,
  exceptionSchema,
  weeklyAvailabilitySchema
} from "./availability.schemas.js";

export const availabilityRouter = Router();

availabilityRouter.get("/weekly", async (request, response) => {
  const tenant = request.tenant!;

  const rules = await prisma.availabilityRule.findMany({
    where: {
      organizationId: tenant.organizationId,
      userId: null,
      resourceId: null
    },
    orderBy: [{ weekday: "asc" }, { startMinute: "asc" }]
  });

  response.json(ok({
    timezone: tenant.timezone,
    days: Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      slots: rules
        .filter((rule) => rule.weekday === weekday)
        .map((rule) => ({
          startMinute: rule.startMinute,
          endMinute: rule.endMinute
        }))
    }))
  }));
});

availabilityRouter.put("/weekly", authRateLimit, async (request, response) => {
  const data = weeklyAvailabilitySchema.parse(request.body);
  const tenant = request.tenant!;
  requireEditor(tenant.role);

  const rules = data.days.flatMap((day) =>
    day.slots.map((slot) => ({
      organizationId: tenant.organizationId,
      weekday: day.weekday,
      startMinute: slot.startMinute,
      endMinute: slot.endMinute,
      timezone: tenant.timezone
    }))
  );

  await prisma.$transaction(async (transaction) => {
    await transaction.availabilityRule.deleteMany({
      where: {
        organizationId: tenant.organizationId,
        userId: null,
        resourceId: null
      }
    });
    if (rules.length > 0) {
      await transaction.availabilityRule.createMany({ data: rules });
    }
  });

  response.json(ok({ updated: true }));
});

function exceptionDates(data: {
  date: string;
  startTime?: string;
  endTime?: string;
}, timezone: string) {
  const startMinutes = data.startTime ? parseTimeString(data.startTime) : 0;
  const endMinutes = data.endTime ? parseTimeString(data.endTime) : 1439;
  return {
    startsAt: zonedTimeToUtc(data.date, startMinutes, timezone),
    endsAt: zonedTimeToUtc(data.date, endMinutes, timezone)
  };
}

availabilityRouter.get("/exceptions", async (request, response) => {
  const tenant = request.tenant!;
  const exceptions = await prisma.availabilityException.findMany({
    where: { organizationId: tenant.organizationId, userId: null, resourceId: null },
    orderBy: { startsAt: "asc" }
  });
  response.json(ok(exceptions.map((exception) => ({
    id: exception.id,
    date: exception.startsAt.toISOString().slice(0, 10),
    title: exception.label,
    detail: exception.notes ?? "",
    status: exception.isAvailable
      ? "Horario especial"
      : exception.startsAt.getUTCHours() === 0 &&
          exception.endsAt.getUTCHours() === 23
        ? "No laborable"
        : "Bloque parcial",
    enabled: exception.isAvailable,
    startTime: exception.startsAt.toISOString().slice(11, 16),
    endTime: exception.endsAt.toISOString().slice(11, 16)
  }))));
});

availabilityRouter.post("/exceptions", authRateLimit, async (request, response) => {
  const data = exceptionSchema.parse(request.body);
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const exception = await prisma.availabilityException.create({
    data: {
      organizationId: tenant.organizationId,
      label: data.title,
      notes: data.detail,
      isAvailable: data.enabled,
      ...exceptionDates(data, tenant.timezone)
    }
  });
  response.status(201).json(ok({ id: exception.id }));
});

availabilityRouter.patch("/exceptions/:exceptionId", authRateLimit, async (request, response) => {
  const { exceptionId } = exceptionParamsSchema.parse(request.params);
  const data = exceptionSchema.parse(request.body);
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const result = await prisma.availabilityException.updateMany({
    where: { id: exceptionId, organizationId: tenant.organizationId },
    data: {
      label: data.title,
      notes: data.detail,
      isAvailable: data.enabled,
      ...exceptionDates(data, tenant.timezone)
    }
  });
  if (!result.count) throw new AppError(404, "NOT_FOUND", "Exception not found");
  response.json(ok({ updated: true }));
});

availabilityRouter.get("/catalog", async (request, response) => {
  const tenant = request.tenant!;
  const services = await prisma.service.findMany({
    where: { organizationId: tenant.organizationId },
    include: { resourceLinks: { include: { resource: true }, take: 1 } },
    orderBy: { name: "asc" }
  });
  response.json(ok(services.map((service) => ({
    id: service.id,
    name: service.name,
    durationMinutes: service.durationMinutes,
    capacity: service.capacity,
    bufferMinutes: service.bufferAfterMinutes,
    priceCents: service.priceCents,
    resourceName: service.resourceLinks[0]?.resource.name ?? "",
    online: service.isOnlineBookable
  }))));
});

availabilityRouter.post("/catalog", authRateLimit, async (request, response) => {
  const data = catalogItemSchema.parse(request.body);
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const service = await prisma.$transaction(async (transaction) => {
    const created = await transaction.service.create({
      data: {
        organizationId: tenant.organizationId,
        createdByUserId: request.auth!.sub,
        name: data.name,
        slug: `${slugify(data.name) || "servicio"}-${Date.now().toString(36)}`,
        durationMinutes: data.durationMinutes,
        capacity: data.capacity,
        bufferAfterMinutes: data.bufferMinutes,
        priceCents: data.priceCents,
        isOnlineBookable: data.online
      }
    });
    if (data.resourceName) {
      const resourceSlug = slugify(data.resourceName) || "recurso";
      const resource = await transaction.resource.upsert({
        where: {
          organizationId_slug: {
            organizationId: tenant.organizationId,
            slug: resourceSlug
          }
        },
        create: {
          organizationId: tenant.organizationId,
          name: data.resourceName,
          slug: resourceSlug
        },
        update: { name: data.resourceName }
      });
      await transaction.serviceResource.create({
        data: { serviceId: created.id, resourceId: resource.id }
      });
    }
    return created;
  });
  response.status(201).json(ok({ id: service.id }));
});

availabilityRouter.patch("/catalog/:serviceId", authRateLimit, async (request, response) => {
  const { serviceId } = catalogParamsSchema.parse(request.params);
  const data = catalogItemSchema.parse(request.body);
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const service = await prisma.service.findFirst({
    where: { id: serviceId, organizationId: tenant.organizationId }
  });
  if (!service) throw new AppError(404, "NOT_FOUND", "Service not found");

  await prisma.$transaction(async (transaction) => {
    await transaction.service.update({
      where: { id: serviceId },
      data: {
        name: data.name,
        durationMinutes: data.durationMinutes,
        capacity: data.capacity,
        bufferAfterMinutes: data.bufferMinutes,
        priceCents: data.priceCents,
        isOnlineBookable: data.online
      }
    });
    await transaction.serviceResource.deleteMany({ where: { serviceId } });
    if (data.resourceName) {
      const resourceSlug = slugify(data.resourceName) || "recurso";
      const resource = await transaction.resource.upsert({
        where: {
          organizationId_slug: {
            organizationId: tenant.organizationId,
            slug: resourceSlug
          }
        },
        create: {
          organizationId: tenant.organizationId,
          name: data.resourceName,
          slug: resourceSlug
        },
        update: { name: data.resourceName }
      });
      await transaction.serviceResource.create({
        data: { serviceId, resourceId: resource.id }
      });
    }
  });
  response.json(ok({ updated: true }));
});

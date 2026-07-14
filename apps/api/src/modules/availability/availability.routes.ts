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
  catalogCategoryParamsSchema,
  catalogCategorySchema,
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
  status: string;
  startTime?: string;
  endTime?: string;
}, timezone: string) {
  const startMinutes =
    data.status === "No laborable"
      ? 0
      : data.startTime
        ? parseTimeString(data.startTime)
        : 540;
  const endMinutes =
    data.status === "No laborable"
      ? 1440
      : data.endTime
        ? parseTimeString(data.endTime)
        : 1080;
  return {
    startsAt: zonedTimeToUtc(data.date, startMinutes, timezone),
    endsAt: zonedTimeToUtc(data.date, endMinutes, timezone)
  };
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

function localTimeInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.hour}:${value.minute}`;
}

availabilityRouter.get("/exceptions", async (request, response) => {
  const tenant = request.tenant!;
  const exceptions = await prisma.availabilityException.findMany({
    where: { organizationId: tenant.organizationId, userId: null, resourceId: null },
    orderBy: { startsAt: "asc" }
  });
  response.json(ok(exceptions.map((exception) => ({
    id: exception.id,
    date: localDateInTimezone(exception.startsAt, tenant.timezone),
    title: exception.label,
    detail: exception.notes ?? "",
    status: exception.isAvailable
      ? "Horario especial"
      : localTimeInTimezone(exception.startsAt, tenant.timezone) === "00:00" &&
          localTimeInTimezone(exception.endsAt, tenant.timezone) === "00:00"
        ? "No laborable"
        : "Bloque parcial",
    enabled: exception.isAvailable,
    startTime: localTimeInTimezone(exception.startsAt, tenant.timezone),
    endTime: localTimeInTimezone(exception.endsAt, tenant.timezone)
  }))));
});

availabilityRouter.post("/exceptions", authRateLimit, async (request, response) => {
  const data = exceptionSchema.parse(request.body);
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const existing = await prisma.availabilityException.findFirst({
    where: {
      organizationId: tenant.organizationId,
      userId: null,
      resourceId: null,
      startsAt: {
        gte: zonedTimeToUtc(data.date, 0, tenant.timezone),
        lt: zonedTimeToUtc(data.date, 1440, tenant.timezone)
      }
    }
  });
  if (existing) {
    throw new AppError(409, "DUPLICATE_EXCEPTION", "Date already has an exception");
  }
  const exception = await prisma.availabilityException.create({
    data: {
      organizationId: tenant.organizationId,
      label: data.title,
      notes: data.detail,
      isAvailable: data.status === "Horario especial",
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
  const duplicate = await prisma.availabilityException.findFirst({
    where: {
      id: { not: exceptionId },
      organizationId: tenant.organizationId,
      userId: null,
      resourceId: null,
      startsAt: {
        gte: zonedTimeToUtc(data.date, 0, tenant.timezone),
        lt: zonedTimeToUtc(data.date, 1440, tenant.timezone)
      }
    }
  });
  if (duplicate) {
    throw new AppError(409, "DUPLICATE_EXCEPTION", "Date already has an exception");
  }
  const result = await prisma.availabilityException.updateMany({
    where: { id: exceptionId, organizationId: tenant.organizationId },
    data: {
      label: data.title,
      notes: data.detail,
      isAvailable: data.status === "Horario especial",
      ...exceptionDates(data, tenant.timezone)
    }
  });
  if (!result.count) throw new AppError(404, "NOT_FOUND", "Exception not found");
  response.json(ok({ updated: true }));
});

availabilityRouter.delete("/exceptions/:exceptionId", authRateLimit, async (request, response) => {
  const { exceptionId } = exceptionParamsSchema.parse(request.params);
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const result = await prisma.availabilityException.deleteMany({
    where: { id: exceptionId, organizationId: tenant.organizationId }
  });
  if (!result.count) throw new AppError(404, "NOT_FOUND", "Exception not found");
  response.json(ok({ deleted: true }));
});

availabilityRouter.get("/catalog", async (request, response) => {
  const tenant = request.tenant!;
  const [services, categories] = await Promise.all([
  prisma.service.findMany({
    where: { organizationId: tenant.organizationId, isActive: true },
    include: { resourceLinks: { include: { resource: true }, take: 1 } },
    orderBy: [{ category: "asc" }, { name: "asc" }]
  }),
  prisma.serviceCategory.findMany({
    where: { organizationId: tenant.organizationId },
    orderBy: { name: "asc" }
  })
  ]);
  response.json(ok({
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name
    })),
    services: services.map((service) => ({
    id: service.id,
    name: service.name,
    category: service.category ?? "",
    durationMinutes: service.durationMinutes,
    capacity: service.capacity,
    bufferMinutes: service.bufferAfterMinutes,
    priceCents: service.priceCents,
    resourceName: service.resourceLinks[0]?.resource.name ?? "",
    online: service.isOnlineBookable
    }))
  }));
});

availabilityRouter.post("/catalog/categories", authRateLimit, async (request, response) => {
  const data = catalogCategorySchema.parse(request.body);
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const baseSlug = slugify(data.name) || "categoria";
  const category = await prisma.serviceCategory.upsert({
    where: {
      organizationId_slug: {
        organizationId: tenant.organizationId,
        slug: baseSlug
      }
    },
    create: {
      organizationId: tenant.organizationId,
      name: data.name,
      slug: baseSlug
    },
    update: { name: data.name }
  });
  response.status(201).json(ok({ id: category.id, name: category.name }));
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
        category: data.category || null,
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
        category: data.category || null,
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

availabilityRouter.delete("/catalog/:serviceId", authRateLimit, async (request, response) => {
  const { serviceId } = catalogParamsSchema.parse(request.params);
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const result = await prisma.service.updateMany({
    where: { id: serviceId, organizationId: tenant.organizationId },
    data: { isActive: false, isOnlineBookable: false }
  });
  if (!result.count) throw new AppError(404, "NOT_FOUND", "Service not found");
  response.json(ok({ deleted: true }));
});

availabilityRouter.delete("/catalog/categories/:categoryId", authRateLimit, async (request, response) => {
  const { categoryId } = catalogCategoryParamsSchema.parse(request.params);
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const category = await prisma.serviceCategory.findFirst({
    where: { id: categoryId, organizationId: tenant.organizationId }
  });
  if (!category) throw new AppError(404, "NOT_FOUND", "Category not found");
  await prisma.$transaction([
    prisma.service.updateMany({
      where: { organizationId: tenant.organizationId, category: category.name },
      data: { category: null }
    }),
    prisma.serviceCategory.delete({ where: { id: category.id } })
  ]);
  response.json(ok({ deleted: true }));
});

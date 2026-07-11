import { Router } from "express";

import { prisma } from "../../database/prisma.js";
import { ok } from "../../lib/http.js";
import { assertMembership } from "../../lib/membership.js";
import { paginate, paginatedResponse, paginationSchema } from "../../lib/pagination.js";
import { organizationParamsSchema } from "../../lib/schemas.js";
import { authRateLimit } from "../../middlewares/rate-limit.js";
import { auditLog } from "../audit/audit.service.js";
import { createServiceSchema } from "./services.schemas.js";

export const servicesRouter = Router({ mergeParams: true });

servicesRouter.get("/", async (request, response) => {
  const { organizationId } = organizationParamsSchema.parse(request.params);
  await assertMembership(request.auth!.sub, organizationId);
  const pagination = paginationSchema.parse(request.query);

  const where = { organizationId };

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      ...paginate(pagination)
    }),
    prisma.service.count({ where })
  ]);

  response.json(ok(paginatedResponse(services, total, pagination)));
});

servicesRouter.post("/", authRateLimit, async (request, response) => {
  const { organizationId } = organizationParamsSchema.parse(request.params);
  await assertMembership(request.auth!.sub, organizationId);
  const data = createServiceSchema.parse(request.body);

  const service = await prisma.service.create({
    data: {
      organizationId,
      ...data
    }
  });

  await auditLog({ userId: request.auth!.sub, organizationId, action: "service.create", entityType: "service", entityId: service.id });
  response.status(201).json(ok(service));
});

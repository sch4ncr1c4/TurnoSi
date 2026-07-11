import { Router } from "express";

import { prisma } from "../../database/prisma.js";
import { ok } from "../../lib/http.js";
import { paginate, paginatedResponse, paginationSchema } from "../../lib/pagination.js";

export const auditRouter = Router();

auditRouter.get("/", async (request, response) => {
  const tenant = request.tenant!;
  const pagination = paginationSchema.parse(request.query);

  const where = { organizationId: tenant.organizationId };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginate(pagination)
    }),
    prisma.auditLog.count({ where })
  ]);

  response.json(ok(paginatedResponse(logs, total, pagination)));
});

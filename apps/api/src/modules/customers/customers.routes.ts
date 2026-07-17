import { Router } from "express";

import { prisma } from "../../database/prisma.js";
import { ok } from "../../lib/http.js";
import { assertMembership, requireEditor } from "../../lib/membership.js";
import { paginate, paginatedResponse, paginationSchema } from "../../lib/pagination.js";
import { organizationParamsSchema } from "../../lib/schemas.js";
import { softDelete, restore } from "../../lib/soft-delete.js";
import { authRateLimit, authenticatedRateLimit } from "../../middlewares/rate-limit.js";
import { auditLog } from "../audit/audit.service.js";
import {
  createCustomerSchema,
  blockCustomerSchema,
  customersQuerySchema,
  customerParamsSchema
} from "./customers.schemas.js";

export const customersRouter = Router({ mergeParams: true });
export const customerManagementRouter = Router();

customerManagementRouter.get("/", authenticatedRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  const { search, status, ...pagination } = customersQuerySchema
    .merge(paginationSchema)
    .parse(request.query);
  const where = {
    organizationId: tenant.organizationId,
    deletedAt: null,
    ...(status === "blocked"
      ? { blockedAt: { not: null } }
      : status === "active"
        ? { blockedAt: null }
        : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } }
          ]
        }
      : {})
  };
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: [{ blockedAt: "desc" }, { fullName: "asc" }],
      ...paginate(pagination)
    }),
    prisma.customer.count({ where })
  ]);
  response.json(ok(paginatedResponse(customers, total, pagination)));
});

customerManagementRouter.post("/:customerId/block", authRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const { customerId } = customerParamsSchema.parse(request.params);
  const { reason } = blockCustomerSchema.parse(request.body);
  const result = await prisma.customer.updateMany({
    where: {
      id: customerId,
      organizationId: tenant.organizationId,
      deletedAt: null
    },
    data: { blockedAt: new Date(), blockedReason: reason }
  });
  if (!result.count) {
    response.status(404).json({ success: false, message: "Customer not found", code: "NOT_FOUND" });
    return;
  }
  await auditLog({
    userId: request.auth!.sub,
    organizationId: tenant.organizationId,
    action: "customer.blocked",
    entityType: "Customer",
    entityId: customerId,
    metadata: { reason }
  });
  response.json(ok({ blocked: true }));
});

customerManagementRouter.post("/:customerId/unblock", authRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const { customerId } = customerParamsSchema.parse(request.params);
  const result = await prisma.customer.updateMany({
    where: {
      id: customerId,
      organizationId: tenant.organizationId,
      deletedAt: null
    },
    data: { blockedAt: null, blockedReason: null }
  });
  if (!result.count) {
    response.status(404).json({ success: false, message: "Customer not found", code: "NOT_FOUND" });
    return;
  }
  await auditLog({
    userId: request.auth!.sub,
    organizationId: tenant.organizationId,
    action: "customer.unblocked",
    entityType: "Customer",
    entityId: customerId
  });
  response.json(ok({ blocked: false }));
});

customersRouter.get("/", authenticatedRateLimit, async (request, response) => {
  const { organizationId } = organizationParamsSchema.parse(request.params);
  const membership = await assertMembership(request.auth!.sub, organizationId);
  requireEditor(membership.role);
  const { search, status: _status, ...pagination } = customersQuerySchema
    .merge(paginationSchema)
    .parse(request.query);

  const where = {
    organizationId,
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } }
          ]
        }
      : {})
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { fullName: "asc" },
      ...paginate(pagination)
    }),
    prisma.customer.count({ where })
  ]);

  response.json(ok(paginatedResponse(customers, total, pagination)));
});

customersRouter.post("/", authRateLimit, async (request, response) => {
  const { organizationId } = organizationParamsSchema.parse(request.params);
  const membership = await assertMembership(request.auth!.sub, organizationId);
  requireEditor(membership.role);
  const data = createCustomerSchema.parse(request.body);
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ");

  const customer = await prisma.customer.create({
    data: {
      organizationId,
      ...data,
      fullName
    }
  });

  await auditLog({ userId: request.auth!.sub, organizationId, action: "customer.create", entityType: "customer", entityId: customer.id });
  response.status(201).json(ok(customer));
});

customersRouter.delete("/:customerId", authRateLimit, async (request, response) => {
  const { organizationId } = organizationParamsSchema.parse(request.params);
  const membership = await assertMembership(request.auth!.sub, organizationId);
  requireEditor(membership.role);
  const { customerId } = customerParamsSchema.parse(request.params);

  const deleted = await softDelete("customer", {
    id: customerId,
    organizationId
  });
  if (!deleted) {
    response.status(404).json({ success: false, message: "Customer not found", code: "NOT_FOUND" });
    return;
  }

  response.json(ok({ deleted: true }));
});

customersRouter.post("/:customerId/restore", authRateLimit, async (request, response) => {
  const { organizationId } = organizationParamsSchema.parse(request.params);
  const membership = await assertMembership(request.auth!.sub, organizationId);
  requireEditor(membership.role);
  const { customerId } = customerParamsSchema.parse(request.params);

  const restored = await restore("customer", {
    id: customerId,
    organizationId
  });
  if (!restored) {
    response.status(404).json({ success: false, message: "Customer not found", code: "NOT_FOUND" });
    return;
  }

  response.json(ok({ restored: true }));
});

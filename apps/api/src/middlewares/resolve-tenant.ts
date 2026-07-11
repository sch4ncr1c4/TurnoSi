import type { NextFunction, Request, Response } from "express";

import { prisma } from "../database/prisma.js";
import { AppError } from "../lib/app-error.js";

export function tenantMembershipWhere(userId: string, organizationId: string | null) {
  return { userId, ...(organizationId ? { organizationId } : {}) };
}

export async function resolveTenant(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  const userId = request.auth!.sub;
  const organizationId = request.auth!.organizationId;
  const membership = await prisma.membership.findFirst({
    where: tenantMembershipWhere(userId, organizationId),
    orderBy: { createdAt: "asc" },
    include: {
      organization: {
        select: { id: true, timezone: true }
      }
    }
  });

  if (!membership) {
    next(new AppError(403, "TENANT_REQUIRED", "Organization access required"));
    return;
  }

  request.tenant = {
    organizationId: membership.organizationId,
    role: membership.role,
    timezone: membership.organization.timezone,
    userId
  };
  next();
}

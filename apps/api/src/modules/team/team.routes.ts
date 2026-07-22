import { Router } from "express";

import { prisma } from "../../database/prisma.js";
import { ok } from "../../lib/http.js";
import { AppError } from "../../lib/app-error.js";
import { requireEditor } from "../../lib/membership.js";
import { hashPassword } from "../../lib/password.js";
import { authRateLimit } from "../../middlewares/rate-limit.js";
import { assertPlanLimitAvailable } from "../billing/plan-limits.service.js";
import {
  createTeamMemberSchema,
  resetTeamMemberPasswordSchema,
  teamMemberParamsSchema,
  updateTeamMemberSchema
} from "./team.schemas.js";

export const teamRouter = Router();

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

function getDisplayName(member: {
  user: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    email: string;
  };
}) {
  return (
    [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") ||
    member.user.username ||
    member.user.email
  );
}

function serializeTeamMember(
  member: {
    id: string;
    role: "owner" | "admin" | "member";
    bookingsEnabled: boolean;
    visibleInPublicBooking: boolean;
    hourlyCapacity: number;
    branches?: {
      branchId: string;
      branch: {
        id: string;
        name: string;
        isMain: boolean;
      };
    }[];
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      username: string | null;
      phone: string | null;
      email: string;
    };
  },
  meta?: {
    todayAssignedCount?: number;
    upcomingAssignedCount?: number;
    temporaryPassword?: string | null;
    isNewUser?: boolean;
  }
) {
  return {
    id: member.id,
    userId: member.user.id,
    firstName: member.user.firstName,
    lastName: member.user.lastName,
    phone: member.user.phone,
    name: getDisplayName(member),
    username: member.user.username,
    email: member.user.email,
    role: member.role,
    bookingsEnabled: member.bookingsEnabled,
    visibleInPublicBooking: member.visibleInPublicBooking,
    hourlyCapacity: member.hourlyCapacity,
    branchIds: member.branches?.map((item) => item.branchId) ?? [],
    branches: member.branches?.map((item) => ({
      id: item.branch.id,
      name: item.branch.name,
      isMain: item.branch.isMain
    })) ?? [],
    todayAssignedCount: meta?.todayAssignedCount ?? 0,
    upcomingAssignedCount: meta?.upcomingAssignedCount ?? 0,
    temporaryPassword: meta?.temporaryPassword ?? null,
    isNewUser: meta?.isNewUser ?? false
  };
}

async function resolveMemberBranchIds(organizationId: string, branchIds: string[]) {
  if (branchIds.length > 0) {
    const branches = await prisma.branch.findMany({
      where: {
        id: { in: branchIds },
        organizationId,
        isActive: true
      },
      select: { id: true }
    });
    if (branches.length !== new Set(branchIds).size) {
      throw new AppError(400, "INVALID_BRANCH", "Invalid branch selection");
    }
    return branches.map((branch) => branch.id);
  }
  const mainBranch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true, isActive: true },
    select: { id: true }
  });
  if (mainBranch) return [mainBranch.id];
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId }
  });
  const branch = await prisma.branch.create({
    data: {
      organizationId,
      name: "Sede principal",
      slug: "sede-principal",
      phone: organization.phone,
      whatsapp: organization.whatsapp,
      address: organization.address,
      city: organization.city,
      province: organization.province,
      isMain: true
    },
    select: { id: true }
  });
  return [branch.id];
}

teamRouter.post("/", authRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const data = createTeamMemberSchema.parse(request.body);
  const username = data.username.toLowerCase();
  const email = `${username}@team.turnosi.local`;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }]
    },
    select: { id: true }
  });
  if (existingUser) {
    throw new AppError(
      409,
      "USERNAME_ALREADY_IN_USE",
      "Username already in use"
    );
  }
  if (data.role === "owner" || (tenant.role === "admin" && data.role !== "member")) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }
  const memberCount = await prisma.membership.count({
    where: { organizationId: tenant.organizationId }
  });
  await assertPlanLimitAvailable(tenant.organizationId, "members", memberCount);
  const branchIds = await resolveMemberBranchIds(tenant.organizationId, data.branchIds);

  const passwordHash = await hashPassword(data.password);

  const created = await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.create({
          data: {
            email,
            username,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            phone: true,
            email: true
          }
        });

    const membership = await transaction.membership.create({
      data: {
        userId: user.id,
        organizationId: tenant.organizationId,
        role: data.role,
        bookingsEnabled: data.bookingsEnabled,
        visibleInPublicBooking: data.visibleInPublicBooking,
        hourlyCapacity: data.hourlyCapacity
      },
      include: { user: true }
    });
    if (branchIds.length > 0) {
      await transaction.membershipBranch.createMany({
        data: branchIds.map((branchId) => ({
          membershipId: membership.id,
          branchId
        }))
      });
    }
    return transaction.membership.findUniqueOrThrow({
      where: { id: membership.id },
      include: {
        branches: {
          include: { branch: { select: { id: true, name: true, isMain: true } } }
        },
        user: true
      }
    });
  });

  response.status(201).json(
    ok(
      serializeTeamMember(created, {
        isNewUser: true
      })
    )
  );
});

teamRouter.get("/", async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const members = await prisma.membership.findMany({
    where: { organizationId: tenant.organizationId },
    include: {
      branches: {
        include: { branch: { select: { id: true, name: true, isMain: true } } }
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          phone: true,
          email: true
        }
      }
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }]
  });

  const assignedAppointments = await prisma.appointment.findMany({
    where: {
      organizationId: tenant.organizationId,
      deletedAt: null,
      assignedUserId: { in: members.map((member) => member.userId) },
      startsAt: { gte: new Date() },
      status: { in: ["pending", "confirmed"] }
    },
    select: {
      assignedUserId: true,
      startsAt: true
    }
  });

  const today = localDateInTimezone(new Date(), tenant.timezone);
  response.json(
    ok(
      members.map((member) => {
        const memberAppointments = assignedAppointments.filter(
          (appointment) => appointment.assignedUserId === member.userId
        );
        const todayAssignedCount = memberAppointments.filter(
          (appointment) =>
            localDateInTimezone(appointment.startsAt, tenant.timezone) === today
        ).length;

        return serializeTeamMember(member, {
          todayAssignedCount,
          upcomingAssignedCount: memberAppointments.length
        });
      })
    )
  );
});

teamRouter.patch("/:membershipId", authRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const { membershipId } = teamMemberParamsSchema.parse(request.params);
  const data = updateTeamMemberSchema.parse(request.body);

  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      organizationId: tenant.organizationId
    },
    include: {
      branches: {
        include: { branch: { select: { id: true, name: true, isMain: true } } }
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          phone: true,
          email: true
        }
      }
    }
  });
  if (!membership) {
    throw new AppError(404, "NOT_FOUND", "Team member not found");
  }

  const isSelf = membership.userId === tenant.userId;
  const isOwnerMembership = membership.role === "owner";

  if (
    (isOwnerMembership && !isSelf) ||
    (isOwnerMembership && data.role !== "owner") ||
    (!isOwnerMembership && data.role === "owner") ||
    (tenant.role === "admin" &&
      !isSelf &&
      (membership.role !== "member" || data.role !== "member"))
  ) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }

  const hasProfileChanges =
    data.firstName !== membership.user.firstName ||
    data.lastName !== membership.user.lastName ||
    data.phone !== membership.user.phone;

  if (hasProfileChanges && !isSelf) {
    throw new AppError(
      403,
      "PROFILE_CHANGE_FORBIDDEN",
      "Team members must update their own profile"
    );
  }
  const branchIds = await resolveMemberBranchIds(tenant.organizationId, data.branchIds);

  const updated = await prisma.$transaction(async (transaction) => {
    if (hasProfileChanges) {
      await transaction.user.update({
        where: { id: membership.userId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone
        }
      });
    }
    await transaction.membership.update({
      where: { id: membershipId },
      data: {
        role: data.role,
        bookingsEnabled: data.bookingsEnabled,
        visibleInPublicBooking: data.visibleInPublicBooking,
        hourlyCapacity: data.hourlyCapacity
      }
    });
    await transaction.membershipBranch.deleteMany({
      where: { membershipId }
    });
    if (branchIds.length > 0) {
      await transaction.membershipBranch.createMany({
        data: branchIds.map((branchId) => ({
          membershipId,
          branchId
        }))
      });
    }
    return transaction.membership.findUniqueOrThrow({
      where: { id: membershipId },
      include: {
        branches: {
          include: { branch: { select: { id: true, name: true, isMain: true } } }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            phone: true,
            email: true
          }
        }
      }
    });
  });

  response.json(ok(serializeTeamMember(updated)));
});

teamRouter.patch("/:membershipId/password", authRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const { membershipId } = teamMemberParamsSchema.parse(request.params);
  const data = resetTeamMemberPasswordSchema.parse(request.body);

  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      organizationId: tenant.organizationId
    },
    select: {
      role: true,
      userId: true
    }
  });
  if (!membership) {
    throw new AppError(404, "NOT_FOUND", "Team member not found");
  }
  if (membership.role === "owner" && tenant.userId !== membership.userId) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }
  if (tenant.role === "admin" && membership.userId !== tenant.userId && membership.role !== "member") {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }

  await prisma.user.update({
    where: { id: membership.userId },
    data: { passwordHash: await hashPassword(data.password) }
  });

  response.json(ok({ updated: true }));
});

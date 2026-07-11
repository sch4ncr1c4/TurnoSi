import { Router } from "express";
import { randomBytes } from "node:crypto";

import { prisma } from "../../database/prisma.js";
import { ok } from "../../lib/http.js";
import { AppError } from "../../lib/app-error.js";
import { requireEditor } from "../../lib/membership.js";
import { hashPassword } from "../../lib/password.js";
import { authRateLimit } from "../../middlewares/rate-limit.js";
import {
  createTeamMemberSchema,
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
    email: string;
  };
}) {
  return (
    [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") ||
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
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
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
    email: member.user.email,
    role: member.role,
    bookingsEnabled: member.bookingsEnabled,
    visibleInPublicBooking: member.visibleInPublicBooking,
    hourlyCapacity: member.hourlyCapacity,
    todayAssignedCount: meta?.todayAssignedCount ?? 0,
    upcomingAssignedCount: meta?.upcomingAssignedCount ?? 0,
    temporaryPassword: meta?.temporaryPassword ?? null,
    isNewUser: meta?.isNewUser ?? false
  };
}

function generateTemporaryPassword() {
  const bytes = randomBytes(10);
  const upper = bytes.subarray(0, 2).toString("hex").toUpperCase();
  const lower = bytes.subarray(2, 6).toString("hex");
  const digits = bytes.readUInt16BE(6) % 10000;
  const symbols = ["!", "@", "#", "$", "%", "&"];
  const symbol = symbols[bytes[8] % symbols.length];
  return `${upper}-${lower}-${String(digits).padStart(4, "0")}${symbol}`;
}

teamRouter.post("/", authRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const data = createTeamMemberSchema.parse(request.body);
  const email = data.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });
  if (existingUser) {
    throw new AppError(
      409,
      "ACCOUNT_ALREADY_EXISTS",
      "An existing account must join through an invitation"
    );
  }
  if (data.role === "owner" || (tenant.role === "admin" && data.role !== "member")) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const created = await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.create({
          data: {
            email,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        });

    return transaction.membership.create({
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
  });

  response.status(201).json(
    ok(
      serializeTeamMember(created, {
        temporaryPassword,
        isNewUser: true
      })
    )
  );
});

teamRouter.get("/", async (request, response) => {
  const tenant = request.tenant!;
  const members = await prisma.membership.findMany({
    where: { organizationId: tenant.organizationId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
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
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true
        }
      }
    }
  });
  if (!membership) {
    throw new AppError(404, "NOT_FOUND", "Team member not found");
  }

  if (
    membership.role === "owner" ||
    data.role === "owner" ||
    (tenant.role === "admin" && (membership.role !== "member" || data.role !== "member"))
  ) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }

  if (
    data.email.toLowerCase() !== membership.user.email.toLowerCase() ||
    data.firstName !== membership.user.firstName ||
    data.lastName !== membership.user.lastName ||
    data.phone !== membership.user.phone
  ) {
    throw new AppError(
      403,
      "PROFILE_CHANGE_FORBIDDEN",
      "Team members must update their own profile"
    );
  }

  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data: {
      role: data.role,
      bookingsEnabled: data.bookingsEnabled,
      visibleInPublicBooking: data.visibleInPublicBooking,
      hourlyCapacity: data.hourlyCapacity
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true
        }
      }
    }
  });

  response.json(ok(serializeTeamMember(updated)));
});

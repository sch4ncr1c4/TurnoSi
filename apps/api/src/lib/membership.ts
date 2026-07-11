import { prisma } from "../database/prisma.js";
import { AppError } from "./app-error.js";

export async function getMembership(userId: string) {
  return prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { organization: true }
  });
}

export async function assertMembership(userId: string, organizationId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId, organizationId }
  });
  if (!membership) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }
  return membership;
}

export function requireEditor(role: string) {
  if (role !== "owner" && role !== "admin") {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }
}

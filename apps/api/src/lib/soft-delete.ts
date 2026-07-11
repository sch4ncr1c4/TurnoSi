import { prisma } from "../database/prisma.js";

type SoftDeleteModel = "customer" | "appointment";

export async function softDelete(
  model: SoftDeleteModel,
  where: { id: string; organizationId: string }
) {
  if (model === "customer") {
    const result = await prisma.customer.updateMany({
      where: { id: where.id, organizationId: where.organizationId, deletedAt: null },
      data: { deletedAt: new Date() }
    });
    return result.count > 0;
  }
  const result = await prisma.appointment.updateMany({
    where: { id: where.id, organizationId: where.organizationId, deletedAt: null },
    data: { deletedAt: new Date() }
  });
  return result.count > 0;
}

export async function restore(
  model: SoftDeleteModel,
  where: { id: string; organizationId: string }
) {
  if (model === "customer") {
    const result = await prisma.customer.updateMany({
      where: { id: where.id, organizationId: where.organizationId, deletedAt: { not: null } },
      data: { deletedAt: null }
    });
    return result.count > 0;
  }
  const result = await prisma.appointment.updateMany({
    where: { id: where.id, organizationId: where.organizationId, deletedAt: { not: null } },
    data: { deletedAt: null }
  });
  return result.count > 0;
}

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { cancelMercadoPagoSubscription } from "../billing/mercadopago-subscription.service.js";

export async function deleteOrganizationWithData(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      memberships: { select: { userId: true } },
      subscription: {
        select: { mercadoPagoPreapprovalId: true, status: true }
      }
    }
  });

  if (!organization) {
    throw new AppError(404, "NOT_FOUND", "Business not found");
  }

  const preapprovalId = organization.subscription?.mercadoPagoPreapprovalId;
  if (preapprovalId && organization.subscription?.status !== "canceled") {
    await cancelMercadoPagoSubscription(preapprovalId);
  }

  const memberUserIds = organization.memberships.map((member) => member.userId);

  return prisma.$transaction(async (transaction) => {
    await transaction.organization.delete({
      where: { id: organizationId }
    });
    const deletedUsers = await transaction.user.deleteMany({
      where: {
        id: { in: memberUserIds },
        memberships: { none: {} }
      }
    });

    return { deleted: true, deletedUsers: deletedUsers.count };
  });
}

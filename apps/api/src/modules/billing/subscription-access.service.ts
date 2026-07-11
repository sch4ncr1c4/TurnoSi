import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";

type SubscriptionAccess = {
  status: string;
  plan: string;
  trialEndsAt: Date | null;
};

export function subscriptionGrantsAccess(subscription: SubscriptionAccess | null, now = new Date()) {
  if (!subscription || subscription.status !== "authorized") return false;
  return subscription.plan !== "trial" || Boolean(subscription.trialEndsAt && subscription.trialEndsAt > now);
}

export async function hasActiveSubscription(organizationId: string) {
  const subscription = await prisma.organizationSubscription.findUnique({
    where: { organizationId }
  });

  if (subscriptionGrantsAccess(subscription)) {
    return true;
  }

  if (!subscription || subscription.status !== "authorized" || subscription.plan !== "trial") return false;

  await prisma.organizationSubscription.updateMany({
    where: {
      id: subscription.id,
      status: "authorized"
    },
    data: { status: "canceled" }
  });
  return false;
}

export async function requireActiveSubscription(organizationId: string) {
  if (!(await hasActiveSubscription(organizationId))) {
    throw new AppError(
      402,
      "SUBSCRIPTION_REQUIRED",
      "An active subscription or trial is required"
    );
  }
}

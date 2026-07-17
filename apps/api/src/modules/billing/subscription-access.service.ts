import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";

type SubscriptionAccess = {
  status: string;
  plan: string;
  trialEndsAt: Date | null;
  paymentGraceEndsAt?: Date | null;
  lastPaymentStatus?: string | null;
};

const paymentFailureStatuses = new Set([
  "rejected",
  "cancelled",
  "refunded",
  "charged_back"
]);

export function subscriptionGrantsAccess(subscription: SubscriptionAccess | null, now = new Date()) {
  if (!subscription || subscription.status !== "authorized") return false;
  if (subscription.plan === "trial") {
    return Boolean(subscription.trialEndsAt && subscription.trialEndsAt > now);
  }
  if (
    subscription.lastPaymentStatus &&
    paymentFailureStatuses.has(subscription.lastPaymentStatus) &&
    subscription.paymentGraceEndsAt &&
    subscription.paymentGraceEndsAt <= now
  ) {
    return false;
  }
  return true;
}

export async function hasActiveSubscription(organizationId: string) {
  const subscription = await prisma.organizationSubscription.findUnique({
    where: { organizationId }
  });

  if (subscriptionGrantsAccess(subscription)) {
    return true;
  }

  if (
    subscription?.status === "authorized" &&
    subscription.plan !== "trial" &&
    subscription.lastPaymentStatus &&
    paymentFailureStatuses.has(subscription.lastPaymentStatus) &&
    subscription.paymentGraceEndsAt &&
    subscription.paymentGraceEndsAt <= new Date()
  ) {
    await prisma.organizationSubscription.updateMany({
      where: {
        id: subscription.id,
        status: "authorized"
      },
      data: { status: "paused" }
    });
    return false;
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

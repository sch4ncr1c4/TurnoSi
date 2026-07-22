import type { SubscriptionPlan } from "@prisma/client";

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { paidBillingPlans, type PaidBillingPlan } from "./billing.plans.js";

export function getPlanLimits(plan: SubscriptionPlan) {
  if (plan === "trial") {
    return paidBillingPlans.initial.limits;
  }
  return paidBillingPlans[plan as PaidBillingPlan].limits;
}

export function isWithinPlanLimit(limit: number | null, currentCount: number) {
  return limit === null || currentCount < limit;
}

export async function assertPlanLimitAvailable(
  organizationId: string,
  limitName: keyof ReturnType<typeof getPlanLimits>,
  currentCount: number
) {
  const subscription = await prisma.organizationSubscription.findUnique({
    where: { organizationId },
    select: { plan: true, status: true }
  });
  const limits = getPlanLimits(subscription?.plan ?? "trial");
  const limit = limits[limitName];

  if (isWithinPlanLimit(limit, currentCount)) return;

  throw new AppError(
    403,
    "PLAN_LIMIT_REACHED",
    "Tu plan actual no permite agregar más elementos de este tipo"
  );
}

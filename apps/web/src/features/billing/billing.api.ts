import { apiRequest } from "../../lib/api";

export type BillingPlan = "initial" | "professional" | "operation";

export async function createSubscription(
  plan: BillingPlan,
  payerEmail?: string
) {
  const response = await apiRequest<{
    success: true;
    data: { checkoutUrl: string };
  }>("/api/v1/billing/subscription", {
    method: "POST",
    body: JSON.stringify({ plan, payerEmail })
  });
  return response.data;
}

export async function startFreeTrial() {
  const response = await apiRequest<{
    success: true;
    data: { trialEndsAt: string };
  }>("/api/v1/billing/trial", { method: "POST" });
  return response.data;
}

export type SubscriptionStatus = {
  plan: BillingPlan | "trial";
  status: "pending" | "authorized" | "paused" | "canceled";
  payerEmail: string | null;
  nextPaymentAt: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  paymentGraceEndsAt: string | null;
  lastPaymentStatus:
    | "pending"
    | "approved"
    | "rejected"
    | "cancelled"
    | "refunded"
    | "charged_back"
    | "unknown"
    | null;
} | null;

export async function getSubscription() {
  const response = await apiRequest<{
    success: true;
    data: SubscriptionStatus;
  }>("/api/v1/billing/subscription");
  return response.data;
}

import { Router } from "express";
import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  PreApproval,
  WebhookSignatureValidator
} from "mercadopago";

import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { ok } from "../../lib/http.js";
import { requireEditor } from "../../lib/membership.js";
import { createSubscriptionSchema } from "./billing.schemas.js";

export const billingRouter = Router();
export const billingPublicRouter = Router();

const plans = {
  initial: { name: "Turnosi Inicial", amount: 15 },
  professional: { name: "Turnosi Profesional", amount: 24_000 },
  operation: { name: "Turnosi Operación", amount: 39_000 }
} as const;
const pendingSubscriptionTtlMs = 30 * 60 * 1000;

type MercadoPagoSubscription = {
  id?: string;
  status?: string;
  external_reference?: string | null;
  payer_email?: string | null;
  next_payment_date?: string | null;
  date_created?: string | null;
};

function mercadoPagoClient() {
  if (!env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new AppError(
      503,
      "BILLING_NOT_CONFIGURED",
      "Mercado Pago is not configured"
    );
  }
  return new PreApproval(
    new MercadoPagoConfig({ accessToken: env.MERCADOPAGO_ACCESS_TOKEN })
  );
}

function normalizeStatus(status?: string) {
  if (status === "authorized") return "authorized" as const;
  if (status === "paused") return "paused" as const;
  if (status === "cancelled" || status === "canceled") return "canceled" as const;
  return "pending" as const;
}

function planFromExternalReference(reference?: string | null) {
  const [, plan] = (reference ?? "").split(":");
  return plan in plans ? (plan as keyof typeof plans) : null;
}

function isExpiredPendingSubscription(subscription: {
  status: string;
  updatedAt: Date;
}) {
  return (
    subscription.status === "pending" &&
    subscription.updatedAt.getTime() < Date.now() - pendingSubscriptionTtlMs
  );
}

async function findAuthorizedMercadoPagoSubscription(organizationId: string) {
  const result = await mercadoPagoClient().search({ options: { limit: 50 } });
  const subscriptions = (result.results ?? []) as MercadoPagoSubscription[];

  return (
    subscriptions
      .filter(
        (subscription) =>
          subscription.status === "authorized" &&
          subscription.external_reference?.startsWith(`${organizationId}:`) &&
          planFromExternalReference(subscription.external_reference)
      )
      .sort(
        (first, second) =>
          new Date(second.date_created ?? 0).getTime() -
          new Date(first.date_created ?? 0).getTime()
      )[0] ?? null
  );
}

billingRouter.get("/subscription", async (request, response) => {
  let subscription = await prisma.organizationSubscription.findUnique({
    where: { organizationId: request.tenant!.organizationId }
  });
  if (
    subscription?.plan === "trial" &&
    subscription.status === "authorized" &&
    subscription.trialEndsAt &&
    subscription.trialEndsAt <= new Date()
  ) {
    subscription = await prisma.organizationSubscription.update({
      where: { id: subscription.id },
      data: { status: "canceled" }
    });
  }
  if (subscription && isExpiredPendingSubscription(subscription)) {
    subscription = await prisma.organizationSubscription.update({
      where: { id: subscription.id },
      data: { status: "canceled" }
    });
  }
  if (subscription?.mercadoPagoPreapprovalId && env.MERCADOPAGO_ACCESS_TOKEN) {
    try {
      const remote = await mercadoPagoClient().get({
        id: subscription.mercadoPagoPreapprovalId
      });
      const authorizedRemote =
        normalizeStatus(remote.status) === "authorized"
          ? remote
          : await findAuthorizedMercadoPagoSubscription(
              request.tenant!.organizationId
            );
      const remoteSubscription = authorizedRemote ?? remote;
      const remoteStatus = normalizeStatus(remoteSubscription.status);
      const remotePlan = planFromExternalReference(
        remoteSubscription.external_reference
      );
      const keepActiveTrial =
        subscription.plan === "trial" &&
        subscription.status === "authorized" &&
        remoteStatus !== "authorized";

      subscription = await prisma.organizationSubscription.update({
        where: { id: subscription.id },
        data: {
          ...(keepActiveTrial
            ? {}
            : {
                status: remoteStatus,
                ...(remotePlan ? { plan: remotePlan } : {}),
                ...(remoteStatus === "authorized" ? { trialEndsAt: null } : {})
              }),
          ...(remoteSubscription.id
            ? { mercadoPagoPreapprovalId: remoteSubscription.id }
            : {}),
          ...(remoteSubscription.payer_email
            ? { payerEmail: remoteSubscription.payer_email }
            : {}),
          nextPaymentAt: remoteSubscription.next_payment_date
            ? new Date(remoteSubscription.next_payment_date)
            : null
        }
      });
    } catch {
      // Return the last webhook-backed state if Mercado Pago is temporarily unavailable.
    }
  }
  response.json(ok(subscription));
});

billingRouter.post("/trial", async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const existing = await prisma.organizationSubscription.findUnique({
    where: { organizationId: tenant.organizationId }
  });

  if (existing?.trialStartedAt) {
    throw new AppError(
      409,
      "TRIAL_ALREADY_USED",
      "Organization already used its free trial"
    );
  }
  if (existing?.status === "authorized") {
    throw new AppError(
      409,
      "SUBSCRIPTION_ALREADY_ACTIVE",
      "Organization already has an active subscription"
    );
  }

  const trialStartedAt = new Date();
  const trialEndsAt = new Date(trialStartedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  await prisma.organizationSubscription.upsert({
    where: { organizationId: tenant.organizationId },
    create: {
      organizationId: tenant.organizationId,
      plan: "trial",
      status: "authorized",
      trialStartedAt,
      trialEndsAt
    },
    update: {
      plan: "trial",
      status: "authorized",
      mercadoPagoPreapprovalId: null,
      payerEmail: null,
      nextPaymentAt: null,
      trialStartedAt,
      trialEndsAt
    }
  });

  response.status(201).json(ok({ trialEndsAt }));
});

billingRouter.post("/subscription", async (request, response) => {
  const tenant = request.tenant!;
  requireEditor(tenant.role);
  const { plan, payerEmail } = createSubscriptionSchema.parse(request.body);
  const user = await prisma.user.findUnique({
    where: { id: request.auth!.sub },
    select: { email: true }
  });
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
  const billingEmail =
    env.MERCADOPAGO_TEST_PAYER_EMAIL ??
    payerEmail?.toLowerCase() ??
    user.email;

  const existing = await prisma.organizationSubscription.findUnique({
    where: { organizationId: tenant.organizationId }
  });
  const activeExisting =
    existing &&
    !isExpiredPendingSubscription(existing) &&
    existing.status === "authorized" &&
    existing.plan !== "trial";
  if (activeExisting) {
    throw new AppError(
      409,
      "SUBSCRIPTION_ALREADY_ACTIVE",
      "Organization already has an active subscription"
    );
  }
  const selectedPlan = plans[plan];
  const subscription = await mercadoPagoClient().create({
    body: {
      reason: selectedPlan.name,
      external_reference: `${tenant.organizationId}:${plan}`,
      payer_email: billingEmail,
      back_url: `${env.WEB_ORIGIN.split(",")[0]}/dashboard?subscription=return`,
      status: "pending",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: selectedPlan.amount,
        currency_id: "ARS"
      }
    }
  });
  if (!subscription.id || !subscription.init_point) {
    throw new AppError(
      502,
      "PAYMENT_PROVIDER_ERROR",
      "Mercado Pago did not return a checkout URL"
    );
  }

  const keepActiveTrial = existing?.plan === "trial" && existing.status === "authorized";
  await prisma.organizationSubscription.upsert({
    where: { organizationId: tenant.organizationId },
    create: {
      organizationId: tenant.organizationId,
      plan,
      status: normalizeStatus(subscription.status),
      mercadoPagoPreapprovalId: subscription.id,
      payerEmail: billingEmail,
      nextPaymentAt: subscription.next_payment_date
        ? new Date(subscription.next_payment_date)
        : null
    },
    update: {
      ...(keepActiveTrial
        ? {}
        : {
            plan,
            status: normalizeStatus(subscription.status),
            trialEndsAt: null
          }),
      mercadoPagoPreapprovalId: subscription.id,
      payerEmail: billingEmail,
      nextPaymentAt: subscription.next_payment_date
        ? new Date(subscription.next_payment_date)
        : null
    }
  });

  response.status(201).json(ok({ checkoutUrl: subscription.init_point }));
});

billingPublicRouter.post("/mercadopago", async (request, response) => {
  if (!env.MERCADOPAGO_WEBHOOK_SECRET) {
    throw new AppError(503, "BILLING_NOT_CONFIGURED", "Webhook is not configured");
  }

  const dataId =
    String(request.query["data.id"] ?? "") ||
    String((request.body as { data?: { id?: string } }).data?.id ?? "");
  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers["x-signature"],
      xRequestId: request.headers["x-request-id"],
      dataId,
      secret: env.MERCADOPAGO_WEBHOOK_SECRET,
      toleranceSeconds: 300
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      response.sendStatus(401);
      return;
    }
    throw error;
  }

  const type = String(request.query.type ?? request.body?.type ?? "");
  if (type !== "subscription_preapproval" || !dataId) {
    response.sendStatus(200);
    return;
  }

  const subscription = await mercadoPagoClient().get({ id: dataId });
  const [organizationId, plan] = (subscription.external_reference ?? "").split(":");
  if (!organizationId || !(plan in plans)) {
    response.sendStatus(200);
    return;
  }

  const status = normalizeStatus(subscription.status);
  const existing = await prisma.organizationSubscription.findUnique({
    where: { organizationId }
  });
  if (
    existing?.plan === "trial" &&
    existing.status === "authorized" &&
    status !== "authorized"
  ) {
    response.sendStatus(200);
    return;
  }

  await prisma.organizationSubscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      plan: plan as keyof typeof plans,
      status,
      mercadoPagoPreapprovalId: dataId,
      payerEmail: subscription.payer_email,
      nextPaymentAt: subscription.next_payment_date
        ? new Date(subscription.next_payment_date)
        : null,
      lastWebhookAt: new Date()
    },
    update: {
      plan: plan as keyof typeof plans,
      status,
      ...(status === "authorized" ? { trialEndsAt: null } : {}),
      ...(subscription.payer_email
        ? { payerEmail: subscription.payer_email }
        : {}),
      nextPaymentAt: subscription.next_payment_date
        ? new Date(subscription.next_payment_date)
        : null,
      lastWebhookAt: new Date()
    }
  });

  response.sendStatus(200);
});

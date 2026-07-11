import { MercadoPagoConfig, PreApproval } from "mercadopago";

import { env } from "../config/env.js";
import { prisma } from "../database/prisma.js";
import { logger } from "../lib/logger.js";

const now = new Date();
const retentionLimit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const pendingSubscriptionLimit = new Date(now.getTime() - 30 * 60 * 1000);

const [sessions, passwordResets, rateLimits] = await prisma.$transaction([
  prisma.authSession.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        { revokedAt: { lt: retentionLimit } }
      ]
    }
  }),
  prisma.passwordResetToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        { usedAt: { lt: retentionLimit } }
      ]
    }
  }),
  prisma.rateLimitBucket.deleteMany({
    where: { resetsAt: { lt: retentionLimit } }
  })
]);

logger.info("cleanup completed", {
  sessions: sessions.count,
  passwordResets: passwordResets.count,
  rateLimits: rateLimits.count
});

let mercadoPagoPendingSubscriptions = 0;
if (env.MERCADOPAGO_ACCESS_TOKEN) {
  const client = new PreApproval(
    new MercadoPagoConfig({ accessToken: env.MERCADOPAGO_ACCESS_TOKEN })
  );
  const result = await client.search({ options: { limit: 50 } });
  const pendingSubscriptions = (result.results ?? []).filter((subscription) => {
    const createdAt = subscription.date_created
      ? new Date(subscription.date_created)
      : null;
    return (
      subscription.id &&
      subscription.status === "pending" &&
      String(subscription.reason ?? "").toLowerCase().includes("turnosi") &&
      createdAt &&
      createdAt < pendingSubscriptionLimit
    );
  });

  for (const subscription of pendingSubscriptions) {
    try {
      await client.update({
        id: subscription.id!,
        body: { status: "cancelled" }
      });
      mercadoPagoPendingSubscriptions += 1;
    } catch {
      // Mercado Pago may already have transitioned the subscription.
    }
  }
}

const localPendingSubscriptions = await prisma.organizationSubscription.updateMany({
  where: {
    status: "pending",
    updatedAt: { lt: pendingSubscriptionLimit }
  },
  data: { status: "canceled" }
});

logger.info("billing cleanup completed", {
  localPendingSubscriptions: localPendingSubscriptions.count,
  mercadoPagoPendingSubscriptions
});

await prisma.$disconnect();

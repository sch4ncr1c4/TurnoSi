import { MercadoPagoConfig, PreApproval } from "mercadopago";

import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";

export async function cancelMercadoPagoSubscription(preapprovalId: string) {
  if (!env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new AppError(
      503,
      "BILLING_NOT_CONFIGURED",
      "Mercado Pago is not configured"
    );
  }

  const client = new PreApproval(
    new MercadoPagoConfig({ accessToken: env.MERCADOPAGO_ACCESS_TOKEN })
  );
  await client.update({
    id: preapprovalId,
    body: { status: "cancelled" }
  });
}

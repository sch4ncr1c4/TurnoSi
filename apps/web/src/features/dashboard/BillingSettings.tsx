import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Card, CardBody, CardHeader } from "../../components/ui";
import { useSessionQuery } from "../auth/auth.queries";
import {
  createSubscription,
  getSubscription,
  startFreeTrial,
  type BillingPlan
} from "../billing/billing.api";

const plans: {
  id: BillingPlan;
  name: string;
  price: string;
  description: string;
}[] = [
  {
    id: "initial",
    name: "Inicial",
    price: "$15",
    description: "Agenda pública y hasta 3 miembros."
  },
  {
    id: "professional",
    name: "Profesional",
    price: "$24.000",
    description: "Equipo ilimitado y soporte prioritario."
  },
  {
    id: "operation",
    name: "Operación",
    price: "$39.000",
    description: "Para operaciones y agendas más exigentes."
  }
];

const statusLabels = {
  pending: "Pendiente de autorización",
  authorized: "Activo",
  paused: "Pausado",
  canceled: "Cancelado"
} as const;

export function BillingSettings() {
  const session = useSessionQuery();
  const queryClient = useQueryClient();
  const subscriptionQuery = useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: getSubscription,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 5_000 : false
  });
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | "trial" | null>(
    null
  );
  const [payerEmail, setPayerEmail] = useState("");
  const [message, setMessage] = useState("");
  const subscription = subscriptionQuery.data;
  const effectivePayerEmail =
    payerEmail ||
    subscription?.payerEmail ||
    session.data?.data.user.email ||
    "";

  async function subscribe(plan: BillingPlan) {
    if (selectedPlan !== null) return;
    setSelectedPlan(plan);
    setMessage("");
    let checkoutUrl: string;

    try {
      ({ checkoutUrl } = await createSubscription(
        plan,
        effectivePayerEmail.trim()
      ));
    } catch {
      setMessage("No pudimos iniciar el pago. Revisá la configuración de Mercado Pago.");
      setSelectedPlan(null);
      return;
    }

    window.location.assign(checkoutUrl);
  }

  async function activateTrial() {
    if (selectedPlan !== null) return;
    setSelectedPlan("trial");
    setMessage("");
    try {
      await startFreeTrial();
      await queryClient.invalidateQueries({
        queryKey: ["billing", "subscription"]
      });
    } catch {
      setMessage("No pudimos activar la prueba gratuita.");
    } finally {
      setSelectedPlan(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Plan y facturación</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
              La prueba se activa en TurnoSi. Los planes pagos usan Mercado Pago.
            </p>
          </div>
          {subscription && (
            <span className="w-fit rounded-full bg-[rgba(32,24,54,0.08)] px-3 py-1 text-xs font-semibold">
              {statusLabels[subscription.status]}
            </span>
          )}
        </div>
      </CardHeader>
      <CardBody className="p-4 sm:p-5">
        {!subscription || subscription.status !== "authorized" ? (
          <label className="mb-4 grid max-w-md gap-1.5 text-sm">
            <span className="font-semibold text-[var(--color-muted-strong)]">
              Email de la cuenta de Mercado Pago
            </span>
            <input
              type="email"
              value={effectivePayerEmail}
              onChange={(event) => setPayerEmail(event.target.value)}
              placeholder="Ej: comprador@mercadopago.com"
              className="h-10 rounded-md border border-[var(--color-border-strong)] bg-white/70 px-3 outline-none focus:border-[var(--color-accent)]"
            />
          </label>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {!subscription?.trialStartedAt && (
            <article className="rounded-lg border border-[var(--color-accent)] bg-[rgba(253,134,6,0.08)] p-4">
              <h3 className="font-semibold">Prueba gratuita</h3>
              <p className="mt-2 font-mono text-xl font-semibold">$0</p>
              <p className="mt-2 min-h-10 text-xs leading-5 text-[var(--color-muted-strong)]">
                Acceso completo durante 7 días. Sin Mercado Pago ni tarjeta.
              </p>
              <Button
                type="button"
                variant="accent"
                disabled={selectedPlan !== null}
                onClick={() => void activateTrial()}
                className="mt-4 w-full"
              >
                {selectedPlan === "trial"
                  ? "Activando..."
                  : "Probar gratis 7 días"}
              </Button>
            </article>
          )}
          {plans.map((plan) => {
            const current =
              subscription?.plan === plan.id &&
              subscription.status === "authorized";
            return (
              <article
                key={plan.id}
                className={`rounded-lg border p-4 ${
                  current
                    ? "border-[var(--color-ink)] bg-[rgba(32,24,54,0.05)]"
                    : "border-[var(--color-border)] bg-white/45"
                }`}
              >
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="mt-2 font-mono text-xl font-semibold">
                  {plan.price}
                  <span className="font-sans text-xs font-normal text-[var(--color-muted)]">
                    {" "}/ mes
                  </span>
                </p>
                <p className="mt-2 min-h-10 text-xs leading-5 text-[var(--color-muted-strong)]">
                  {plan.description}
                </p>
                <Button
                  type="button"
                  variant={current ? "secondary" : "primary"}
                  disabled={
                    current ||
                    selectedPlan !== null ||
                    !effectivePayerEmail.trim()
                  }
                  onClick={() => void subscribe(plan.id)}
                  className="mt-4 w-full"
                >
                  {current
                    ? "Plan actual"
                    : selectedPlan === plan.id
                      ? "Abriendo Mercado Pago..."
                      : "Elegir plan"}
                </Button>
              </article>
            );
          })}
        </div>
        {message && (
          <p className="mt-4 rounded-md border border-[#e7b9b2] bg-[#fde8e5] px-3 py-2 text-sm text-[#9f1f16]">
            {message}
          </p>
        )}
        {!effectivePayerEmail && (
          <p className="mt-4 text-sm font-medium text-[#9f1f16]">
            Ingresá el email del comprador de Mercado Pago para habilitar los planes.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

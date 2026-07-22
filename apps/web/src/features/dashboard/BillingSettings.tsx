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
import { billingPlans } from "../billing/billing.plans";

const statusLabels = {
  pending: "Pendiente de autorización",
  paused: "Pausado",
  canceled: "Cancelado"
} as const;

export function BillingSettings({ compact = false }: { compact?: boolean }) {
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
  const currentPlanName =
    subscription?.plan === "trial"
      ? "Prueba Inicial"
      : billingPlans.find((plan) => plan.id === subscription?.plan)?.name;
  const subscriptionStatusLabel =
    subscription?.status === "authorized" && currentPlanName
      ? `Plan actual: ${currentPlanName}`
      : subscription && subscription.status !== "authorized"
        ? statusLabels[subscription.status]
        : "";
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
              {subscriptionStatusLabel}
            </span>
          )}
        </div>
      </CardHeader>
      <CardBody className={compact ? "p-4" : "p-4 sm:p-6"}>
        <div className="mx-auto max-w-6xl">
          {!compact && (
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                Activá tu cuenta
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                Elegí cómo querés empezar
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted-strong)]">
                Podés probar el plan Inicial gratis por 7 días o activar un plan mensual con Mercado Pago.
              </p>
            </div>
          )}

          {!subscription || subscription.status !== "authorized" ? (
            <label className={`mx-auto grid max-w-md gap-1.5 text-left text-sm ${compact ? "mt-1" : "mt-5"}`}>
              <span className="font-semibold text-[var(--color-muted-strong)]">
                Email de la cuenta de Mercado Pago
              </span>
              <input
                type="email"
                value={effectivePayerEmail}
                onChange={(event) => setPayerEmail(event.target.value)}
                placeholder="Ej: comprador@mercadopago.com"
                className="h-11 rounded-lg border border-[var(--color-border-strong)] bg-white/80 px-3 text-center outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(253,134,6,0.18)]"
              />
            </label>
          ) : null}

          <div
            className={`${compact ? "mt-4" : "mt-6"} grid justify-items-center gap-4 sm:grid-cols-2 ${
              subscription?.trialStartedAt ? "xl:grid-cols-3" : "xl:grid-cols-4"
            }`}
          >
            {!subscription?.trialStartedAt && (
              <article className={`${compact ? "min-h-[230px] p-4" : "min-h-[260px] p-5"} flex w-full max-w-[280px] flex-col rounded-2xl border border-[var(--color-accent)] bg-[linear-gradient(135deg,rgba(253,134,6,0.12),rgba(255,251,244,0.9))] shadow-[0_18px_48px_rgba(253,134,6,0.1)]`}>
                <span className="w-fit rounded-full bg-[rgba(253,134,6,0.14)] px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
                  Gratis
                </span>
                <h3 className="mt-4 text-lg font-semibold">Prueba Inicial</h3>
                <p className="mt-3 font-mono text-3xl font-semibold">$0</p>
                <p className="mt-3 text-sm leading-6 text-[var(--color-muted-strong)]">
                  El plan Inicial gratis durante 7 días. Sin Mercado Pago ni tarjeta.
                </p>
                <Button
                  type="button"
                  variant="accent"
                  disabled={selectedPlan !== null}
                  onClick={() => void activateTrial()}
                  className="mt-auto w-full"
                >
                  {selectedPlan === "trial"
                    ? "Activando..."
                    : "Probar gratis 7 días"}
                </Button>
              </article>
            )}
            {billingPlans.map((plan) => {
              const current =
                subscription?.plan === plan.id &&
                subscription.status === "authorized";
              return (
                <article
                  key={plan.id}
                  className={`${compact ? "min-h-[230px] p-4" : "min-h-[260px] p-5"} flex w-full max-w-[280px] flex-col rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-[0_18px_46px_rgba(32,24,54,0.08)] ${
                    current
                      ? "border-[var(--color-ink)] bg-[rgba(32,24,54,0.05)]"
                      : "border-[var(--color-border)] bg-white/62"
                  }`}
                >
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                      plan.recommended
                        ? "bg-[var(--color-accent)] text-white"
                        : "bg-[rgba(32,24,54,0.07)] text-[var(--color-muted-strong)]"
                    }`}
                  >
                    {plan.recommended ? "Recomendado" : plan.highlight}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-3 font-mono text-3xl font-semibold">
                    {plan.price}
                    <span className="font-sans text-xs font-normal text-[var(--color-muted)]">
                      {" "}/ mes
                    </span>
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-muted-strong)]">
                    {plan.description}
                  </p>
                  <ul className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-muted-strong)]">
                    {plan.features.slice(0, compact ? 3 : 5).map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant={current ? "secondary" : "primary"}
                    disabled={
                      current ||
                      selectedPlan !== null ||
                      !effectivePayerEmail.trim()
                    }
                    onClick={() => void subscribe(plan.id)}
                    className="mt-auto w-full"
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

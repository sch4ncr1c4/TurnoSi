import { type ReactNode, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";

import { PageLayout } from "../../components/layout/PageLayout";
import { Button } from "../../components/ui";
import { logout } from "../auth/auth.api";
import { useSessionQuery } from "../auth/auth.queries";
import { BillingSettings } from "../dashboard/BillingSettings";
import { getSubscription } from "./billing.api";

export function PlansPage({ brand }: { brand: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useSessionQuery();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const subscription = useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: getSubscription,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 5_000 : false
  });

  async function signOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await logout();
      queryClient.clear();
      navigate("/login", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  }

  if (subscription.data?.status === "authorized") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <PageLayout>
      <header className="border-b border-white/10 bg-[var(--color-ink)] px-5 py-4 text-white sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="[&_*]:text-white">{brand}</div>
          <Button
            type="button"
            disabled={isSigningOut}
            onClick={() => void signOut()}
          >
            {isSigningOut ? "Cerrando..." : "Cerrar sesión"}
          </Button>
        </div>
      </header>
      <main className="flex flex-1 items-center px-3 py-6 sm:px-6 sm:py-10">
        <section className="mx-auto w-full max-w-6xl">
          <div className="mb-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Activá tu cuenta
            </p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Elegí el plan para continuar
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-[var(--color-muted-strong)]">
              Iniciaste sesión como {session.data?.data.user.email}. Podés
              comenzar con 7 días gratuitos o elegir un plan mensual.
            </p>
          </div>
          <BillingSettings />
        </section>
      </main>
    </PageLayout>
  );
}

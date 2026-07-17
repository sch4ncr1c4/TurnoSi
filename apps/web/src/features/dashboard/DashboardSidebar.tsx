import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { logout } from "../auth/auth.api";
import { useSessionQuery } from "../auth/auth.queries";
import { getApiUrl } from "../../lib/api";
import { buttonMotionClass } from "./dashboard.constants";
import { dashboardSections } from "./dashboard.data";
import { canOpenBillingPlans, canAccessDashboardView, type DashboardRole } from "./dashboard.permissions";
import type { DashboardView } from "./dashboard.types";
import type { SubscriptionStatus } from "../billing/billing.api";

type DashboardSidebarProps = {
  activeView: DashboardView;
  brand: ReactNode;
  navigationLocked?: boolean;
  role?: DashboardRole;
  subscription?: SubscriptionStatus;
  onChangeView: (view: DashboardView) => void;
  onOpenBillingPlans: () => void;
};

const planLabels = {
  trial: "Prueba gratuita",
  initial: "Inicial",
  professional: "Profesional",
  operation: "Operación"
} as const;

export function DashboardSidebar({
  activeView,
  brand,
  navigationLocked = false,
  role,
  subscription,
  onChangeView,
  onOpenBillingPlans
}: DashboardSidebarProps) {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoAvailable, setLogoAvailable] = useState<boolean | null>(null);
  const [logoVersion, setLogoVersion] = useState(0);
  const sessionQuery = useSessionQuery();
  const queryClient = useQueryClient();
  const user = sessionQuery.data?.data.user;
  const membership = sessionQuery.data?.data.organizations?.[0];
  const account = {
    organizationName: membership?.name ?? "",
    userName: user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
      : "",
    role:
      membership?.role === "owner"
        ? "Propietario"
        : membership?.role === "admin"
          ? "Administrador"
          : membership
            ? "Miembro"
            : ""
  };
  const hasLogo = logoAvailable ?? Boolean(membership?.hasLogo);
  const currentPlan =
    subscription?.status === "authorized" ? planLabels[subscription.plan] : null;

  useEffect(() => {
    const handleLogoUpdated = () => {
      setLogoAvailable(true);
      setLogoVersion(Date.now());
    };
    window.addEventListener("turnosi:logo-updated", handleLogoUpdated);
    return () => {
      window.removeEventListener("turnosi:logo-updated", handleLogoUpdated);
    };
  }, []);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      queryClient.clear();
      navigate("/login", { replace: true });
    } catch {
      // Keep the user in the dashboard so they can retry safely.
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <aside className="dashboard-sidebar dot-pattern-corner dot-pattern-bottom-left z-40 flex flex-col border-b border-[var(--color-border)] bg-[var(--color-ink)] px-5 py-5 text-[var(--color-button-text)] md:border-r md:border-b-0 md:px-4 md:py-4">
      <div className="flex justify-center [&_*]:text-[var(--color-button-text)]">{brand}</div>

      <nav className="mt-8 space-y-1 md:mt-7 md:shrink-0">
        {dashboardSections.map((section, index) => {
          const view =
            section.label === "Agenda"
              ? "agenda"
              : section.label === "Clientes"
                ? "customers"
                : section.label === "Equipo"
                  ? "team"
                : section.label === "Disponibilidad"
                  ? "availability"
                  : section.label === "Configuración"
                  ? "settings"
                : "summary";
          if (!canAccessDashboardView(role, view)) return null;
          const isActive =
            (activeView === "summary" && index === 0) ||
            activeView === view;

          return (
            <button
              key={section.label}
              type="button"
              disabled={navigationLocked && view !== "settings"}
              onClick={() => onChangeView(view)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-35 ${
                isActive
                  ? "bg-white/10 font-medium text-white"
                  : "text-white/68 hover:bg-white/8 hover:text-white"
              }`}
            >
              {section.label}
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        disabled={navigationLocked}
        className={`mt-6 w-full shrink-0 rounded-md bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-[var(--color-button-text)] md:mt-5 ${buttonMotionClass}`}
      >
        + Nuevo turno
      </button>

      <div className="mt-6 border-t border-white/12 pt-5 md:mt-auto md:shrink-0 md:pt-5">
        <div className="mb-5 rounded-xl border border-white/12 bg-white/[0.04] p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/16 bg-white/10">
              {hasLogo ? (
                <img
                  src={`${getApiUrl("/api/v1/organizations/current/logo")}?v=${logoVersion}`}
                  alt="Logo de la organización"
                  onError={() => setLogoAvailable(false)}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-white/72">
                  {(account.organizationName || account.userName || "U")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                Organización
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {account.organizationName || "Cargando..."}
              </p>
              <p className="mt-0.5 truncate text-xs text-white/55">
                {account.userName}
                {account.role ? ` · ${account.role}` : ""}
              </p>
              {currentPlan && (
                <p className="mt-1 text-xs font-semibold text-[var(--color-accent)]">
                  Plan {currentPlan}
                </p>
              )}
            </div>
          </div>
        </div>

        {canOpenBillingPlans(membership?.role) && (
          <button
            type="button"
            disabled={navigationLocked}
            onClick={onOpenBillingPlans}
            className="w-full rounded-md border border-[var(--color-accent)] bg-[rgba(253,134,6,0.1)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent)] hover:bg-[rgba(253,134,6,0.18)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            Mejorar plan
          </button>
        )}

        <button
          type="button"
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
          className="mt-5 w-full rounded-md border border-white/20 px-4 py-2.5 text-sm font-medium text-white/72 hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-60"
        >
          {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
        </button>
      </div>
    </aside>
  );
}

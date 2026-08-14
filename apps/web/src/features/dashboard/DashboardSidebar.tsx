import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { logout } from "../auth/auth.api";
import { useSessionQuery } from "../auth/auth.queries";
import { getApiUrl } from "../../lib/api";
import { getBillingPlan } from "../billing/billing.plans";
import { dashboardSections } from "./dashboard.data";
import { canOpenBillingPlans, canAccessDashboardView, type DashboardRole } from "./dashboard.permissions";
import type { DashboardView } from "./dashboard.types";
import type { SubscriptionStatus } from "../billing/billing.api";
import backChevronIcon from "../../components/assets/icons/actions/back-chevron.svg";
import navAvailabilityIcon from "../../components/assets/icons/navigation/availability.svg";
import navCalendarIcon from "../../components/assets/icons/navigation/calendar.svg";
import navHomeIcon from "../../components/assets/icons/navigation/home.svg";
import navSettingsIcon from "../../components/assets/icons/navigation/settings.svg";
import navTeamIcon from "../../components/assets/icons/navigation/team.svg";
import navTeamSettingsIcon from "../../components/assets/icons/navigation/team-settings.svg";
import sparklesIcon from "../../components/assets/sparkles.svg";

const dashboardNavIcons: Partial<Record<DashboardView, string>> = {
  summary: navHomeIcon,
  agenda: navCalendarIcon,
  customers: navTeamIcon,
  team: navTeamSettingsIcon,
  availability: navAvailabilityIcon,
  settings: navSettingsIcon
};

type DashboardSidebarProps = {
  activeView: DashboardView;
  brand: ReactNode;
  navigationLocked?: boolean;
  role?: DashboardRole;
  subscription?: SubscriptionStatus;
  unreadReservationsCount?: number;
  onChangeView: (view: DashboardView) => void;
  onOpenBillingPlans: () => void;
  onOpenManualAppointment: () => void;
};

export function DashboardSidebar({
  activeView,
  brand,
  navigationLocked = false,
  role,
  subscription,
  unreadReservationsCount = 0,
  onChangeView,
  onOpenBillingPlans,
  onOpenManualAppointment
}: DashboardSidebarProps) {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    subscription?.status === "authorized"
      ? subscription.plan === "trial"
        ? "Prueba Inicial"
        : getBillingPlan(subscription.plan)?.name
      : null;

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
    <>
      <header className="dot-pattern-corner dot-pattern-bottom-left sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[var(--color-ink)] px-4 py-3 text-[var(--color-button-text)] md:hidden">
        <div className="[&_*]:text-[var(--color-button-text)] [&_img]:h-12">{brand}</div>
        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen(true)}
          className="group grid h-11 w-11 place-items-center rounded-xl border border-white/14 bg-white/8 transition hover:bg-white/14"
        >
          <span className="relative h-5 w-6">
            <span className="absolute left-0 top-0 h-0.5 w-6 rounded-full bg-white" />
            <span className="absolute left-0 top-2 h-0.5 w-6 rounded-full bg-white" />
            <span className="absolute left-0 top-4 h-0.5 w-6 rounded-full bg-white" />
          </span>
        </button>
      </header>

      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-[60] bg-[rgba(18,13,31,0.42)] backdrop-blur-[3px] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

    <aside className={`dashboard-sidebar dot-pattern-corner dot-pattern-bottom-left z-[70] flex flex-col border-b border-[var(--color-border)] bg-[var(--color-ink)] px-5 py-5 text-[var(--color-button-text)] transition-transform duration-300 ease-out max-md:border-r max-md:border-white/10 max-md:shadow-[24px_0_70px_rgba(18,13,31,0.28)] max-md:overflow-y-auto max-md:overscroll-contain max-md:pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:z-40 md:border-r md:border-b-0 md:px-4 md:py-4 ${
      isMobileMenuOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
    }`}>
      <div className="dashboard-sidebar-brand flex items-center justify-center [&_*]:text-[var(--color-button-text)] max-md:justify-between">
        <div>{brand}</div>
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setIsMobileMenuOpen(false)}
          className="hidden h-10 w-10 place-items-center rounded-xl border border-white/14 bg-white/8 text-2xl leading-none text-white/82 transition hover:bg-white/14 hover:text-white max-md:grid"
        >
          ×
        </button>
      </div>

      <nav className="dashboard-sidebar-nav mt-8 space-y-1 md:mt-7 md:shrink-0">
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
          const icon = dashboardNavIcons[view];

          return (
            <button
              key={section.label}
              type="button"
              disabled={navigationLocked && view !== "settings"}
              onClick={() => {
                onChangeView(view);
                setIsMobileMenuOpen(false);
              }}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-35 ${
                isActive
                  ? "bg-white/10 font-medium text-white"
                  : "text-white/68 hover:bg-white/8 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                {icon && (
                  <img
                    src={icon}
                    alt=""
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 opacity-90 invert"
                  />
                )}
                <span className="min-w-0 flex-1">{section.label}</span>
                {view === "agenda" && unreadReservationsCount > 0 && (
                  <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-[var(--color-button-text)]">
                    {unreadReservationsCount > 9 ? "9+" : unreadReservationsCount}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        disabled={navigationLocked}
        onClick={() => {
          onOpenManualAppointment();
          setIsMobileMenuOpen(false);
        }}
        className="dashboard-sidebar-new-turn landing-cta mt-6 inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-[var(--color-button-text)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 md:mt-5"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 text-white"
        >
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
        <span>Nuevo turno</span>
      </button>

      <div className="dashboard-sidebar-footer mt-6 border-t border-white/12 pt-5 md:mt-auto md:shrink-0 md:pt-5">
        <div className="dashboard-sidebar-organization mb-5 rounded-xl border border-white/12 bg-white/[0.04] p-3">
          <div className="flex items-center gap-3">
            <div className="dashboard-sidebar-org-avatar flex h-10 w-10 items-center justify-center rounded-full border border-white/16 bg-white/10">
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
            onClick={() => {
              onOpenBillingPlans();
              setIsMobileMenuOpen(false);
            }}
            className="dashboard-sidebar-plan-button group relative flex w-full items-center gap-3 overflow-hidden rounded-md border border-white/14 bg-white/[0.045] px-3.5 py-3 text-left text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(253,134,6,0.5)] hover:bg-white/[0.07] hover:shadow-[0_16px_36px_rgba(0,0,0,0.18)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <img
              src={sparklesIcon}
              alt=""
              aria-hidden="true"
              className="dashboard-sidebar-plan-sparkles h-5 w-5 shrink-0"
            />
            <span className="min-w-0 flex-1">Mejorar plan</span>
            <span className="dashboard-sidebar-plan-badge">PRO</span>
            <img
              src={backChevronIcon}
              alt=""
              aria-hidden="true"
              className="dashboard-sidebar-plan-arrow h-4 w-4 shrink-0 rotate-180"
            />
          </button>
        )}

        <button
          type="button"
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
          className="dashboard-sidebar-logout mt-5 w-full rounded-md border border-white/20 px-4 py-2.5 text-sm font-medium text-white/72 hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-60"
        >
          {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
        </button>
      </div>
    </aside>
    </>
  );
}

import {
  Suspense,
  lazy,
  useDeferredValue,
  useCallback,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useSearchParams } from "react-router-dom";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  startOfToday,
  subDays,
  subMonths,
  subWeeks
} from "date-fns";
import { es } from "date-fns/locale";

import { PageLayout } from "../../components/layout/PageLayout";
import { queryKeys } from "../../lib/query-keys";
import { useSessionQuery } from "../auth/auth.queries";
import type { AuthResult } from "../auth/auth.types";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardSidebar } from "./DashboardSidebar";
import { StatusChangeModal } from "./StatusChangeModal";
import {
  type AppointmentFilter,
  type AppointmentStatusLabel,
  type ScheduleView,
  type StatusChangeDraft
} from "./dashboard.constants";
import { type DashboardAppointment } from "./dashboard.data";
import {
  getDashboardAppointments,
  updateDashboardAppointmentStatus
} from "./dashboard.api";
import type { DashboardView } from "./dashboard.types";
import { getSubscription } from "../billing/billing.api";
import { BillingSettings } from "./BillingSettings";

const DashboardAgendaView = lazy(() =>
  import("./DashboardAgendaView").then((module) => ({
    default: module.DashboardAgendaView
  }))
);
const DashboardAvailabilityView = lazy(() =>
  import("./DashboardAvailabilityView").then((module) => ({
    default: module.DashboardAvailabilityView
  }))
);
const DashboardCustomersView = lazy(() =>
  import("./DashboardCustomersView").then((module) => ({
    default: module.DashboardCustomersView
  }))
);
const DashboardTeamView = lazy(() =>
  import("./DashboardTeamView").then((module) => ({
    default: module.DashboardTeamView
  }))
);
const DashboardSettingsView = lazy(() =>
  import("./DashboardSettingsView").then((module) => ({
    default: module.DashboardSettingsView
  }))
);
const DashboardSummaryView = lazy(() =>
  import("./DashboardSummaryView").then((module) => ({
    default: module.DashboardSummaryView
  }))
);

type DashboardPageProps = {
  brand: ReactNode;
};

const dashboardViewStorageKey = "turnosi.dashboard.activeView";
const dashboardViews: DashboardView[] = [
  "summary",
  "agenda",
  "customers",
  "team",
  "availability",
  "settings"
];

function isSameDate(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function getInitialDashboardView(): DashboardView {
  if (typeof window === "undefined") return "summary";

  const storedView = window.localStorage.getItem(dashboardViewStorageKey);
  return dashboardViews.includes(storedView as DashboardView)
    ? (storedView as DashboardView)
    : "summary";
}

function DashboardSectionFallback() {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.84)] p-5 shadow-[0_16px_44px_rgba(32,24,54,0.05)]">
      <p className="text-sm font-medium text-[var(--color-ink)]">
        Cargando sección...
      </p>
    </div>
  );
}

export function DashboardPage({ brand }: DashboardPageProps) {
  const [activeView, setActiveView] = useState<DashboardView>(
    getInitialDashboardView
  );
  const [onboardingRequired, setOnboardingRequired] = useState(false);
  const [scheduleView, setScheduleView] = useState<ScheduleView>("day");
  const [selectedDate, setSelectedDate] = useState(() => startOfToday());
  const [appointmentFilter, setAppointmentFilter] =
    useState<AppointmentFilter>("all");
  const [dayFilter, setDayFilter] = useState("all");
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [settingsHaveUnsavedChanges, setSettingsHaveUnsavedChanges] =
    useState(false);
  const [pendingDashboardView, setPendingDashboardView] =
    useState<DashboardView | null>(null);
  const [billingError, setBillingError] = useState("");
  const [billingMessage, setBillingMessage] = useState("");
  const [showBillingPlans, setShowBillingPlans] = useState(false);
  const [appointmentStatusChanges, setAppointmentStatusChanges] = useState<
    Record<string, AppointmentStatusLabel>
  >({});
  const [pendingStatusChange, setPendingStatusChange] =
    useState<StatusChangeDraft | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const session = useSessionQuery();
  const subscriptionQuery = useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: getSubscription,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 5_000 : false
  });
  const deferredAppointmentSearch = useDeferredValue(
    appointmentSearch.trim().toLowerCase()
  );
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const monthStart = startOfMonth(selectedDate);
  const appointmentsKey = queryKeys.appointments(format(monthStart, "yyyy-MM"));
  const appointmentsQuery = useQuery({
    queryKey: appointmentsKey,
    queryFn: () => getDashboardAppointments(monthStart, addMonths(monthStart, 1)),
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    enabled:
      (activeView === "summary" || activeView === "agenda") &&
      session.data?.data.organizations?.[0]?.onboardingCompleted !== false
  });
  const allAppointments = appointmentsQuery.data ?? [];

  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setPendingStatusChange(null);
    }
  }, []);

  useEffect(() => {
    if (session.data) {
      const required =
        session.data.data.organizations?.[0]?.onboardingCompleted === false;
      // Session state can force the first dashboard view.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOnboardingRequired(required);
      if (required) setActiveView("settings");
    }
  }, [session.data]);

  useEffect(() => {
    if (searchParams.get("subscription") !== "return") return;
    void getSubscription()
      .then((subscription) => {
        setBillingMessage(
          subscription?.status === "authorized"
            ? "Tu suscripción quedó activa."
            : "Estamos confirmando tu suscripción con Mercado Pago."
        );
        setSearchParams({}, { replace: true });
      })
      .catch(() => {
        setBillingError("No pudimos consultar el estado de la suscripción.");
      });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleEscape]);

  useEffect(() => {
    window.localStorage.setItem(dashboardViewStorageKey, activeView);
  }, [activeView]);

  useEffect(() => {
    const handleSettingsDirty = (event: Event) => {
      setSettingsHaveUnsavedChanges(
        Boolean((event as CustomEvent<boolean>).detail)
      );
    };
    window.addEventListener("turnosi:settings-dirty", handleSettingsDirty);
    return () =>
      window.removeEventListener("turnosi:settings-dirty", handleSettingsDirty);
  }, []);


  const appointments = getAppointmentsForSelectedPeriod();
  const dayOptions = Array.from(
    new Set(
      appointments
        .map((appointment) => appointment.day)
        .filter((day): day is string => Boolean(day))
    )
  );
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesDay =
      scheduleView === "day" ||
      dayFilter === "all" ||
      appointment.day === dayFilter;
    const status = getAppointmentStatus(appointment);
    const matchesSearch =
      deferredAppointmentSearch.length === 0 ||
      [
        appointment.client,
        appointment.service,
        appointment.assignee,
        appointment.channel,
        appointment.time,
        appointment.day
      ]
        .some((value) =>
          (value ?? "").toLowerCase().includes(deferredAppointmentSearch)
        );

    if (!matchesDay) return false;
    if (!matchesSearch) return false;
    if (appointmentFilter === "attended") return status === "Asistido";
    if (appointmentFilter === "pending") return status === "En espera";
    if (appointmentFilter === "confirmed") {
      return status === "Confirmado" || status === "Pagado";
    }
    if (appointmentFilter === "cancelled") return status === "Cancelado";
    if (appointmentFilter === "noShow") return status === "No asistió";

    return true;
  });
  const visibleAppointments = showAllAppointments
    ? filteredAppointments
    : filteredAppointments.slice(0, 5);
  const appointmentHours = appointments
    .filter((appointment) => appointment.startsAt)
    .map((appointment) => new Date(appointment.startsAt!).getHours());
  const scheduleStartHour = Math.min(9, ...appointmentHours);
  const scheduleEndHour = Math.max(20, ...appointmentHours);
  const scheduleTimeRange = `${String(scheduleStartHour).padStart(2, "0")}:00 a ${String(scheduleEndHour).padStart(2, "0")}:00`;
  const scheduleTitle =
    scheduleView === "day"
      ? "Turnos de hoy"
      : scheduleView === "week"
        ? "Turnos de la semana"
        : "Turnos del mes";
  const scheduleSubtitle =
    scheduleView === "day"
      ? `${format(selectedDate, "EEEE dd", { locale: es })} · ${scheduleTimeRange}`
      : scheduleView === "week"
        ? `Semana del ${format(
            startOfWeek(selectedDate, { weekStartsOn: 1 }),
            "dd",
            { locale: es }
          )} al ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "dd 'de' MMMM", {
            locale: es
          })} · Agenda consolidada`
        : `${format(selectedDate, "MMMM", { locale: es })} · Agenda consolidada`;

  function getAppointmentStatus(
    appointment: DashboardAppointment
  ): AppointmentStatusLabel {
    return (
      appointmentStatusChanges[appointment.id] ??
      (appointment.attended ? "Asistido" : appointment.status)
    );
  }

  function getAppointmentsForSelectedPeriod(): DashboardAppointment[] {
    const selectedWeek = {
      start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
      end: endOfWeek(selectedDate, { weekStartsOn: 1 })
    };

    if (scheduleView === "day") {
      return allAppointments.filter((appointment) =>
        appointment.startsAt
          ? isSameDate(new Date(appointment.startsAt), selectedDate)
          : false
      );
    }

    if (scheduleView === "week") {
      return allAppointments.filter((appointment) =>
        appointment.startsAt
          ? isWithinInterval(new Date(appointment.startsAt), selectedWeek)
          : false
      );
    }

    return allAppointments.filter((appointment) =>
      appointment.startsAt
        ? isSameMonth(new Date(appointment.startsAt), selectedDate)
        : false
    );
  }

  function selectScheduleView(view: ScheduleView) {
    setScheduleView(view);
    setShowAllAppointments(false);
    setDayFilter("all");
  }

  function goToToday() {
    setSelectedDate(startOfToday());
    setScheduleView("day");
  }

  function goToPreviousPeriod() {
    setSelectedDate((current) => {
      if (scheduleView === "day") return subDays(current, 1);
      if (scheduleView === "week") return subWeeks(current, 1);
      return subMonths(current, 1);
    });
  }

  function goToNextPeriod() {
    setSelectedDate((current) => {
      if (scheduleView === "day") return addDays(current, 1);
      if (scheduleView === "week") return addWeeks(current, 1);
      return addMonths(current, 1);
    });
  }

  function goToPreviousCalendarMonth() {
    setSelectedDate((current) => subMonths(current, 1));
  }

  function goToNextCalendarMonth() {
    setSelectedDate((current) => addMonths(current, 1));
  }

  function selectAppointmentFilter(filter: AppointmentFilter) {
    setAppointmentFilter(filter);
    setShowAllAppointments(false);
  }

  function selectDayFilter(day: string) {
    setDayFilter(day);
    setShowAllAppointments(false);
  }

  function requestStatusChange(
    appointment: DashboardAppointment,
    currentStatus: AppointmentStatusLabel,
    isCorrection = false
  ) {
    setPendingStatusChange({
      appointment,
      currentStatus,
      nextStatus: "",
      isCorrection
    });
  }

  function selectNextStatus(nextStatus: AppointmentStatusLabel) {
    setPendingStatusChange((current) =>
      current
        ? {
            ...current,
            nextStatus
          }
        : current
    );
  }

  async function confirmStatusChange() {
    const draft = pendingStatusChange;

    if (!draft?.nextStatus || isChangingStatus) return;

    setIsChangingStatus(true);
    try {
      await updateDashboardAppointmentStatus(
        draft.appointment.id,
        draft.nextStatus as AppointmentStatusLabel
      );
      queryClient.setQueryData<DashboardAppointment[]>(
        appointmentsKey,
        (current = []) =>
          current.map((appointment) =>
            appointment.id === draft.appointment.id
              ? {
                  ...appointment,
                  status: draft.nextStatus as AppointmentStatusLabel,
                  attended: draft.nextStatus === "Asistido"
                }
              : appointment
          )
      );
      if (
        draft.currentStatus === "No asistió" ||
        draft.nextStatus === "No asistió"
      ) {
        await queryClient.invalidateQueries({ queryKey: ["customers"] });
      }
      setAppointmentStatusChanges((current) => ({
        ...current,
        [draft.appointment.id]: draft.nextStatus as AppointmentStatusLabel
      }));
      setPendingStatusChange(null);
    } finally {
      setIsChangingStatus(false);
    }
  }

  function changeDashboardView(view: DashboardView) {
    if (onboardingRequired && view !== "settings") return;
    if (view === activeView) return;
    if (activeView === "settings" && settingsHaveUnsavedChanges) {
      window.dispatchEvent(new Event("turnosi:show-settings-dirty"));
      setPendingDashboardView(view);
      return;
    }
    setActiveView(view);
  }

  const currentOrganization = session.data?.data.organizations?.[0];
  const requiresSubscription =
    currentOrganization?.role === "owner" &&
    subscriptionQuery.isSuccess &&
    subscriptionQuery.data?.status !== "authorized";

  if (requiresSubscription) {
    return <Navigate to="/planes" replace />;
  }

  return (
    <PageLayout>
      <div className="grid min-h-screen lg:grid-cols-[320px_minmax(0,1fr)]">
        <DashboardSidebar
          activeView={activeView}
          brand={brand}
          navigationLocked={onboardingRequired}
          subscription={subscriptionQuery.data}
          onOpenBillingPlans={() => setShowBillingPlans(true)}
          onChangeView={changeDashboardView}
        />

        <section className="min-w-0">
          <DashboardHeader
            activeView={activeView}
          />

          <div className="space-y-4 px-5 py-4 sm:px-7">
            {billingError && (
              <div className="rounded-lg border border-[#e7b9b2] bg-[#fde8e5] px-4 py-3 text-sm font-medium text-[#9f1f16]">
                {billingError}
              </div>
            )}
            {billingMessage && (
              <div className="rounded-lg border border-[#b9d8bf] bg-[#eef8ee] px-4 py-3 text-sm font-medium text-[#28633a]">
                {billingMessage}
              </div>
            )}
            <Suspense fallback={<DashboardSectionFallback />}>
              {activeView === "agenda" ? (
                <DashboardAgendaView
                  appointments={allAppointments}
                  filteredAppointments={filteredAppointments}
                  onNextMonth={goToNextCalendarMonth}
                  scheduleView={scheduleView}
                  searchTerm={appointmentSearch}
                  selectedDate={selectedDate}
                  onNextPeriod={goToNextPeriod}
                  onSearchTermChange={setAppointmentSearch}
                  onToday={goToToday}
                  onPreviousMonth={goToPreviousCalendarMonth}
                  onPreviousPeriod={goToPreviousPeriod}
                  onRequestStatusChange={requestStatusChange}
                  onSelectDate={setSelectedDate}
                  onSelectScheduleView={selectScheduleView}
                />
              ) : activeView === "customers" ? (
                <DashboardCustomersView />
              ) : activeView === "team" ? (
                <DashboardTeamView />
              ) : activeView === "availability" ? (
                <DashboardAvailabilityView />
              ) : activeView === "settings" ? (
                <DashboardSettingsView
                  isOnboarding={onboardingRequired}
                  onCompleted={() => {
                    setOnboardingRequired(false);
                    queryClient.setQueryData<AuthResult>(
                      queryKeys.session,
                      (current) =>
                        current
                          ? {
                              ...current,
                              data: {
                                ...current.data,
                                organizations: current.data.organizations?.map(
                                  (organization, index) =>
                                    index === 0
                                      ? {
                                          ...organization,
                                          onboardingCompleted: true
                                        }
                                      : organization
                                )
                              }
                            }
                          : current
                    );
                    setActiveView("summary");
                  }}
                />
              ) : (
                <DashboardSummaryView
                  appointmentFilter={appointmentFilter}
                  dateFilterLabel={scheduleView === "week" ? "Día" : "Fecha"}
                  dayFilter={dayFilter}
                  dayOptions={dayOptions}
                  filteredAppointments={filteredAppointments}
                  getAppointmentStatus={getAppointmentStatus}
                  hasActiveFilters={
                    appointmentFilter !== "all" ||
                    dayFilter !== "all" ||
                    appointmentSearch.trim().length > 0
                  }
                  hasHiddenAppointments={
                    filteredAppointments.length > visibleAppointments.length
                  }
                  onClearFilters={() => {
                    setAppointmentFilter("all");
                    setDayFilter("all");
                    setAppointmentSearch("");
                    setShowAllAppointments(false);
                  }}
                  onRequestStatusChange={requestStatusChange}
                  onNextMonth={goToNextCalendarMonth}
                  onPreviousMonth={goToPreviousCalendarMonth}
                  onSelectDate={setSelectedDate}
                  onSelectAppointmentFilter={selectAppointmentFilter}
                  onSelectDayFilter={selectDayFilter}
                  onSelectScheduleView={selectScheduleView}
                  onSearchTermChange={setAppointmentSearch}
                  searchTerm={appointmentSearch}
                  scheduleSubtitle={scheduleSubtitle}
                  scheduleTitle={scheduleTitle}
                  scheduleView={scheduleView}
                  selectedDate={selectedDate}
                  setShowAllAppointments={setShowAllAppointments}
                  showAllAppointments={showAllAppointments}
                  visibleAppointments={visibleAppointments}
                />
              )}
            </Suspense>
          </div>
        </section>
      </div>

      {pendingStatusChange && (
        <StatusChangeModal
          draft={pendingStatusChange}
          isConfirming={isChangingStatus}
          onCancel={() => {
            if (!isChangingStatus) setPendingStatusChange(null);
          }}
          onConfirm={confirmStatusChange}
          onSelectNextStatus={(status) => {
            if (!isChangingStatus) selectNextStatus(status);
          }}
        />
      )}
      {showBillingPlans && (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-[rgba(32,24,54,0.58)] p-3 backdrop-blur-sm sm:place-items-center">
          <section
            role="dialog"
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[#fffaf4] shadow-[0_28px_90px_rgba(32,24,54,0.34)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] p-4 sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                  Planes
                </p>
                <h2 className="mt-1 text-xl font-semibold">Mejorar plan</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowBillingPlans(false)}
                className="rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm font-semibold"
              >
                Cerrar
              </button>
            </div>
            <div className="p-3 sm:p-5">
              <BillingSettings />
            </div>
          </section>
        </div>
      )}
      {pendingDashboardView && (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-[rgba(32,24,54,0.58)] p-3 backdrop-blur-sm sm:place-items-center">
          <section
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[#fffaf4] p-5 shadow-[0_28px_90px_rgba(32,24,54,0.34)]"
          >
            <h2 className="text-lg font-semibold">Tenés cambios sin guardar</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-strong)]">
              Si salís de Configuración, los cambios realizados se perderán.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new Event("turnosi:hide-settings-dirty"));
                  setPendingDashboardView(null);
                }}
                className="rounded-md border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView(pendingDashboardView);
                  setPendingDashboardView(null);
                }}
                className="rounded-md bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-button-text)]"
              >
                Descartar cambios
              </button>
            </div>
          </section>
        </div>
      )}
    </PageLayout>
  );
}

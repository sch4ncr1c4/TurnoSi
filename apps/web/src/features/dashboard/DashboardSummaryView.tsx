import { useState } from "react";
import {
  buttonMotionClass,
  scheduleOptions,
  type AppointmentFilter,
  type AppointmentStatusLabel,
  type ScheduleView
} from "./dashboard.constants";
import { AppointmentDetailsModal } from "./AppointmentDetailsModal";
import type { DashboardAppointment } from "./dashboard.data";
import { SummaryAppointmentsTable } from "./SummaryAppointmentsTable";
import { SummaryFilters } from "./SummaryFilters";
import { SummarySidePanel } from "./SummarySidePanel";

type DashboardSummaryViewProps = {
  appointmentFilter: AppointmentFilter;
  appointmentIndicatorDays: string[];
  dateFilterLabel: string;
  disablePreviousMonth?: boolean;
  minDate?: Date;
  dayFilter: string;
  dayOptions: string[];
  filteredAppointments: DashboardAppointment[];
  filteredTotal: number;
  getAppointmentStatus: (appointment: DashboardAppointment) => AppointmentStatusLabel;
  hasActiveFilters: boolean;
  hasHiddenAppointments: boolean;
  isLoadingAppointments?: boolean;
  onClearFilters: () => void;
  onLoadMoreAppointments: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onRequestStatusChange: (
    appointment: DashboardAppointment,
    currentStatus: AppointmentStatusLabel,
    isCorrection?: boolean
  ) => void;
  onRequestReschedule: (appointment: DashboardAppointment) => void;
  onSearchTermChange: (value: string) => void;
  onSelectAppointmentFilter: (filter: AppointmentFilter) => void;
  onSelectDate: (date: Date) => void;
  onSelectDayFilter: (day: string) => void;
  onSelectScheduleView: (view: ScheduleView) => void;
  onViewAgenda: () => void;
  searchTerm: string;
  scheduleSubtitle: string;
  scheduleTitle: string;
  scheduleView: ScheduleView;
  selectedDate: Date;
  visibleAppointments: DashboardAppointment[];
};

export function DashboardSummaryView({
  appointmentFilter,
  appointmentIndicatorDays,
  dateFilterLabel,
  disablePreviousMonth = false,
  minDate,
  dayFilter,
  dayOptions,
  filteredAppointments,
  filteredTotal,
  getAppointmentStatus,
  hasActiveFilters,
  hasHiddenAppointments,
  isLoadingAppointments = false,
  onClearFilters,
  onLoadMoreAppointments,
  onNextMonth,
  onPreviousMonth,
  onRequestStatusChange,
  onRequestReschedule,
  onSearchTermChange,
  onSelectAppointmentFilter,
  onSelectDate,
  onSelectDayFilter,
  onSelectScheduleView,
  onViewAgenda,
  searchTerm,
  scheduleSubtitle,
  scheduleTitle,
  scheduleView,
  selectedDate,
  visibleAppointments
}: DashboardSummaryViewProps) {
  const [selectedAppointment, setSelectedAppointment] =
    useState<DashboardAppointment | null>(null);
  const confirmedCount = filteredAppointments.filter(
    (appointment) => getAppointmentStatus(appointment) === "Confirmado"
  ).length;
  const pendingCount = filteredAppointments.filter(
    (appointment) => getAppointmentStatus(appointment) === "En espera"
  ).length;

  return (
    <>
    <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <article
        id="today"
        className="min-w-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[#ffffff]"
      >
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">{scheduleTitle}</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {scheduleSubtitle}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-muted-strong)]">
              <span>
                <strong className="font-mono text-[var(--color-ink)]">
                  {filteredAppointments.length}
                </strong>{" "}
                {filteredAppointments.length === 1 ? "turno en vista" : "turnos en vista"}
              </span>
              <span>
                <strong className="font-mono text-[var(--color-ink)]">
                  {confirmedCount}
                </strong>{" "}
                confirmados
              </span>
              <span>
                <strong className="font-mono text-[var(--color-ink)]">
                  {pendingCount}
                </strong>{" "}
                pendientes
              </span>
            </div>
          </div>
          <div className="flex rounded-md border border-[var(--color-border)] p-1 text-sm">
            {scheduleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelectScheduleView(option.value)}
                className={`rounded px-3 py-1.5 transition-colors duration-200 ${
                  scheduleView === option.value
                    ? "bg-[var(--color-ink)] text-[var(--color-button-text)]"
                    : "text-[var(--color-muted-strong)] hover:bg-white/60 hover:text-[var(--color-ink)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <SummaryFilters
          appointmentFilter={appointmentFilter}
          dateFilterLabel={dateFilterLabel}
          dayFilter={dayFilter}
          dayOptions={dayOptions}
          filteredCount={filteredTotal}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
          onSearchTermChange={onSearchTermChange}
          onSelectAppointmentFilter={onSelectAppointmentFilter}
          onSelectDayFilter={onSelectDayFilter}
          searchTerm={searchTerm}
          scheduleView={scheduleView}
        />

        <SummaryAppointmentsTable
          dateFilterLabel={dateFilterLabel}
          getAppointmentStatus={getAppointmentStatus}
          onSelectAppointment={setSelectedAppointment}
          onRequestStatusChange={onRequestStatusChange}
          scheduleView={scheduleView}
          visibleAppointments={visibleAppointments}
        />

        <div className="flex flex-col items-center justify-center gap-2 border-t border-[var(--color-border)] px-4 py-3">
          <p className="text-sm text-[var(--color-muted)]">
            Mostrando {visibleAppointments.length} de {filteredTotal} turnos
          </p>
          {hasHiddenAppointments ? (
            <button
              type="button"
              disabled={isLoadingAppointments}
              onClick={onLoadMoreAppointments}
              className={`rounded-md border border-[var(--color-border-strong)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink)] ${buttonMotionClass}`}
            >
              {isLoadingAppointments ? "Cargando..." : "Cargar más"}
            </button>
          ) : null}
        </div>
      </article>

      <SummarySidePanel
        appointmentIndicatorDays={appointmentIndicatorDays}
        appointments={filteredAppointments}
        disablePreviousMonth={disablePreviousMonth}
        minDate={minDate}
        selectedDate={selectedDate}
        onNextMonth={onNextMonth}
        onPreviousMonth={onPreviousMonth}
        onSelectAppointment={setSelectedAppointment}
        onSelectDate={onSelectDate}
        onViewAgenda={onViewAgenda}
      />
    </section>
    {selectedAppointment && (
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onRequestReschedule={() => {
          onRequestReschedule(selectedAppointment);
          setSelectedAppointment(null);
        }}
        onRequestStatusChange={() => {
          onRequestStatusChange(
            selectedAppointment,
            selectedAppointment.status,
            true
          );
          setSelectedAppointment(null);
        }}
      />
    )}
    </>
  );
}

import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  isSameMonth,
  startOfWeek
} from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

import { ModalCloseButton } from "../../components/ui";
import {
  scheduleOptions,
  statusClassName,
  type AppointmentStatusLabel,
  type ScheduleView
} from "./dashboard.constants";
import {
  DashboardCalendarCard
} from "./DashboardCalendarCard";
import { getMonthCalendarDays } from "./dashboard.calendar-utils";
import type { DashboardAppointment } from "./dashboard.data";

type AgendaTone =
  | "paid"
  | "confirmed"
  | "pending"
  | "attended"
  | "available"
  | "empty";

function getAgendaEventClassName(tone: AgendaTone) {
  if (tone === "paid") {
    return "border-[#9bc7a4] bg-[#eef8ee] text-[#1f6b35]";
  }

  if (tone === "confirmed") {
    return "border-[#f0b56f] bg-[#fff3e3] text-[#a44b00]";
  }

  if (tone === "pending") {
    return "border-[#98cbd5] bg-[#eef9fb] text-[#275f6b]";
  }

  if (tone === "attended") {
    return "border-[#c8b8ee] bg-[#f3edff] text-[#4d2f9b]";
  }

  if (tone === "available") {
    return "border-dashed border-[#f0b56f] bg-[#fffaf4] text-[#8a5a22]";
  }

  return "border-dashed border-[var(--color-border-strong)] bg-white/40 text-[var(--color-muted-strong)]";
}

function getAgendaHours(appointments: DashboardAppointment[]) {
  const appointmentHours = appointments
    .filter((appointment) => appointment.startsAt)
    .map((appointment) => new Date(appointment.startsAt!).getHours());
  const minHour = Math.min(9, ...appointmentHours);
  const maxHour = Math.max(20, ...appointmentHours);

  return Array.from({ length: maxHour - minHour + 1 }, (_, index) => {
    const hour = minHour + index;
    return {
      hour,
      label: `${String(hour).padStart(2, "0")}:00`
    };
  });
}

type DashboardAgendaViewProps = {
  appointments: DashboardAppointment[];
  filteredAppointments: DashboardAppointment[];
  onNextMonth: () => void;
  onNextPeriod: () => void;
  onSearchTermChange: (value: string) => void;
  onToday: () => void;
  onPreviousMonth: () => void;
  onPreviousPeriod: () => void;
  onRequestStatusChange: (
    appointment: DashboardAppointment,
    currentStatus: AppointmentStatusLabel,
    isCorrection?: boolean
  ) => void;
  onSelectDate: (date: Date) => void;
  onSelectScheduleView: (view: ScheduleView) => void;
  searchTerm: string;
  scheduleView: ScheduleView;
  selectedDate: Date;
};

export function DashboardAgendaView({
  appointments,
  filteredAppointments,
  onNextMonth,
  onNextPeriod,
  onSearchTermChange,
  onToday,
  onPreviousMonth,
  onPreviousPeriod,
  onRequestStatusChange,
  onSelectDate,
  onSelectScheduleView,
  searchTerm,
  scheduleView,
  selectedDate
}: DashboardAgendaViewProps) {
  const [selectedAppointment, setSelectedAppointment] =
    useState<DashboardAppointment | null>(null);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const agendaHours = getAgendaHours(appointments);
  const agendaEvents = appointments
    .filter((appointment) => appointment.startsAt)
    .map((appointment) => {
      const startsAt = new Date(appointment.startsAt!);
      const tone: AgendaTone =
        appointment.status === "En espera"
          ? "pending"
          : appointment.status === "Asistido"
            ? "attended"
            : appointment.status === "Pagado"
              ? "paid"
              : "confirmed";
      return {
        id: appointment.id,
        day: differenceInCalendarDays(startsAt, weekStart),
        hour: startsAt.getHours(),
        time: appointment.time,
        title: appointment.service,
        client: appointment.client,
        tone
      };
    });
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return {
      active: isSameDay(date, selectedDate),
      date,
      dateLabel: format(date, "dd"),
      index,
      label: format(date, "EEE", { locale: es }).replace(".", "")
    };
  });
  const visibleDays =
    scheduleView === "day"
      ? weekDays.filter((day) => day.active)
      : weekDays;
  const gridTemplateColumns =
    scheduleView === "day"
      ? "52px minmax(0,1fr)"
      : `58px repeat(${visibleDays.length}, minmax(0,1fr))`;
  const periodLabel =
    scheduleView === "day"
      ? format(selectedDate, "EEEE dd 'de' MMMM", { locale: es })
      : `${format(weekStart, "dd", { locale: es })} al ${format(
          addDays(weekStart, 6),
          "dd 'de' MMMM",
          { locale: es }
        )}`;
  const sortedMatches = [...filteredAppointments].sort((first, second) =>
    (first.startsAt ?? "").localeCompare(second.startsAt ?? "")
  );

  if (scheduleView === "month") {
    return (
      <AgendaMonthView
        appointments={filteredAppointments}
        selectedDate={selectedDate}
        onNextMonth={onNextMonth}
        onNextPeriod={onNextPeriod}
        onSearchTermChange={onSearchTermChange}
        onToday={onToday}
        onPreviousMonth={onPreviousMonth}
        onPreviousPeriod={onPreviousPeriod}
        onSelectDate={onSelectDate}
        onSelectScheduleView={onSelectScheduleView}
        searchTerm={searchTerm}
        scheduleView={scheduleView}
      />
    );
  }

  return (
    <>
    <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <article className="min-w-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.86)] shadow-[0_16px_44px_rgba(32,24,54,0.05)]">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md border border-[var(--color-border-strong)] bg-[rgba(255,251,244,0.72)] px-3 py-1.5 text-left text-xs lg:w-48"
          >
            <span>
              <span className="block text-xs text-[var(--color-muted)]">
                {scheduleView === "day" ? "Día" : "Semana del"}
              </span>
              <span className="font-semibold capitalize">{periodLabel}</span>
            </span>
            <span className="text-[var(--color-muted)]">⌄</span>
          </button>
          <AgendaViewControls
            onNextPeriod={onNextPeriod}
            onToday={onToday}
            onPreviousPeriod={onPreviousPeriod}
            onSelectScheduleView={onSelectScheduleView}
            scheduleView={scheduleView}
          />
        </div>
        <div className="border-b border-[var(--color-border)] bg-[rgba(240,234,217,0.38)] px-3 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Buscar turno
              </span>
              <input
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                placeholder="Cliente, servicio, hora o responsable"
                className="h-10 w-full rounded-md border border-[var(--color-border-strong)] bg-[rgba(255,251,244,0.94)] px-3 text-sm text-[var(--color-ink)] outline-none"
              />
            </label>
            <div className="rounded-md border border-[var(--color-border)] bg-white/60 px-3 py-2 text-sm text-[var(--color-muted-strong)]">
              {sortedMatches.length} turnos en esta vista
            </div>
          </div>
        </div>

        <div className="stable-scrollbar overflow-x-auto">
          <div className={scheduleView === "day" ? "min-w-0" : "min-w-[820px]"}>
            <div
              className="grid border-b border-[var(--color-border)]"
              style={{ gridTemplateColumns }}
            >
              <div />
              {visibleDays.map((day) => (
                <div
                  key={day.date.toISOString()}
                  className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium"
                >
                  <span>{day.label}</span>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      day.active
                        ? "bg-[var(--color-ink)] text-white"
                        : "text-[var(--color-muted-strong)]"
                    }`}
                  >
                    {day.dateLabel}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid" style={{ gridTemplateColumns }}>
              {agendaHours.map(({ hour, label }) => (
                <div key={hour} className="contents">
                  <div className="border-r border-[var(--color-border)] px-2 py-3 text-[11px] text-[var(--color-muted)] sm:px-3">
                    {label}
                  </div>
                  {visibleDays.map((day) => {
                    const events = agendaEvents.filter(
                      (item) => item.day === day.index && item.hour === hour
                    );

                    return (
                      <div
                        key={`${label}-${day.label}`}
                        className={`min-h-[42px] border-r border-b border-[var(--color-border)] p-1 ${
                          day.active ? "bg-[rgba(32,24,54,0.025)]" : ""
                                  }`}
                                >
                        {events.length > 0 && (
                          <div
                            className={
                              scheduleView === "day"
                                ? "flex flex-wrap gap-1.5"
                                : "space-y-1"
                            }
                          >
                            {events.map((event) => (
                              <button
                                key={event.id}
                                type="button"
                                onClick={() =>
                                  setSelectedAppointment(
                                    appointments.find(
                                      (appointment) => appointment.id === event.id
                                    ) ?? null
                                  )
                                }
                                className={`rounded border px-2 py-1.5 text-left text-[11px] leading-4 shadow-sm ${
                                  scheduleView === "day"
                                    ? "w-full sm:max-w-[260px]"
                                    : "w-full"
                                } ${getAgendaEventClassName(event.tone)}`}
                              >
                                <span className="text-[10px] font-semibold tabular-nums">
                                  {event.time}
                                </span>
                                <span className="block truncate text-[11px] font-semibold leading-4">
                                  {event.title}
                                </span>
                                {event.client && (
                                  <span className="block truncate text-[10px] opacity-75">
                                    {event.client}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>

      <aside className="min-w-0 space-y-2 xl:sticky xl:top-4 xl:self-start">
        <DashboardCalendarCard
          onNextMonth={onNextMonth}
          onPreviousMonth={onPreviousMonth}
          onSelectDate={onSelectDate}
          selectedDate={selectedDate}
        />
        <AgendaMatchesCard
          appointments={sortedMatches}
          onSelectAppointment={setSelectedAppointment}
          scheduleView={scheduleView}
          selectedDate={selectedDate}
        />
      </aside>
    </section>
    {selectedAppointment && (
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
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

function getMobileMonthItems(selectedDate: Date, appointments: DashboardAppointment[]) {
  const grouped = new Map<string, { count: number; date: Date }>();
  for (const appointment of appointments) {
    if (!appointment.startsAt) continue;
    const date = new Date(appointment.startsAt);
    if (!isSameMonth(date, selectedDate)) continue;
    const key = format(date, "yyyy-MM-dd");
    const current = grouped.get(key);
    grouped.set(key, { count: (current?.count ?? 0) + 1, date });
  }
  return [...grouped.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

function getMonthEventCount(day: Date, appointments: DashboardAppointment[]) {
  return appointments.filter(
    (appointment) =>
      appointment.startsAt && isSameDay(new Date(appointment.startsAt), day)
  ).length;
}

function AgendaMonthView({
  appointments,
  onNextMonth,
  onNextPeriod,
  onSearchTermChange,
  onToday,
  onPreviousMonth,
  onPreviousPeriod,
  onSelectDate,
  onSelectScheduleView,
  searchTerm,
  scheduleView,
  selectedDate
}: {
  appointments: DashboardAppointment[];
  onNextMonth: () => void;
  onNextPeriod: () => void;
  onSearchTermChange: (value: string) => void;
  onToday: () => void;
  onPreviousMonth: () => void;
  onPreviousPeriod: () => void;
  onSelectDate: (date: Date) => void;
  onSelectScheduleView: (view: ScheduleView) => void;
  searchTerm: string;
  scheduleView: ScheduleView;
  selectedDate: Date;
}) {
  const [showAllMonthItems, setShowAllMonthItems] = useState(false);
  const calendarDays = getMonthCalendarDays(selectedDate);
  const mobileMonthItems = getMobileMonthItems(selectedDate, appointments);
  const visibleMobileMonthItems = showAllMonthItems
    ? mobileMonthItems
    : mobileMonthItems.slice(0, 5);
  const hasHiddenMobileMonthItems =
    mobileMonthItems.length > visibleMobileMonthItems.length;

  return (
    <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <article className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.86)] p-3 shadow-[0_16px_44px_rgba(32,24,54,0.05)]">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold capitalize">
              {format(selectedDate, "MMMM yyyy", { locale: es })}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Vista mensual de turnos y disponibilidad.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <AgendaViewControls
              onNextPeriod={onNextPeriod}
              onToday={onToday}
              onPreviousPeriod={onPreviousPeriod}
              onSelectScheduleView={onSelectScheduleView}
              scheduleView={scheduleView}
            />
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[rgba(240,234,217,0.38)] px-3 py-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Buscar turno
            </span>
            <input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Cliente, servicio, hora o responsable"
              className="h-10 w-full rounded-md border border-[var(--color-border-strong)] bg-[rgba(255,251,244,0.94)] px-3 text-sm text-[var(--color-ink)] outline-none"
            />
          </label>
        </div>

        <div className="mt-3 space-y-2 md:hidden">
          {visibleMobileMonthItems.map(({ count, date }) => (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => {
                onSelectDate(date);
                onSelectScheduleView("day");
              }}
              className="w-full rounded-md border border-[var(--color-border)] bg-[rgba(255,251,244,0.66)] px-3 py-2.5 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] opacity-75">
                    {format(date, "EEE dd", { locale: es })}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold">
                    {count} {count === 1 ? "turno" : "turnos"} agendados
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[rgba(253,134,6,0.14)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--color-ink)]">
                  {count}
                </span>
              </div>
            </button>
          ))}

          {hasHiddenMobileMonthItems ? (
            <button
              type="button"
              onClick={() => setShowAllMonthItems(true)}
              className="mx-auto mt-3 block rounded-md border border-[var(--color-border-strong)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink)]"
            >
              Ver más
            </button>
          ) : (
            showAllMonthItems &&
            mobileMonthItems.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllMonthItems(false)}
                className="mx-auto mt-3 block rounded-md border border-[var(--color-border-strong)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink)]"
              >
                Ver menos
              </button>
            )
          )}
        </div>

        <div className="mt-3 hidden grid-cols-7 gap-1 md:grid">
          {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
            <span
              key={day}
              className="px-2 py-1 text-center text-xs font-semibold text-[var(--color-muted)]"
            >
              {day}
            </span>
          ))}
          {calendarDays.map((day) => {
            const dayEventsCount = isSameMonth(day, selectedDate)
              ? getMonthEventCount(day, appointments)
              : 0;

            return (
              <div
                key={day.toISOString()}
                className={`min-h-24 rounded-md border border-[var(--color-border)] bg-[rgba(255,251,244,0.68)] p-2 ${
                  isSameDay(day, selectedDate) ? "ring-1 ring-[var(--color-ink)]" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      isSameDay(day, selectedDate)
                        ? "bg-[var(--color-ink)] text-white"
                        : !isSameMonth(day, selectedDate)
                          ? "text-[var(--color-muted)]/45"
                          : "text-[var(--color-ink)]"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                <div className="mt-2 space-y-1.5">
                  {dayEventsCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDate(day);
                        onSelectScheduleView("day");
                      }}
                      className="w-full rounded border border-[rgba(253,134,6,0.24)] bg-[rgba(253,134,6,0.1)] px-2 py-1.5 text-center transition-colors hover:border-[var(--color-accent)] hover:bg-[rgba(253,134,6,0.18)]"
                    >
                      <span className="font-mono text-sm font-semibold text-[var(--color-ink)]">
                        {dayEventsCount}
                      </span>
                      <span className="ml-1 text-[10px] font-semibold text-[var(--color-muted-strong)]">
                        {dayEventsCount === 1 ? "turno" : "turnos"}
                      </span>
                    </button>
                  ) : (
                    <p className="rounded border border-dashed border-[var(--color-border)] px-2 py-2 text-xs text-[var(--color-muted)]">
                      Sin turnos
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <aside className="min-w-0 space-y-2 xl:sticky xl:top-4 xl:self-start">
        <DashboardCalendarCard
          onNextMonth={onNextMonth}
          onPreviousMonth={onPreviousMonth}
          onSelectDate={onSelectDate}
          selectedDate={selectedDate}
        />
      </aside>
    </section>
  );
}

function AgendaMatchesCard({
  appointments,
  onSelectAppointment,
  scheduleView,
  selectedDate
}: {
  appointments: DashboardAppointment[];
  onSelectAppointment: (appointment: DashboardAppointment) => void;
  scheduleView: ScheduleView;
  selectedDate: Date;
}) {
  const title =
    scheduleView === "day"
      ? "Turnos del día"
      : scheduleView === "week"
        ? "Turnos de la semana"
        : "Turnos del mes";

  return (
    <article className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.84)] p-3 shadow-[0_16px_44px_rgba(32,24,54,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {format(selectedDate, "dd 'de' MMMM", { locale: es })}
          </p>
        </div>
        <span className="rounded-full bg-[rgba(253,134,6,0.14)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--color-ink)]">
          {appointments.length}
        </span>
      </div>
      <div className="mt-3 space-y-2.5">
        {appointments.slice(0, 8).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectAppointment(item)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-white/60 px-3 py-2.5 text-left transition-colors hover:border-[var(--color-accent)] hover:bg-white/80"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">
                {item.time}
              </span>
              <span className="text-xs text-[var(--color-muted)]">
                {item.day ?? ""}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
              {item.service}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-muted-strong)]">
              {item.client} · {item.assignee}
            </p>
          </button>
        ))}
        {appointments.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">
            No encontramos turnos con esos filtros.
          </p>
        )}
      </div>
    </article>
  );
}

function AppointmentDetailsModal({
  appointment,
  onClose,
  onRequestStatusChange
}: {
  appointment: DashboardAppointment;
  onClose: () => void;
  onRequestStatusChange: () => void;
}) {
  const startsAt = appointment.startsAt ? new Date(appointment.startsAt) : null;
  const dateLabel = startsAt
    ? format(startsAt, "EEEE dd 'de' MMMM 'de' yyyy", { locale: es })
    : appointment.day ?? "Fecha no disponible";

  return (
    <div
      className="modal-overlay-enter fixed inset-0 z-50 grid place-items-end bg-[rgba(32,24,54,0.58)] p-3 backdrop-blur-sm sm:place-items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-details-title"
        className="modal-panel-enter modal-scroll-panel w-full max-w-lg overflow-x-hidden rounded-xl border border-[var(--color-border)] bg-[#fffaf4] shadow-[0_28px_90px_rgba(32,24,54,0.34)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] p-4 sm:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Detalle del turno
            </p>
            <h2 id="appointment-details-title" className="mt-1 text-xl font-semibold">
              {appointment.client}
            </h2>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className="divide-y divide-[var(--color-border)] px-4 sm:px-5">
          <AppointmentDetail label="Servicio" value={appointment.service} />
          <AppointmentDetail label="Fecha" value={dateLabel} capitalize />
          <AppointmentDetail label="Hora" value={appointment.time} />
          <AppointmentDetail
            label="Profesional"
            value={appointment.assignee || "Sin asignar"}
          />
          <div className="flex items-center justify-between gap-5 py-3.5 text-sm">
            <span className="text-[var(--color-muted-strong)]">Estado</span>
            <button
              type="button"
              onClick={onRequestStatusChange}
              aria-label="Cambiar estado"
              className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-transform hover:translate-x-0.5 ${
                statusClassName[appointment.status]
              }`}
            >
              {appointment.status}
              <span aria-hidden="true">›</span>
            </button>
          </div>
          <AppointmentDetail label="Origen" value={appointment.channel} />
        </div>
      </section>
    </div>
  );
}

function AppointmentDetail({
  capitalize = false,
  label,
  value
}: {
  capitalize?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-5 py-3.5 text-sm">
      <span className="text-[var(--color-muted-strong)]">{label}</span>
      <strong
        className={`text-right font-semibold text-[var(--color-ink)] ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </strong>
    </div>
  );
}

function AgendaViewControls({
  onNextPeriod,
  onToday,
  onPreviousPeriod,
  onSelectScheduleView,
  scheduleView
}: {
  onNextPeriod: () => void;
  onToday: () => void;
  onPreviousPeriod: () => void;
  onSelectScheduleView: (view: ScheduleView) => void;
  scheduleView: ScheduleView;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex rounded-md border border-[var(--color-border)] text-sm">
        <button
          type="button"
          onClick={onPreviousPeriod}
          className="px-3 py-2 text-[var(--color-ink)] hover:bg-white/60"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={onNextPeriod}
          className="border-l border-[var(--color-border)] px-3 py-2 text-[var(--color-ink)] hover:bg-white/60"
        >
          ›
        </button>
      </div>
      <div className="flex w-full rounded-md border border-[var(--color-border)] p-1 text-sm sm:w-auto">
        <button
          type="button"
          onClick={onToday}
          className="mr-1 flex-1 rounded bg-[var(--color-accent)] px-3 py-1.5 font-semibold text-[var(--color-button-text)] transition-colors duration-200 hover:bg-[#e97805] sm:flex-none"
        >
          Hoy
        </button>
        <span className="mx-1 hidden w-px bg-[var(--color-border)] sm:block" />
        {scheduleOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelectScheduleView(option.value)}
            className={`flex-1 rounded px-3 py-1.5 transition-colors duration-200 sm:flex-none ${
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
  );
}

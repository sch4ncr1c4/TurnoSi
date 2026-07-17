import type { DashboardAppointment } from "./dashboard.data";
import {
  DashboardCalendarCard
} from "./DashboardCalendarCard";

type SummarySidePanelProps = {
  appointments: DashboardAppointment[];
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onSelectAppointment: (appointment: DashboardAppointment) => void;
  onSelectDate: (date: Date) => void;
  onViewAgenda: () => void;
  selectedDate: Date;
};

export function SummarySidePanel({
  appointments,
  onNextMonth,
  onPreviousMonth,
  onSelectAppointment,
  onSelectDate,
  onViewAgenda,
  selectedDate
}: SummarySidePanelProps) {
  return (
    <aside className="min-w-0 space-y-2 xl:sticky xl:top-4 xl:self-start">
      <DashboardCalendarCard
        onNextMonth={onNextMonth}
        onPreviousMonth={onPreviousMonth}
        onSelectDate={onSelectDate}
        selectedDate={selectedDate}
      />
      <SummaryUpcomingCard
        appointments={appointments}
        onSelectAppointment={onSelectAppointment}
        onViewAgenda={onViewAgenda}
      />
    </aside>
  );
}

function SummaryUpcomingCard({
  appointments,
  onSelectAppointment,
  onViewAgenda
}: {
  appointments: DashboardAppointment[];
  onSelectAppointment: (appointment: DashboardAppointment) => void;
  onViewAgenda: () => void;
}) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const upcoming = appointments
    .filter((appointment) =>
      appointment.startsAt &&
      new Date(appointment.startsAt) >= now &&
      new Date(appointment.startsAt) <= windowEnd
    )
    .sort((first, second) => (first.startsAt ?? "").localeCompare(second.startsAt ?? ""));

  return (
    <article className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.84)] p-3 shadow-[0_16px_44px_rgba(32,24,54,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Próximas 2 horas</h2>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Se actualiza según la hora actual
          </p>
        </div>
        <button
          type="button"
          onClick={onViewAgenda}
          className="text-xs font-semibold text-[var(--color-accent)]"
        >
          Ver agenda
        </button>
      </div>
      <div className="mt-3 space-y-2.5">
        {upcoming.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectAppointment(item)}
            className="grid w-full grid-cols-[48px_minmax(0,1fr)] gap-2 border-b border-[var(--color-border)] pb-2 text-left transition-colors hover:text-[var(--color-accent)] last:border-b-0 last:pb-0"
          >
            <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">
              {item.time}
            </span>
            <div>
              <p className="text-sm font-semibold">{item.service}</p>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                {item.client}
              </p>
            </div>
          </button>
        ))}
        {upcoming.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">
            No hay turnos en las próximas 2 horas.
          </p>
        )}
      </div>
    </article>
  );
}

import type { DashboardAppointment } from "./dashboard.data";
import {
  DashboardCalendarCard
} from "./DashboardCalendarCard";

type SummarySidePanelProps = {
  appointments: DashboardAppointment[];
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
};

export function SummarySidePanel({
  appointments,
  onNextMonth,
  onPreviousMonth,
  onSelectDate,
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
      <SummaryUpcomingCard appointments={appointments} />
    </aside>
  );
}

function SummaryUpcomingCard({ appointments }: { appointments: DashboardAppointment[] }) {
  const upcoming = appointments
    .filter((appointment) =>
      appointment.startsAt && new Date(appointment.startsAt) >= new Date()
    )
    .slice(0, 5);
  return (
    <article className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.84)] p-3 shadow-[0_16px_44px_rgba(32,24,54,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Próximos turnos</h2>
        <a href="#today" className="text-xs font-semibold text-[var(--color-accent)]">
          Ver agenda
        </a>
      </div>
      <div className="mt-3 space-y-2.5">
        {upcoming.map((item) => (
          <div
            key={`${item.time}-${item.service}`}
            className="grid grid-cols-[48px_minmax(0,1fr)] gap-2 border-b border-[var(--color-border)] pb-2 last:border-b-0 last:pb-0"
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
          </div>
        ))}
        {upcoming.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">No hay próximos turnos.</p>
        )}
      </div>
    </article>
  );
}

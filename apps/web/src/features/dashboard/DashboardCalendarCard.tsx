import { format, isSameDay, isSameMonth } from "date-fns";

import {
  formatCalendarMonthLabel,
  getMonthCalendarDays
} from "./dashboard.calendar-utils";

type DashboardCalendarCardProps = {
  appointmentDays?: string[];
  disablePreviousMonth?: boolean;
  minDate?: Date;
  onNextMonth?: () => void;
  onPreviousMonth?: () => void;
  onSelectDate?: (date: Date) => void;
  selectedDate: Date;
};

export function DashboardCalendarCard({
  appointmentDays = [],
  disablePreviousMonth = false,
  minDate,
  onNextMonth,
  onPreviousMonth,
  onSelectDate,
  selectedDate
}: DashboardCalendarCardProps) {
  const calendarDays = getMonthCalendarDays(selectedDate);
  const appointmentDaySet = new Set(appointmentDays);

  return (
    <article className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[#ffffff] p-3 shadow-[0_16px_44px_rgba(32,24,54,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Calendario</h2>
        <div className="flex items-center gap-2 text-sm font-medium">
          {onPreviousMonth && (
            <button
              type="button"
              disabled={disablePreviousMonth}
              onClick={onPreviousMonth}
              className="rounded px-1.5 py-1 text-[var(--color-muted-strong)] hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Mes anterior"
            >
              ‹
            </button>
          )}
          <span className="min-w-24 text-center capitalize">
            {formatCalendarMonthLabel(selectedDate)}
          </span>
          {onNextMonth ? (
            <button
              type="button"
              onClick={onNextMonth}
              className="rounded px-1.5 py-1 text-[var(--color-muted-strong)] hover:bg-white/60"
            >
              ›
            </button>
          ) : (
            <span className="text-[var(--color-muted)]">›</span>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-xs">
        {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
          <span key={day} className="font-semibold text-[var(--color-muted)]">
            {day}
          </span>
        ))}
        {calendarDays.map((day) => {
          const isActive = isSameDay(day, selectedDate);
          const isMuted = !isSameMonth(day, selectedDate);
          const isBeforeMinDate = minDate ? day < minDate : false;
          const hasAppointments =
            isSameMonth(day, selectedDate) &&
            !isActive &&
            appointmentDaySet.has(format(day, "yyyy-MM-dd"));
          const className = `relative mx-auto flex h-7 w-7 items-center justify-center rounded-full font-medium ${
            isActive
              ? "bg-[var(--color-ink)] text-white"
              : isMuted
                ? "text-[var(--color-muted)]/45"
                : isBeforeMinDate
                  ? "text-[var(--color-muted)]/35"
                : "text-[var(--color-ink)]"
          }`;
          const content = (
            <>
              {format(day, "d")}
              {hasAppointments && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#569165]" />
              )}
              {isActive && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[var(--color-accent)]" />
              )}
            </>
          );

          if (onSelectDate) {
            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={isBeforeMinDate}
                onClick={() => onSelectDate(day)}
                className={`${className} disabled:cursor-not-allowed`}
              >
                {content}
              </button>
            );
          }

          return (
            <span key={day.toISOString()} className={className}>
              {content}
            </span>
          );
        })}
      </div>
    </article>
  );
}

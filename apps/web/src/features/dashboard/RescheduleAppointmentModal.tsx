import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import calendarIcon from "../../components/assets/calendar.svg";
import clockIcon from "../../components/assets/clock.svg";
import { ModalCloseButton } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { queryKeys } from "../../lib/query-keys";
import {
  getDashboardAppointmentRescheduleSlots,
  rescheduleDashboardAppointment
} from "./dashboard.api";
import type { DashboardAppointment } from "./dashboard.data";
import type { BookingDay } from "../booking/booking.api";

type RescheduleAppointmentModalProps = {
  appointment: DashboardAppointment;
  onClose: () => void;
  onRescheduled: (startsAt: string) => void;
};

const emptyDays: BookingDay[] = [];

function dayLabel(value: string) {
  return format(new Date(`${value}T12:00:00`), "EEE dd MMM", { locale: es });
}

function dateTimeLabel(value?: string) {
  return value
    ? format(new Date(value), "EEEE dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
    : "Fecha no disponible";
}

export function RescheduleAppointmentModal({
  appointment,
  onClose,
  onRescheduled
}: RescheduleAppointmentModalProps) {
  const [selectedDay, setSelectedDay] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const slotsQuery = useQuery({
    queryKey: queryKeys.appointmentRescheduleSlots(appointment.id),
    queryFn: () => getDashboardAppointmentRescheduleSlots(appointment.id)
  });
  const days = slotsQuery.data?.days ?? emptyDays;
  const effectiveSelectedDay = days.some((day) => day.date === selectedDay)
    ? selectedDay
    : days[0]?.date ?? "";
  const selectedSlots =
    days.find((day) => day.date === effectiveSelectedDay)?.slots ?? [];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  async function handleSubmit() {
    if (!startsAt || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const result = await rescheduleDashboardAppointment(appointment.id, startsAt);
      onRescheduled(result.data.startsAt);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError &&
          requestError.code === "SLOT_UNAVAILABLE"
          ? "Ese horario acaba de ocuparse. Elegí otro."
          : "No pudimos reprogramar el turno. Probá con otro horario."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="viewport-overlay modal-overlay-enter z-[80] grid place-items-end bg-[rgba(32,24,54,0.58)] p-3 backdrop-blur-sm sm:place-items-center"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-title"
        className="modal-panel-enter modal-scroll-panel w-full max-w-2xl overflow-hidden rounded-2xl border border-[rgba(32,24,54,0.12)] bg-[#ffffff] shadow-[0_28px_90px_rgba(32,24,54,0.34)]"
      >
        <header className="flex items-start justify-between gap-4 px-5 pb-5 pt-5 sm:px-7 sm:pt-7">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Reprogramar turno
            </p>
            <h2
              id="reschedule-title"
              className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]"
            >
              Elegí un nuevo horario
            </h2>
            <p className="mt-2 truncate text-base text-[var(--color-muted)]">
              {appointment.service} · {appointment.client}
            </p>
          </div>
          <ModalCloseButton disabled={isSaving} onClick={onClose} />
        </header>

        <div className="border-y border-[var(--color-border)] px-5 py-4 sm:px-7">
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard
              icon={calendarIcon}
              label="Horario actual"
              value={dateTimeLabel(appointment.startsAt)}
            />
            <SummaryCard
              icon={clockIcon}
              label="Nuevo horario"
              value={startsAt ? dateTimeLabel(startsAt) : "Sin elegir"}
            />
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5 sm:px-7">
          {slotsQuery.isPending ? (
            <p className="rounded-xl border border-[var(--color-border)] bg-[#ffffff] px-4 py-5 text-sm text-[var(--color-muted-strong)]">
              Buscando horarios disponibles...
            </p>
          ) : days.length > 0 ? (
            <>
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  Día
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {days.slice(0, 9).map((day) => (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => {
                        setSelectedDay(day.date);
                        setStartsAt("");
                      }}
                      className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                        effectiveSelectedDay === day.date
                          ? "border-[var(--color-ink)] bg-[rgba(32,24,54,0.055)]"
                          : "border-[var(--color-border)] bg-[#ffffff] hover:border-[var(--color-accent)]"
                      }`}
                    >
                      <span className="block font-semibold capitalize text-[var(--color-ink)]">
                        {dayLabel(day.date)}
                      </span>
                      <span className="mt-1 block text-xs text-[var(--color-muted)]">
                        {day.slots.length} horarios
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  Hora
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedSlots.map((slot) => (
                    <button
                      key={slot.startsAt}
                      type="button"
                      onClick={() => setStartsAt(slot.startsAt)}
                      className={`rounded-lg border px-3 py-2 font-mono text-sm font-semibold transition ${
                        startsAt === slot.startsAt
                          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-button-text)]"
                          : "border-[var(--color-border)] bg-[#ffffff] text-[var(--color-ink)] hover:border-[var(--color-accent)]"
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[rgba(32,24,54,0.025)] px-4 py-5 text-sm text-[var(--color-muted-strong)]">
              No encontramos horarios disponibles para este turno.
            </p>
          )}

          {error && <p className="text-sm font-semibold text-[#b42318]">{error}</p>}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="rounded-lg border border-[var(--color-border-strong)] bg-[#ffffff] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!startsAt || isSaving}
            onClick={() => void handleSubmit()}
            className={`rounded-lg px-6 py-3 text-sm font-semibold transition ${
              startsAt && !isSaving
                ? "bg-[var(--color-accent)] text-[var(--color-button-text)] shadow-[0_14px_30px_rgba(253,134,6,0.22)] hover:-translate-y-0.5"
                : "cursor-not-allowed bg-[rgba(32,24,54,0.12)] text-[var(--color-muted)]"
            }`}
          >
            {isSaving ? "Guardando..." : "Guardar cambio"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[#ffffff] p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[rgba(32,24,54,0.055)]">
        <img src={icon} alt="" aria-hidden="true" className="h-5 w-5 opacity-85" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
          {label}
        </span>
        <strong className="mt-1 block text-sm font-semibold capitalize leading-5 text-[var(--color-ink)]">
          {value}
        </strong>
      </span>
    </div>
  );
}

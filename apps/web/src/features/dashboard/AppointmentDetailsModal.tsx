import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect } from "react";

import calendarIcon from "../../components/assets/calendar.svg";
import clockIcon from "../../components/assets/clock.svg";
import userIcon from "../../components/assets/user.svg";
import { ModalCloseButton } from "../../components/ui";
import { buttonMotionClass } from "./dashboard.constants";
import {
  getDepositPaymentBadgeClassName,
  getDepositPaymentLabel,
  type DashboardAppointment
} from "./dashboard.data";

type AppointmentDetailsModalProps = {
  appointment: DashboardAppointment;
  onClose: () => void;
  onRequestReschedule?: () => void;
  onRequestStatusChange: () => void;
};

export function AppointmentDetailsModal({
  appointment,
  onClose,
  onRequestReschedule,
  onRequestStatusChange
}: AppointmentDetailsModalProps) {
  const startsAt = appointment.startsAt ? new Date(appointment.startsAt) : null;
  const dateLabel = startsAt
    ? format(startsAt, "EEEE dd 'de' MMMM 'de' yyyy", { locale: es })
    : appointment.day ?? "Fecha no disponible";
  const compactDateLabel = startsAt
    ? format(startsAt, "EEEE dd 'de' MMMM 'de' yyyy", { locale: es })
    : appointment.day ?? "Fecha no disponible";
  const dateTimeLabel = `${dateLabel}, ${appointment.time}`;
  const depositLabel = getDepositPaymentLabel(appointment);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="viewport-overlay modal-overlay-enter z-50 grid place-items-end bg-[rgba(32,24,54,0.58)] p-3 backdrop-blur-sm sm:place-items-center"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-details-title"
        className="modal-panel-enter modal-scroll-panel w-full max-w-2xl overflow-x-hidden rounded-2xl border border-[rgba(32,24,54,0.12)] bg-[#ffffff] shadow-[0_28px_90px_rgba(32,24,54,0.34)]"
      >
        <div className="relative overflow-hidden px-5 pb-5 pt-5 sm:px-7 sm:pb-7 sm:pt-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full border border-[rgba(32,24,54,0.05)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                Detalle del turno
              </p>
              <h2
                id="appointment-details-title"
                className="mt-8 truncate text-3xl font-semibold leading-tight text-[var(--color-ink)]"
              >
                {appointment.service}
              </h2>
              <p className="mt-2 truncate text-xl text-[var(--color-muted)]">
                {appointment.client}
              </p>
            </div>
            <ModalCloseButton onClick={onClose} />
          </div>

          <div className="mt-7 flex flex-col gap-3 text-sm text-[var(--color-ink)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <MetaItem icon={calendarIcon} value={compactDateLabel} capitalize />
            <MetaDivider />
            <MetaItem icon={clockIcon} value={appointment.time} />
            <MetaDivider />
            <MetaItem icon={userIcon} value={appointment.assignee || "Sin asignar"} />
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] px-5 sm:px-7">
          <div className="divide-y divide-[var(--color-border)]">
            <AppointmentDetail label="Cliente" value={appointment.client} />
            <AppointmentStatusDetail
              status={appointment.status}
              onClick={onRequestStatusChange}
            />
            <AppointmentDetail label="Origen" value={appointment.channel} />
            <AppointmentDetail
              label="Profesional"
              value={appointment.assignee || "Sin asignar"}
            />
            <AppointmentDetail label="Fecha y hora" value={dateTimeLabel} capitalize />
            {depositLabel && (
              <div className="flex items-center justify-between gap-5 py-3.5 text-sm">
                <span className="text-[var(--color-muted-strong)]">Seña</span>
                <span className={getDepositPaymentBadgeClassName(appointment)}>
                  {depositLabel}
                </span>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-1 flex flex-col-reverse gap-3 border-t border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-1 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
          >
            Cancelar
          </button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onRequestReschedule}
              disabled={!onRequestReschedule}
              className={`rounded-lg border border-[var(--color-border-strong)] bg-[#ffffff] px-5 py-3 text-sm font-semibold text-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-50 ${buttonMotionClass}`}
            >
              Reprogramar turno
            </button>
            <button
              type="button"
              onClick={onRequestStatusChange}
              className={`rounded-lg bg-[var(--color-accent)] px-7 py-3 text-sm font-semibold text-[var(--color-button-text)] shadow-[0_14px_30px_rgba(253,134,6,0.22)] ${buttonMotionClass}`}
            >
              Confirmar
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function MetaItem({
  capitalize = false,
  icon,
  value
}: {
  capitalize?: boolean;
  icon: string;
  value: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[rgba(32,24,54,0.055)]">
        <img src={icon} alt="" aria-hidden="true" className="h-5 w-5 opacity-85" />
      </span>
      <span className={`truncate font-medium ${capitalize ? "capitalize" : ""}`}>
        {value}
      </span>
    </span>
  );
}

function MetaDivider() {
  return (
    <span
      aria-hidden="true"
      className="hidden h-7 w-px bg-[var(--color-border)] sm:block"
    />
  );
}

function AppointmentStatusDetail({
  onClick,
  status
}: {
  onClick: () => void;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-4 text-sm">
      <span className="text-[var(--color-muted-strong)]">Estado</span>
      <button
        type="button"
        onClick={onClick}
        aria-label="Cambiar estado"
        className="inline-flex items-center gap-2 rounded-full bg-[rgba(253,134,6,0.12)] px-3 py-1.5 text-sm font-medium text-[var(--color-accent)] transition hover:bg-[rgba(253,134,6,0.18)]"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
        {status}
      </button>
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
    <div className="flex items-start justify-between gap-5 py-4 text-sm">
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

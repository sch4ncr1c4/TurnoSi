import { format } from "date-fns";
import { es } from "date-fns/locale";

import { ModalCloseButton } from "../../components/ui";
import { statusClassName } from "./dashboard.constants";
import type { DashboardAppointment } from "./dashboard.data";

type AppointmentDetailsModalProps = {
  appointment: DashboardAppointment;
  onClose: () => void;
  onRequestStatusChange: () => void;
};

export function AppointmentDetailsModal({
  appointment,
  onClose,
  onRequestStatusChange
}: AppointmentDetailsModalProps) {
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

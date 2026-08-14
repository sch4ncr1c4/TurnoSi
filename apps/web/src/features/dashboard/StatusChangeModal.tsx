import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect } from "react";

import { ModalCloseButton } from "../../components/ui";
import {
  buttonMotionClass,
  getStatusModalDescription,
  statusClassName,
  statusCorrectionOptions,
  statusDotClassName,
  statusModalLabel,
  statusTransitionOptions,
  type AppointmentStatusLabel,
  type StatusChangeDraft
} from "./dashboard.constants";

type StatusChangeModalProps = {
  draft: StatusChangeDraft;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onSelectNextStatus: (status: AppointmentStatusLabel) => void;
};

export function StatusChangeModal({
  draft,
  isConfirming = false,
  onCancel,
  onConfirm,
  onSelectNextStatus
}: StatusChangeModalProps) {
  const options = draft.isCorrection
    ? statusCorrectionOptions[draft.currentStatus]
    : statusTransitionOptions[draft.currentStatus];
  const startsAt = draft.appointment.startsAt
    ? new Date(draft.appointment.startsAt)
    : null;
  const appointmentDate = startsAt
    ? format(startsAt, "dd MMM yyyy", { locale: es })
    : draft.appointment.day ?? "Hoy";

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isConfirming) onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isConfirming, onCancel]);

  return (
    <div
      aria-modal="true"
      className="viewport-overlay modal-overlay-enter z-50 grid place-items-end bg-[rgba(32,24,54,0.58)] p-3 backdrop-blur-sm sm:place-items-center"
      role="dialog"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          if (!isConfirming) onCancel();
        }
      }}
    >
      <div className="modal-panel-enter modal-scroll-panel w-full max-w-2xl rounded-2xl border border-[rgba(32,24,54,0.12)] bg-[#ffffff] p-5 shadow-[0_28px_90px_rgba(32,24,54,0.38)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              {draft.isCorrection ? "Editar estado" : "Cambiar estado"}
            </p>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-[var(--color-ink)] sm:text-3xl">
              Cambiar estado del turno
            </h2>
          </div>
          <ModalCloseButton disabled={isConfirming} onClick={onCancel} />
        </div>

        <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-[#ffffff] p-4">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[rgba(253,134,6,0.12)] text-xl text-[var(--color-ink)]">
              ✂
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-[var(--color-ink)]">
                {draft.appointment.service}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {draft.appointment.client} · {appointmentDate} · {draft.appointment.time}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-[var(--color-border)] pt-4 text-sm">
            <span className="text-[var(--color-muted-strong)]">Estado actual</span>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
                statusClassName[draft.currentStatus]
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              {draft.currentStatus}
            </span>
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-lg font-semibold text-[var(--color-muted-strong)]">
            Seleccioná el nuevo estado
          </h3>
          <div className="mt-4 divide-y divide-[var(--color-border)]">
          {options.map((status) => (
            <button
              key={status}
              type="button"
              disabled={isConfirming}
              onClick={() => onSelectNextStatus(status)}
              className={`group flex w-full items-center gap-4 px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 ${
                draft.nextStatus === status
                  ? "rounded-lg border border-[rgba(253,134,6,0.26)] bg-[rgba(253,134,6,0.045)]"
                  : "border border-transparent hover:bg-[rgba(32,24,54,0.025)]"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${
                  draft.nextStatus === status
                    ? "border-[var(--color-accent)]"
                    : "border-[rgba(32,24,54,0.28)]"
                }`}
              >
                <span
                  className={`h-3 w-3 rounded-full ${
                    draft.nextStatus === status
                      ? "bg-[var(--color-accent)]"
                      : "bg-transparent"
                  }`}
                />
              </span>
              <span className="grid min-w-0 gap-1 sm:grid-cols-[150px_1fr] sm:items-center">
                <span className="text-base font-semibold text-[var(--color-ink)]">
                  {statusModalLabel[status]}
                </span>
                <span className="text-sm text-[var(--color-muted)]">
                  {getStatusModalDescription(status)}
                </span>
              </span>
            </button>
          ))}
          </div>
        </section>

        <p className="mt-5 flex items-start gap-3 border-t border-[var(--color-border)] pt-4 text-sm leading-6 text-[var(--color-muted)]">
          <span
            className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
              draft.nextStatus
                ? statusDotClassName[draft.nextStatus]
                : "bg-[var(--color-muted)]"
            }`}
          />
          Este cambio quedará registrado en auditoría.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isConfirming}
            onClick={onCancel}
            className={`rounded-lg border border-[var(--color-border-strong)] bg-[#ffffff] px-7 py-3 text-sm font-semibold text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60 ${buttonMotionClass}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!draft.nextStatus || isConfirming}
            onClick={onConfirm}
            className={`rounded-lg px-7 py-3 text-sm font-semibold ${buttonMotionClass} ${
              draft.nextStatus
                ? "bg-[var(--color-accent)] text-[var(--color-button-text)] shadow-[0_14px_30px_rgba(253,134,6,0.22)]"
                : "cursor-not-allowed bg-[rgba(32,24,54,0.12)] text-[var(--color-muted)]"
            }`}
          >
            {isConfirming ? "Guardando..." : "Guardar cambio"}
          </button>
        </div>
      </div>
    </div>
  );
}

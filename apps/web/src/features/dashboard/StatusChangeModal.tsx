import {
  buttonMotionClass,
  getStatusModalDescription,
  getStatusModalDotClassName,
  selectedStatusOptionClassName,
  statusClassName,
  statusCorrectionOptions,
  statusDotClassName,
  statusModalLabel,
  statusOptionClassName,
  statusOptionTextClassName,
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

  return (
    <div
      aria-modal="true"
      className="modal-overlay-enter fixed inset-0 z-50 grid place-items-center bg-[rgba(32,24,54,0.68)] px-4 backdrop-blur-sm"
      role="dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          if (!isConfirming) onCancel();
        }
      }}
    >
      <div className="modal-panel-enter modal-scroll-panel w-full max-w-lg rounded-lg border border-[#d8cbbf] bg-[#fffaf4] p-5 shadow-[0_28px_90px_rgba(32,24,54,0.38)] ring-1 ring-[#fffaf4]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
          {draft.isCorrection ? "Editar estado" : "Cambiar estado"}
        </p>
        <h2 className="mt-2 text-xl font-semibold">
          {draft.isCorrection
            ? "Corregí el estado del turno"
            : "Elegí el nuevo estado del turno"}
        </h2>

        <div className="mt-4 rounded-md border border-[#ded0c2] bg-[#f7efe3] p-3 text-sm">
          <p className="font-medium">{draft.appointment.service}</p>
          <p className="mt-1 text-[var(--color-muted-strong)]">
            {draft.appointment.client} · {draft.appointment.day ?? "Hoy"} ·{" "}
            {draft.appointment.time}
          </p>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Estado actual:
            <span
              className={`ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
                statusClassName[draft.currentStatus]
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  draft.currentStatus === "Asistido" ||
                  draft.currentStatus === "Cancelado" ||
                  draft.currentStatus === "En espera" ||
                  draft.currentStatus === "Pagado" ||
                  draft.currentStatus === "No asistió"
                    ? "bg-white"
                    : statusDotClassName[draft.currentStatus]
                }`}
              />
              {draft.currentStatus}
            </span>
          </p>
        </div>

        <div className="mt-4 grid gap-2">
          {options.map((status) => (
            <button
              key={status}
              type="button"
              disabled={isConfirming}
              onClick={() => onSelectNextStatus(status)}
              className={`rounded-md border px-3 py-3 text-left text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                draft.nextStatus === status
                  ? selectedStatusOptionClassName[status]
                  : `${statusOptionClassName[status]} ${statusOptionTextClassName}`
              } border-l-4`}
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <span
                  className={`h-2 w-2 rounded-full ${getStatusModalDotClassName(status)}`}
                />
                {statusModalLabel[status]}
              </span>
              <span
                className={`ml-2 text-xs ${
                  draft.nextStatus === status
                    ? "text-[var(--color-muted-strong)]"
                    : "text-[var(--color-muted)]"
                }`}
              >
                {getStatusModalDescription(status)}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm leading-6 text-[var(--color-muted-strong)]">
          {draft.isCorrection
            ? "Usá esta opción solo si hubo una confusión operativa. La corrección también deberá quedar registrada en auditoría."
            : "El cambio se aplica solo después de confirmar. En backend este tipo de acción deberá registrarse en auditoría con usuario, organización y fecha."}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isConfirming}
            onClick={onCancel}
            className={`rounded-md border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60 ${buttonMotionClass}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!draft.nextStatus || isConfirming}
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium ${buttonMotionClass} ${
              draft.nextStatus
                ? "bg-[var(--color-ink)] text-[var(--color-button-text)]"
                : "cursor-not-allowed bg-[#ddd6ca] text-[var(--color-muted)]"
            }`}
          >
            {isConfirming ? "Confirmando..." : "Confirmar cambio"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";

import { Toast } from "../../components/ui";
import type {
  AvailabilityException,
  AvailabilityPanel,
  AvailabilityResource
} from "./availability.types";
import { buttonMotionClass } from "./dashboard.constants";

type AvailabilityEditPanelProps = {
  exceptions: AvailabilityException[];
  panel: NonNullable<AvailabilityPanel>;
  resources: AvailabilityResource[];
  onClose: () => void;
  onSaveException: (index: number, value: AvailabilityException) => Promise<void>;
  onSaveResource: (index: number, value: AvailabilityResource) => Promise<void>;
};

export function AvailabilityEditPanel({
  exceptions,
  panel,
  resources,
  onClose,
  onSaveException,
  onSaveResource
}: AvailabilityEditPanelProps) {
  const exception = panel.type === "exception" ? exceptions[panel.index] : null;
  const resource = panel.type !== "exception" ? resources[panel.index] : null;
  const [exceptionDraft, setExceptionDraft] = useState<AvailabilityException | null>(() =>
    exception ? { ...exception } : null
  );
  const [resourceDraft, setResourceDraft] = useState<AvailabilityResource | null>(() =>
    resource ? { ...resource } : null
  );
  const [toast, setToast] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const title =
    panel.type === "exception"
      ? "Editar excepción"
      : panel.type === "rules"
        ? "Editar reglas"
        : "Ver recursos";

  async function acceptChanges() {
    if (isSaving) return;
    if (
      (exceptionDraft?.id && JSON.stringify(exceptionDraft) === JSON.stringify(exception)) ||
      (resourceDraft?.id && JSON.stringify(resourceDraft) === JSON.stringify(resource))
    ) {
      setToast("No hay cambios por guardar.");
      return;
    }
    setIsSaving(true);
    try {
      if (exceptionDraft) {
        await onSaveException(panel.index, exceptionDraft);
      }

      if (resourceDraft) {
        await onSaveResource(panel.index, resourceDraft);
      }

      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[rgba(32,24,54,0.58)] px-3 py-3 backdrop-blur-sm sm:place-items-center">
      <div className="w-full max-w-xl rounded-lg border border-[var(--color-border)] bg-[#fffaf4] p-4 shadow-[0_28px_90px_rgba(32,24,54,0.34)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-3">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
              Los cambios se aplican en esta maqueta local.
            </p>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-semibold text-[var(--color-muted-strong)] hover:bg-[rgba(32,24,54,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cerrar
          </button>
        </div>

        {exception && (
          <div className="mt-4 grid gap-3">
            <TextField
              label="Fecha"
              type="date"
              value={exceptionDraft?.date ?? ""}
              onChange={(value) =>
                setExceptionDraft((current) => (current ? { ...current, date: value } : current))
              }
            />
            {exceptionDraft?.status !== "No laborable" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Desde"
                  type="time"
                  value={exceptionDraft?.startTime ?? "09:00"}
                  onChange={(startTime) =>
                    setExceptionDraft((current) => current ? { ...current, startTime } : current)
                  }
                />
                <TextField
                  label="Hasta"
                  type="time"
                  value={exceptionDraft?.endTime ?? "18:00"}
                  onChange={(endTime) =>
                    setExceptionDraft((current) => current ? { ...current, endTime } : current)
                  }
                />
              </div>
            )}
            <TextField
              label="Título"
              value={exceptionDraft?.title ?? ""}
              onChange={(value) =>
                setExceptionDraft((current) => (current ? { ...current, title: value } : current))
              }
            />
            <TextField
              label="Detalle"
              value={exceptionDraft?.detail ?? ""}
              onChange={(value) =>
                setExceptionDraft((current) => (current ? { ...current, detail: value } : current))
              }
            />
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-[var(--color-muted-strong)]">Estado</span>
              <select
                value={exceptionDraft?.status ?? ""}
                onChange={(event) =>
                  setExceptionDraft((current) =>
                    current ? { ...current, status: event.target.value } : current
                  )
                }
                className="h-10 rounded-md border border-[var(--color-border-strong)] bg-white/70 px-3 outline-none"
              >
                <option>No laborable</option>
                <option>Horario especial</option>
                <option>Bloque parcial</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-muted-strong)]">
              <input
                checked={exceptionDraft?.enabled ?? false}
                onChange={(event) =>
                  setExceptionDraft((current) =>
                    current ? { ...current, enabled: event.target.checked } : current
                  )
                }
                type="checkbox"
              />
              Permitir atención en esta fecha
            </label>
          </div>
        )}

        {resource && (
          <div className="mt-4 grid gap-3">
            <TextField
              label="Servicio"
              value={resourceDraft?.name ?? ""}
              onChange={(value) =>
                setResourceDraft((current) => (current ? { ...current, name: value } : current))
              }
            />
            <TextField
              label="Recurso asignado (opcional)"
              placeholder="Ej. Mesa 1, Sillón 2 o Sin asignar"
              value={resourceDraft?.resource ?? ""}
              onChange={(value) =>
                setResourceDraft((current) =>
                  current ? { ...current, resource: value } : current
                )
              }
            />
            <TextField
              label="Precio"
              placeholder="Ej. 20000"
              value={resourceDraft?.price ?? ""}
              onChange={(value) =>
                setResourceDraft((current) =>
                  current ? { ...current, price: value } : current
                )
              }
            />
            {panel.type === "rules" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Duración"
                  value={resourceDraft?.duration ?? ""}
                  onChange={(value) =>
                    setResourceDraft((current) =>
                      current ? { ...current, duration: value } : current
                    )
                  }
                />
                <TextField
                  label="Margen entre turnos"
                  value={resourceDraft?.buffer ?? ""}
                  onChange={(value) =>
                    setResourceDraft((current) =>
                      current ? { ...current, buffer: value } : current
                    )
                  }
                />
                <TextField
                  label="Cupos por horario"
                  type="number"
                  placeholder="Ej. 1"
                  value={resourceDraft?.capacity ?? "1"}
                  onChange={(value) =>
                    setResourceDraft((current) =>
                      current ? { ...current, capacity: value } : current
                    )
                  }
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-muted-strong)]">
              <input
                checked={resourceDraft?.online ?? false}
                onChange={(event) =>
                  setResourceDraft((current) =>
                    current ? { ...current, online: event.target.checked } : current
                  )
                }
                type="checkbox"
              />
              Disponible para reservas online
            </label>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className={`rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-muted-strong)] disabled:cursor-not-allowed disabled:opacity-60 ${buttonMotionClass}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void acceptChanges()}
            className={`rounded-md bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-button-text)] disabled:cursor-not-allowed disabled:opacity-60 ${buttonMotionClass}`}
          >
            {isSaving ? "Guardando..." : "Aceptar cambios"}
          </button>
        </div>
      </div>
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}

function TextField({
  label,
  placeholder,
  type = "text",
  value,
  onChange
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-semibold text-[var(--color-muted-strong)]">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-[var(--color-border-strong)] bg-white/70 px-3 outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(253,134,6,0.2)]"
      />
    </label>
  );
}

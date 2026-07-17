import { useState } from "react";

import { ModalCloseButton, Toast } from "../../components/ui";
import type {
  AvailabilityException,
  AvailabilityPanel,
  AvailabilityResource,
  AvailabilityServiceCategory
} from "./availability.types";
import { buttonMotionClass } from "./dashboard.constants";

type AvailabilityEditPanelProps = {
  exceptions: AvailabilityException[];
  panel: NonNullable<AvailabilityPanel>;
  resources: AvailabilityResource[];
  categories: AvailabilityServiceCategory[];
  onClose: () => void;
  onDeleteException: (index: number) => Promise<void>;
  onSaveException: (index: number, value: AvailabilityException) => Promise<void>;
  onSaveResource: (index: number, value: AvailabilityResource) => Promise<void>;
};

function createEmptyResource(): AvailabilityResource {
  return {
    name: "",
    category: "",
    duration: "30 min",
    capacity: "1",
    price: "",
    resource: "Sin asignar",
    online: true,
    buffer: "5 min"
  };
}

export function AvailabilityEditPanel({
  exceptions,
  panel,
  resources,
  categories,
  onClose,
  onDeleteException,
  onSaveException,
  onSaveResource
}: AvailabilityEditPanelProps) {
  const exception = panel.type === "exception" ? exceptions[panel.index] : null;
  const resource = panel.type !== "exception" && panel.index >= 0 ? resources[panel.index] : null;
  const [exceptionDraft, setExceptionDraft] = useState<AvailabilityException | null>(() =>
    exception ? { ...exception } : null
  );
  const [resourceDraft, setResourceDraft] = useState<AvailabilityResource | null>(() =>
    panel.type !== "exception"
      ? resource
        ? { ...resource }
        : createEmptyResource()
      : null
  );
  const [toast, setToast] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const title =
    panel.type === "exception"
      ? "Editar excepción"
      : panel.index < 0
        ? "Nuevo servicio"
        : "Editar reglas";

  function setExceptionMode(status: AvailabilityException["status"]) {
    setExceptionDraft((current) => {
      if (!current) return current;
      const enabled = status === "Horario especial";
      return {
        ...current,
        status,
        enabled,
        title:
          status === "No laborable"
            ? "Cierre del local"
            : status === "Horario especial"
              ? "Horario especial"
              : "Bloqueo de horario",
        detail:
          status === "No laborable"
            ? "El local no atenderá en esta fecha."
            : status === "Horario especial"
              ? "El local atenderá con un horario distinto al semanal."
              : "Esta franja no estará disponible para reservas.",
        startTime: status === "No laborable" ? undefined : current.startTime ?? "09:00",
        endTime: status === "No laborable" ? undefined : current.endTime ?? "18:00"
      };
    });
  }

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

  async function deleteException() {
    if (isSaving || panel.type !== "exception") return;
    setIsSaving(true);
    try {
      await onDeleteException(panel.index);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-overlay-enter fixed inset-0 z-50 grid place-items-end bg-[rgba(32,24,54,0.58)] px-3 py-3 backdrop-blur-sm sm:place-items-center">
      <div className="modal-panel-enter modal-scroll-panel w-full max-w-xl rounded-lg border border-[var(--color-border)] bg-[#fffaf4] p-4 shadow-[0_28px_90px_rgba(32,24,54,0.34)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-3">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
              Los cambios se aplican en esta maqueta local.
            </p>
          </div>
          <ModalCloseButton disabled={isSaving} onClick={onClose} />
        </div>

        {exception && (
          <div className="mt-4 grid gap-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <ExceptionModeButton
                active={exceptionDraft?.status === "No laborable"}
                description="No se toman reservas."
                label="Cerrar el local"
                onClick={() => setExceptionMode("No laborable")}
              />
              <ExceptionModeButton
                active={exceptionDraft?.status === "Horario especial"}
                description="Abre fuera del semanal."
                label="Abrir especial"
                onClick={() => setExceptionMode("Horario especial")}
              />
              <ExceptionModeButton
                active={exceptionDraft?.status === "Bloque parcial"}
                description="Bloquea una franja."
                label="Bloquear horario"
                onClick={() => setExceptionMode("Bloque parcial")}
              />
            </div>
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
          </div>
        )}

        {resourceDraft && (
          <div className="mt-4 grid gap-3">
            <TextField
              label="Servicio"
              value={resourceDraft?.name ?? ""}
              onChange={(value) =>
                setResourceDraft((current) => (current ? { ...current, name: value } : current))
              }
            />
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-[var(--color-muted-strong)]">
                Categoría
              </span>
              <select
                value={resourceDraft?.category ?? ""}
                onChange={(event) =>
                  setResourceDraft((current) =>
                    current ? { ...current, category: event.target.value } : current
                  )
                }
                className="h-10 rounded-md border border-[var(--color-border-strong)] bg-white/70 px-3 outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(253,134,6,0.2)]"
              >
                <option value="">Sin categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
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
                <MinutesField
                  label="Duración"
                  value={resourceDraft?.duration ?? ""}
                  onChange={(value) =>
                    setResourceDraft((current) =>
                      current ? { ...current, duration: value } : current
                    )
                  }
                />
                <MinutesField
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
          {panel.type === "exception" && exception?.id && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void deleteException()}
              className={`rounded-md border border-[#e7b9b2] px-4 py-2 text-sm font-semibold text-[#9f1f16] hover:bg-[#fde8e5] disabled:cursor-not-allowed disabled:opacity-60 sm:mr-auto ${buttonMotionClass}`}
            >
              Eliminar
            </button>
          )}
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

function ExceptionModeButton({
  active,
  description,
  label,
  onClick
}: {
  active: boolean;
  description: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-3 text-left transition ${
        active
          ? "border-[var(--color-accent)] bg-[rgba(253,134,6,0.1)] text-[var(--color-ink)]"
          : "border-[var(--color-border)] bg-white/62 text-[var(--color-muted-strong)] hover:border-[var(--color-accent)]"
      }`}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span className="mt-1 block text-xs">{description}</span>
    </button>
  );
}

function getMinuteNumber(value: string) {
  return value.replace(/\D/g, "");
}

function MinutesField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-semibold text-[var(--color-muted-strong)]">{label}</span>
      <span className="flex h-10 overflow-hidden rounded-md border border-[var(--color-border-strong)] bg-white/70 focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[rgba(253,134,6,0.2)]">
        <input
          inputMode="numeric"
          min={0}
          type="number"
          placeholder="30"
          value={getMinuteNumber(value)}
          onChange={(event) => {
            const minutes = getMinuteNumber(event.target.value);
            onChange(minutes ? `${minutes} min` : "");
          }}
          className="min-w-0 flex-1 bg-transparent px-3 outline-none"
        />
        <span className="grid w-14 place-items-center border-l border-[var(--color-border)] bg-[rgba(32,24,54,0.04)] text-xs font-semibold text-[var(--color-muted-strong)]">
          min
        </span>
      </span>
    </label>
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

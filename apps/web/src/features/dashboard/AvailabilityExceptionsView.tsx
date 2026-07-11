import { StatusBadge } from "../../components/ui";
import type { AvailabilityException } from "./availability.types";

type AvailabilityExceptionsViewProps = {
  exceptions: AvailabilityException[];
  onEdit: (index: number) => void;
};

export function AvailabilityExceptionsView({
  exceptions,
  onEdit
}: AvailabilityExceptionsViewProps) {
  const nextException = exceptions[0];

  return (
    <div className="divide-y divide-[var(--color-border)]">
      <div className="grid gap-3 px-4 py-4 md:grid-cols-3">
        <div className="rounded-lg border border-[var(--color-border)] bg-white/38 p-4">
          <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">
            Próxima excepción
          </p>
          <p className="mt-2 text-lg font-semibold">
            {nextException?.date ?? "Sin fecha"}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
            {nextException?.title ?? "No hay excepciones cargadas."}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-white/38 p-4">
          <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">
            Feriados cargados
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {exceptions.length}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
            Excepciones configuradas.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-white/38 p-4">
          <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">
            Turnos afectados
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold">0</p>
          <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
            Sin reprogramaciones pendientes.
          </p>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="space-y-3">
          {exceptions.map((exception, index) => (
            <article
              key={exception.id ?? `${exception.date}-${index}`}
              className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.66)] p-4 md:grid-cols-[120px_minmax(0,1fr)_auto]"
            >
              <p className="font-mono text-sm font-semibold text-[var(--color-ink)]">
                {exception.date}
              </p>
              <div className="min-w-0">
                <p className="font-semibold">{exception.title}</p>
                <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                  {exception.detail}
                </p>
              </div>
              <div className="flex items-center gap-3 md:justify-end">
                <StatusBadge enabled={exception.enabled} status={exception.status} />
                <button
                  type="button"
                  onClick={() => onEdit(index)}
                  className="text-sm font-semibold text-[var(--color-accent)]"
                >
                  Editar
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

import { StatusBadge } from "../../components/ui";
import { buttonMotionClass } from "./dashboard.constants";
import type { AvailabilityResource } from "./availability.types";

type AvailabilityResourcesViewProps = {
  onEditResources: (index: number) => void;
  onEditRules: (index: number) => void;
  resources: AvailabilityResource[];
};

export function AvailabilityResourcesView({
  onEditResources,
  onEditRules,
  resources
}: AvailabilityResourcesViewProps) {
  return (
    <div className="px-4 py-4">
      <div className="grid gap-3 md:grid-cols-2">
        {resources.map((service, index) => (
          <article
            key={service.name}
            className="rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.66)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{service.name}</p>
                <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                  {service.resource}
                </p>
              </div>
              <StatusBadge enabled={service.online} status={service.online ? "Online" : "Interno"} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-md border border-[var(--color-border)] bg-white/42 p-3">
                <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">
                  Duración
                </p>
                <p className="mt-1 font-mono font-semibold">{service.duration}</p>
              </div>
              <div className="rounded-md border border-[var(--color-border)] bg-white/42 p-3">
                <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">
                  Margen
                </p>
                <p className="mt-1 font-mono font-semibold">{service.buffer}</p>
              </div>
              <div className="rounded-md border border-[var(--color-border)] bg-white/42 p-3">
                <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">
                  Cupos
                </p>
                <p className="mt-1 font-mono font-semibold">{service.capacity}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onEditRules(index)}
                className={`rounded-md border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] ${buttonMotionClass}`}
              >
                Editar reglas
              </button>
              <button
                type="button"
                onClick={() => onEditResources(index)}
                className={`rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted-strong)] ${buttonMotionClass}`}
              >
                Ver recursos
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

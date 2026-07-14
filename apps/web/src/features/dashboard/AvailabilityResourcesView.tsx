import { StatusBadge } from "../../components/ui";
import { buttonMotionClass } from "./dashboard.constants";
import type {
  AvailabilityResource,
  AvailabilityServiceCategory
} from "./availability.types";

type AvailabilityResourcesViewProps = {
  categories: AvailabilityServiceCategory[];
  onDeleteCategory: (category: AvailabilityServiceCategory) => void;
  onDeleteResource: (index: number) => void;
  onEditRules: (index: number) => void;
  resources: AvailabilityResource[];
};

export function AvailabilityResourcesView({
  categories,
  onDeleteCategory,
  onDeleteResource,
  onEditRules,
  resources
}: AvailabilityResourcesViewProps) {
  const groupedResources = resources.reduce<Record<string, AvailabilityResource[]>>(
    (groups, service) => {
      const category = service.category.trim() || "Sin categoría";
      return { ...groups, [category]: [...(groups[category] ?? []), service] };
    },
    {}
  );
  const categoryNames = [
    ...categories.map((category) => category.name),
    ...resources.map((service) => service.category.trim()).filter(Boolean),
    "Sin categoría"
  ].filter((category, index, all) => all.indexOf(category) === index);
  const totalOnline = resources.filter((service) => service.online).length;

  return (
    <div className="grid gap-4 px-4 py-4">
      <section className="rounded-xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.72)] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
              Catálogo de reservas
            </p>
            <h3 className="mt-1 text-lg font-semibold">Servicios organizados</h3>
            <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
              Creá categorías para ordenar lo que tus clientes van a reservar.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Metric value={categories.length} label="categorías" />
            <Metric value={resources.length} label="servicios" />
            <Metric value={totalOnline} label="online" />
          </div>
        </div>
      </section>

      {categoryNames.map((category) => {
        const services = groupedResources[category] ?? [];
        const savedCategory = categories.find((item) => item.name === category);

        return (
          <section
            key={category}
            className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.8)]"
          >
            <header className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-white/38 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="truncate text-base font-semibold">{category}</h4>
                  <span className="rounded-full bg-[rgba(32,24,54,0.08)] px-2.5 py-1 text-xs font-semibold text-[var(--color-muted-strong)]">
                    {services.length} {services.length === 1 ? "servicio" : "servicios"}
                  </span>
                </div>
                {category === "Sin categoría" && (
                  <p className="mt-1 text-xs text-[var(--color-muted-strong)]">
                    Servicios sin grupo asignado.
                  </p>
                )}
              </div>
              {savedCategory && services.length === 0 && (
                <button
                  type="button"
                  onClick={() => onDeleteCategory(savedCategory)}
                  className={`w-fit rounded-md border border-[#e7b9b2] px-3 py-1.5 text-xs font-semibold text-[#9f1f16] hover:bg-[#fde8e5] ${buttonMotionClass}`}
                >
                  Eliminar categoría
                </button>
              )}
            </header>

            {services.length > 0 ? (
              <div className="divide-y divide-[var(--color-border)]">
                {services.map((service) => {
                  const originalIndex = resources.findIndex((item) =>
                    service.id ? item.id === service.id : item === service
                  );

                  return (
                    <article
                      key={service.id ?? service.name}
                      className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{service.name}</p>
                          <StatusBadge
                            enabled={service.online}
                            status={service.online ? "Online" : "Interno"}
                          />
                        </div>
                        <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                          {service.resource}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <Chip label="Duración" value={service.duration} />
                          <Chip label="Margen" value={service.buffer} />
                          <Chip label="Cupos" value={service.capacity} />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() => onEditRules(originalIndex)}
                          className={`rounded-md border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] ${buttonMotionClass}`}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteResource(originalIndex)}
                          className={`rounded-md border border-[#e7b9b2] px-3 py-1.5 text-xs font-semibold text-[#9f1f16] ${buttonMotionClass}`}
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-5">
                <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-white/40 px-3 py-4 text-sm text-[var(--color-muted-strong)]">
                  No hay servicios en esta categoría. Creá un servicio y asignalo desde el modal.
                </p>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white/50 px-3 py-2">
      <p className="font-mono text-base font-semibold">{value}</p>
      <p className="mt-0.5 text-[var(--color-muted-strong)]">{label}</p>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-[var(--color-border)] bg-white/52 px-2.5 py-1">
      <span className="text-[var(--color-muted)]">{label}: </span>
      <span className="font-mono font-semibold">{value}</span>
    </span>
  );
}

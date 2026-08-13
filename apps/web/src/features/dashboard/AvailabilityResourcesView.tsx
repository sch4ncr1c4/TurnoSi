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
  const hasUncategorizedServices = Boolean(groupedResources["Sin categoría"]?.length);
  const categoryNames = [
    ...categories.map((category) => category.name),
    ...resources.map((service) => service.category.trim()).filter(Boolean),
    ...(hasUncategorizedServices || categories.length === 0 ? ["Sin categoría"] : [])
  ].filter((category, index, all) => all.indexOf(category) === index);
  const totalOnline = resources.filter((service) => service.online).length;
  const totalHidden = resources.length - totalOnline;

  return (
    <div className="grid gap-4 px-4 py-4">
      <section className="rounded-xl border border-[var(--color-border)] bg-[#ffffff] px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
              Catálogo de reservas
            </p>
            <h3 className="mt-1 text-lg font-semibold">Categorías y servicios</h3>
            <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted-strong)]">
              Agrupá tus servicios por categoría. Cada fila muestra lo que verá el cliente y las reglas de disponibilidad.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Metric value={categories.length} label="categorías" />
            <Metric value={resources.length} label="servicios" />
            <Metric value={totalOnline} label="visibles" />
            {totalHidden > 0 && <Metric value={totalHidden} label="internos" />}
          </div>
        </div>
      </section>

      {categoryNames.map((category) => {
        const services = groupedResources[category] ?? [];
        const savedCategory = categories.find((item) => item.name === category);

        return (
          <section
            key={category}
            className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[#ffffff]"
          >
            <header className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-white/42 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="truncate text-base font-semibold">{category}</h4>
                  <span className="rounded-full bg-[rgba(32,24,54,0.08)] px-2.5 py-1 text-xs font-semibold text-[var(--color-muted-strong)]">
                    {services.length} {services.length === 1 ? "servicio" : "servicios"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--color-muted-strong)]">
                  {category === "Sin categoría"
                    ? "Servicios pendientes de asignar a una categoría."
                    : "Grupo visible en la página pública de reservas."}
                </p>
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
              <div>
                <div className="hidden grid-cols-[minmax(180px,1.3fr)_120px_120px_minmax(150px,1fr)_90px_130px] gap-3 border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)] lg:grid">
                  <span>Servicio</span>
                  <span>Duración</span>
                  <span>Cupos</span>
                  <span>Asignación</span>
                  <span>Estado</span>
                  <span className="text-right">Acciones</span>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                {services.map((service) => {
                  const originalIndex = resources.findIndex((item) =>
                    service.id ? item.id === service.id : item === service
                  );
                  const safeIndex = Math.max(0, originalIndex);

                  return (
                    <article
                      key={service.id ?? service.name}
                      className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(180px,1.3fr)_120px_120px_minmax(150px,1fr)_90px_130px] lg:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{service.name}</p>
                        <p className="mt-1 text-xs text-[var(--color-muted-strong)]">
                          {service.price ? `$${service.price}` : "Sin precio cargado"}
                        </p>
                      </div>
                      <Detail label="Duración" value={`${service.duration} min`} helper={`Margen ${service.buffer} min`} />
                      <Detail label="Cupos" value={service.capacity} helper="por horario" />
                      <Detail label="Asignación" value={service.resource || "Sin asignar"} helper="recurso opcional" />
                      <div className="flex lg:block">
                        <StatusBadge
                          enabled={service.online}
                          status={service.online ? "Visible" : "Interno"}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button
                          type="button"
                          onClick={() => onEditRules(safeIndex)}
                          className={`rounded-md border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] ${buttonMotionClass}`}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteResource(safeIndex)}
                          className={`rounded-md border border-[#e7b9b2] px-3 py-1.5 text-xs font-semibold text-[#9f1f16] ${buttonMotionClass}`}
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  );
                })}
                </div>
              </div>
            ) : (
              <div className="px-4 py-5">
                <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-white/40 px-3 py-4 text-sm text-[var(--color-muted-strong)]">
                  Esta categoría todavía no tiene servicios. Tocá “Agregar servicio” y elegí esta categoría.
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
    <div className="rounded-lg border border-[var(--color-border)] bg-white/52 px-3 py-2 text-center">
      <p className="font-mono text-base font-semibold">{value}</p>
      <p className="mt-0.5 text-[var(--color-muted-strong)]">{label}</p>
    </div>
  );
}

function Detail({
  helper,
  label,
  value
}: {
  helper: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--color-border)] bg-white/45 px-3 py-2 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)] lg:hidden">
        {label}
      </p>
      <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{value}</p>
      <p className="mt-0.5 truncate text-xs text-[var(--color-muted-strong)]">{helper}</p>
    </div>
  );
}

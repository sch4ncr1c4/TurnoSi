import {
  activeDayLabel,
  appointmentFilterOptions,
  buttonMotionClass,
  statusDotClassName,
  statusGuide,
  type AppointmentFilter,
  type ScheduleView
} from "./dashboard.constants";

type SummaryFiltersProps = {
  appointmentFilter: AppointmentFilter;
  dateFilterLabel: string;
  dayFilter: string;
  dayOptions: string[];
  filteredCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onSearchTermChange: (value: string) => void;
  onSelectAppointmentFilter: (filter: AppointmentFilter) => void;
  onSelectDayFilter: (day: string) => void;
  searchTerm: string;
  scheduleView: ScheduleView;
};

export function SummaryFilters({
  appointmentFilter,
  dateFilterLabel,
  dayFilter,
  dayOptions,
  filteredCount,
  hasActiveFilters,
  onClearFilters,
  onSearchTermChange,
  onSelectAppointmentFilter,
  onSelectDayFilter,
  searchTerm,
  scheduleView
}: SummaryFiltersProps) {
  return (
    <div className="border-b border-[var(--color-border)] bg-[rgba(240,234,217,0.38)] px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
            Filtros
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
            {filteredCount} turnos encontrados
            {scheduleView !== "day" && (
              <span className="ml-2 inline-flex rounded-sm bg-[rgba(253,134,6,0.16)] px-2 py-0.5 text-xs font-medium text-[var(--color-ink)]">
                Día activo: {activeDayLabel}
              </span>
            )}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-end">
          <label className="grid gap-1.5 text-sm text-[var(--color-muted-strong)] sm:col-span-2 lg:min-w-72">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Buscar
            </span>
            <input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Cliente, servicio, hora o responsable"
              className="h-10 rounded-md border border-[var(--color-border-strong)] bg-[rgba(255,251,244,0.94)] px-3 text-sm font-medium text-[var(--color-ink)] outline-none"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-[var(--color-muted-strong)]">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Estado
            </span>
            <select
              value={appointmentFilter}
              onChange={(event) =>
                onSelectAppointmentFilter(event.target.value as AppointmentFilter)
              }
              className="h-10 min-w-40 rounded-md border border-[var(--color-border-strong)] bg-[rgba(255,251,244,0.94)] px-3 text-sm font-medium text-[var(--color-ink)] outline-none"
            >
              {appointmentFilterOptions.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>

          {scheduleView !== "day" && (
            <label className="grid gap-1.5 text-sm text-[var(--color-muted-strong)]">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
                {dateFilterLabel}
              </span>
              <select
                value={dayFilter}
                onChange={(event) => onSelectDayFilter(event.target.value)}
                className="h-10 min-w-40 rounded-md border border-[var(--color-border-strong)] bg-[rgba(255,251,244,0.94)] px-3 text-sm font-medium text-[var(--color-ink)] outline-none"
              >
                <option value="all">Todos</option>
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className={`h-10 rounded-md border border-[var(--color-border)] px-3 text-sm font-medium text-[var(--color-muted-strong)] ${buttonMotionClass}`}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 border-t border-[var(--color-border)] pt-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
          Estados
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-muted-strong)]">
          {statusGuide.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${statusDotClassName[item.label]}`} />
              <span>
                <strong className="font-medium text-[var(--color-ink)]">
                  {item.label}
                </strong>{" "}
                {item.description}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

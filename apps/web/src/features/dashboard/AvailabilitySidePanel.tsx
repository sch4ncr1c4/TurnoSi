import { insightToneClassName } from "./availability.constants";
import type { AvailabilityTab } from "./availability.types";
import { availabilityInsights, weeklyAvailability } from "./dashboard.data";

export function AvailabilitySidePanel({ activeTab }: { activeTab: AvailabilityTab }) {
  return (
    <aside className="grid min-w-0 gap-3 md:grid-cols-3 min-[1500px]:sticky min-[1500px]:top-4 min-[1500px]:block min-[1500px]:space-y-3 min-[1500px]:self-start">
      <article className="rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.84)] p-4 shadow-[0_16px_44px_rgba(32,24,54,0.05)]">
        <h2 className="text-base font-semibold">Vista rápida</h2>
        <div className="mt-4 grid grid-cols-[42px_minmax(0,1fr)] gap-y-3 text-xs">
          {weeklyAvailability.map((day) => (
            <div key={day.day} className="contents">
              <span className="font-semibold text-[var(--color-muted-strong)]">
                {day.day.slice(0, 3)}
              </span>
              <span className="relative h-3 overflow-hidden rounded-full bg-[rgba(32,24,54,0.08)]">
                {day.enabled && (
                  <>
                    <span className="absolute left-[8%] top-0 h-full w-[30%] rounded-full bg-[#569165]" />
                    <span className="absolute left-[52%] top-0 h-full w-[34%] rounded-full bg-[#569165]" />
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-4 text-xs text-[var(--color-muted-strong)]">
          <Legend color="bg-[#569165]" label="Disponible" />
          <Legend color="bg-[rgba(32,24,54,0.12)]" label="Descanso" />
          <Legend color="bg-[rgba(32,24,54,0.08)]" label="No disponible" />
        </div>
      </article>

      <article className="rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.84)] p-4 shadow-[0_16px_44px_rgba(32,24,54,0.05)]">
        <h2 className="text-base font-semibold">Información del horario</h2>
        <div className="mt-4 space-y-4">
          {availabilityInsights.map((item) => (
            <div key={item.label} className="flex gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${insightToneClassName[item.tone]}`}
              >
                i
              </span>
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-0.5 text-sm text-[var(--color-muted-strong)]">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.84)] p-4 shadow-[0_16px_44px_rgba(32,24,54,0.05)]">
        <h2 className="text-base font-semibold">Consejos</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted-strong)]">
          {activeTab === "weekly"
            ? "Mantené tu horario actualizado para que tus clientes puedan reservar en los mejores momentos."
            : activeTab === "exceptions"
              ? "Usá excepciones para feriados, eventos internos o cierres puntuales sin tocar el horario semanal."
              : "Asigná recursos claros para evitar reservas superpuestas en servicios, profesionales o canchas."}
        </p>
      </article>
    </aside>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

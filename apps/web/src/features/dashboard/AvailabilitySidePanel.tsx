import type { AvailabilityTab, WeeklyAvailabilityDay } from "./availability.types";

export function AvailabilitySidePanel({
  activeTab,
  availability
}: {
  activeTab: AvailabilityTab;
  availability: WeeklyAvailabilityDay[];
}) {
  return (
    <aside className="grid min-w-0 gap-3 md:grid-cols-3 min-[1500px]:sticky min-[1500px]:top-4 min-[1500px]:block min-[1500px]:space-y-3 min-[1500px]:self-start">
      <article className="rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.84)] p-4 shadow-[0_16px_44px_rgba(32,24,54,0.05)]">
        <h2 className="text-base font-semibold">Vista rápida</h2>
        <div className="mt-4 grid grid-cols-[42px_minmax(0,1fr)] gap-y-3 text-xs">
          {availability.map((day) => (
            <div key={day.day} className="contents">
              <span className="font-semibold text-[var(--color-muted-strong)]">
                {day.day.slice(0, 3)}
              </span>
              <span
                className="relative h-3 overflow-hidden rounded-full bg-[rgba(32,24,54,0.08)]"
                title={getDaySummary(day)}
              >
                {day.enabled && (
                  <>
                    {day.slots.map((slot) => (
                      <span
                        key={`${day.day}-${slot.start}-${slot.end}`}
                        className="absolute top-0 h-full rounded-full bg-[#569165]"
                        style={getSegmentStyle(slot.start, slot.end)}
                      />
                    ))}
                    {day.break && (
                      <span
                        className="absolute top-0 h-full rounded-full bg-[rgba(32,24,54,0.16)]"
                        style={getSegmentStyle(day.break.start, day.break.end)}
                      />
                    )}
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

function getSegmentStyle(start: string, end: string) {
  const startPercent = (timeToMinute(start) / 1440) * 100;
  const widthPercent = ((timeToMinute(end) - timeToMinute(start)) / 1440) * 100;
  return {
    left: `${Math.max(0, Math.min(100, startPercent))}%`,
    width: `${Math.max(0, Math.min(100 - startPercent, widthPercent))}%`
  };
}

function timeToMinute(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getDaySummary(day: WeeklyAvailabilityDay) {
  if (!day.enabled || day.slots.length === 0) return `${day.day}: sin horario`;
  const slots = day.slots.map((slot) => `${slot.start}-${slot.end}`).join(", ");
  return `${day.day}: ${slots}`;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

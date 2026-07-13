import { StatusBadge, TimeInput } from "../../components/ui";
import { dayToneClassName } from "./availability.constants";
import type { WeeklyAvailabilityDay } from "./availability.types";

type AvailabilityWeeklyScheduleProps = {
  activeDayMenu: number | null;
  availability: WeeklyAvailabilityDay[];
  onAddSlot: (dayIndex: number) => void;
  onDuplicateAll: (dayIndex: number) => void;
  onRemoveSlot: (dayIndex: number, slotIndex: number) => void;
  onDuplicateDay: (dayIndex: number) => void;
  onToggleBreak: (dayIndex: number) => void;
  onToggleDayMenu: (dayIndex: number) => void;
  onToggleDayStatus: (dayIndex: number) => void;
  onUpdateBreakTime: (dayIndex: number, field: "start" | "end", value: string) => void;
  onUpdateSlotTime: (
    dayIndex: number,
    slotIndex: number,
    field: "start" | "end",
    value: string
  ) => void;
};

export function AvailabilityWeeklySchedule({
  activeDayMenu,
  availability,
  onAddSlot,
  onDuplicateAll,
  onRemoveSlot,
  onDuplicateDay,
  onToggleBreak,
  onToggleDayMenu,
  onToggleDayStatus,
  onUpdateBreakTime,
  onUpdateSlotTime
}: AvailabilityWeeklyScheduleProps) {
  return (
    <>
      <div className="divide-y divide-[var(--color-border)] min-[1900px]:hidden">
        {availability.map((day, dayIndex) => (
          <div key={day.day} className="space-y-3 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold ${dayToneClassName[day.tone]}`}
                >
                  {day.shortDay}
                </span>
                <p className="text-sm font-semibold">{day.day}</p>
              </div>
              <div className="relative flex shrink-0 items-center gap-2">
                <StatusBadge enabled={day.enabled} status={day.status} />
                <button
                  type="button"
                  onClick={() => onToggleDayMenu(dayIndex)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-lg text-[var(--color-muted)] hover:bg-white/60"
                >
                  ⋮
                </button>
                {activeDayMenu === dayIndex && (
                  <DayActionsMenu
                    enabled={day.enabled}
                    hasBreak={Boolean(day.break)}
                    onAddSlot={() => onAddSlot(dayIndex)}
                    onDuplicateAll={() => onDuplicateAll(dayIndex)}
                    onDuplicate={() => onDuplicateDay(dayIndex)}
                    onToggleBreak={() => onToggleBreak(dayIndex)}
                    onToggleStatus={() => onToggleDayStatus(dayIndex)}
                  />
                )}
              </div>
            </div>

            {day.enabled ? (
              <div className="space-y-3">
                {day.slots.map((slot, index) => (
                  <div
                    key={`${day.day}-mobile-slot-${index}`}
                    className="rounded-md border border-[var(--color-border)] bg-white/42 p-3 min-[900px]:max-w-[590px]"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-[var(--color-muted)]">
                        {index === 0 ? "Mañana" : "Tarde"}
                      </p>
                      <button
                        type="button"
                        onClick={() => onRemoveSlot(dayIndex, index)}
                        className="text-xs font-semibold text-[#b42318]"
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2">
                      <TimeInput
                        ariaLabel={`${day.day} inicio del turno ${index + 1}`}
                        className="w-[104px] min-w-[104px]"
                        onChange={(value) => onUpdateSlotTime(dayIndex, index, "start", value)}
                        value={slot.start}
                      />
                      <span className="text-[var(--color-muted)]">-</span>
                      <TimeInput
                        ariaLabel={`${day.day} fin del turno ${index + 1}`}
                        className="w-[104px] min-w-[104px]"
                        onChange={(value) => onUpdateSlotTime(dayIndex, index, "end", value)}
                        value={slot.end}
                      />
                    </div>
                  </div>
                ))}

                {day.break && (
                  <div className="mt-5 rounded-md border border-[var(--color-border)] bg-[rgba(255,251,244,0.42)] p-3 min-[900px]:max-w-[590px]">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-[var(--color-muted)]">Descanso</p>
                      <button
                        type="button"
                        onClick={() => onToggleBreak(dayIndex)}
                        className="text-xs font-semibold text-[#b42318]"
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2">
                      <TimeInput
                        ariaLabel={`${day.day} inicio del descanso`}
                        className="w-[104px] min-w-[104px]"
                        onChange={(value) => onUpdateBreakTime(dayIndex, "start", value)}
                        value={day.break.start}
                      />
                      <span className="text-[var(--color-muted)]">-</span>
                      <TimeInput
                        ariaLabel={`${day.day} fin del descanso`}
                        className="w-[104px] min-w-[104px]"
                        onChange={(value) => onUpdateBreakTime(dayIndex, "end", value)}
                        value={day.break.end}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No disponible</p>
            )}
          </div>
        ))}
      </div>

      <div className="stable-scrollbar hidden overflow-x-auto min-[1900px]:block">
        <div className="min-w-[1160px]">
          <div className="grid grid-cols-[150px_minmax(560px,1fr)_270px_110px_52px] border-b border-[var(--color-border)] px-4 py-3 text-center text-xs font-semibold text-[var(--color-muted-strong)]">
            <span className="text-left">Día</span>
            <span>Horario de atención</span>
            <span>Descanso</span>
            <span>Estado</span>
            <span />
          </div>

          {availability.map((day, dayIndex) => (
            <div
              key={day.day}
              className="grid grid-cols-[150px_minmax(560px,1fr)_270px_110px_52px] items-center border-b border-[var(--color-border)] px-4 py-3 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold ${dayToneClassName[day.tone]}`}
                >
                  {day.shortDay}
                </span>
                <span className="text-sm font-medium">{day.day}</span>
              </div>

              <div className="flex justify-center">
                {day.enabled ? (
                  <div className="grid min-w-[420px] gap-2">
                    {day.slots.map((slot, index) => (
                      <span
                        key={`${day.day}-slot-${index}`}
                        className="grid grid-cols-[56px_104px_12px_104px_72px] items-center gap-x-1 whitespace-nowrap"
                      >
                        <span className="text-right text-xs font-semibold text-[var(--color-muted)]">
                          {index === 0 ? "Mañana" : "Tarde"}
                        </span>
                        <TimeInput
                          ariaLabel={`${day.day} inicio del turno ${index + 1}`}
                          onChange={(value) => onUpdateSlotTime(dayIndex, index, "start", value)}
                          value={slot.start}
                        />
                        <span className="text-center text-[var(--color-muted)]">-</span>
                        <TimeInput
                          ariaLabel={`${day.day} fin del turno ${index + 1}`}
                          onChange={(value) => onUpdateSlotTime(dayIndex, index, "end", value)}
                          value={slot.end}
                        />
                        <button
                          type="button"
                          onClick={() => onRemoveSlot(dayIndex, index)}
                          className="justify-self-start rounded-md px-2 py-1 text-xs font-semibold text-[#b42318] hover:bg-[#fde8e5]"
                        >
                          Quitar
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-[var(--color-muted)]">No disponible</span>
                )}
              </div>

              <div className="flex justify-center">
                {day.break ? (
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <TimeInput
                      ariaLabel={`${day.day} inicio del descanso`}
                      onChange={(value) => onUpdateBreakTime(dayIndex, "start", value)}
                      value={day.break.start}
                    />
                    <span className="text-[var(--color-muted)]">-</span>
                    <TimeInput
                      ariaLabel={`${day.day} fin del descanso`}
                      onChange={(value) => onUpdateBreakTime(dayIndex, "end", value)}
                      value={day.break.end}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-[var(--color-muted)]">-</span>
                )}
              </div>

              <div className="flex justify-center">
                <StatusBadge enabled={day.enabled} status={day.status} />
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => onToggleDayMenu(dayIndex)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-lg text-[var(--color-muted)] hover:bg-white/60"
                >
                  ⋮
                </button>
                {activeDayMenu === dayIndex && (
                  <DayActionsMenu
                    enabled={day.enabled}
                    hasBreak={Boolean(day.break)}
                    onAddSlot={() => onAddSlot(dayIndex)}
                    onDuplicateAll={() => onDuplicateAll(dayIndex)}
                    onDuplicate={() => onDuplicateDay(dayIndex)}
                    onToggleBreak={() => onToggleBreak(dayIndex)}
                    onToggleStatus={() => onToggleDayStatus(dayIndex)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] px-4 py-3">
        <p className="rounded-md border border-[var(--color-border)] bg-white/42 px-3 py-2 text-sm text-[var(--color-muted-strong)]">
          Los horarios se aplican semanalmente. Podés agregar excepciones para días específicos en feriados.
        </p>
      </div>
    </>
  );
}

function DayActionsMenu({
  enabled,
  hasBreak,
  onAddSlot,
  onDuplicateAll,
  onDuplicate,
  onToggleBreak,
  onToggleStatus
}: {
  enabled: boolean;
  hasBreak: boolean;
  onAddSlot: () => void;
  onDuplicateAll: () => void;
  onDuplicate: () => void;
  onToggleBreak: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <div className="absolute right-0 top-9 z-20 w-44 rounded-lg border border-[var(--color-border)] bg-[#fffaf4] p-1.5 text-left shadow-[0_18px_48px_rgba(32,24,54,0.18)]">
      <button
        type="button"
        onClick={onAddSlot}
        className="block w-full rounded-md px-3 py-2 text-left text-xs font-semibold hover:bg-[rgba(253,134,6,0.1)]"
      >
        Agregar horario
      </button>
      <button
        type="button"
        onClick={onDuplicateAll}
        className="block w-full rounded-md px-3 py-2 text-left text-xs font-semibold hover:bg-[rgba(253,134,6,0.1)]"
      >
        Duplicar a todos
      </button>
      <button
        type="button"
        onClick={onDuplicate}
        className="block w-full rounded-md px-3 py-2 text-left text-xs font-semibold hover:bg-[rgba(253,134,6,0.1)]"
      >
        Elegir días
      </button>
      <button
        type="button"
        onClick={onToggleBreak}
        className="block w-full rounded-md px-3 py-2 text-left text-xs font-semibold hover:bg-[rgba(253,134,6,0.1)]"
      >
        {hasBreak ? "Quitar descanso" : "Agregar descanso"}
      </button>
      <button
        type="button"
        onClick={onToggleStatus}
        className="block w-full rounded-md px-3 py-2 text-left text-xs font-semibold hover:bg-[rgba(253,134,6,0.1)]"
      >
        {enabled ? "Desactivar día" : "Activar día"}
      </button>
    </div>
  );
}

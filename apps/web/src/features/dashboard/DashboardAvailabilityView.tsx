import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Toast } from "../../components/ui";
import { queryKeys } from "../../lib/query-keys";
import { AvailabilityEditPanel } from "./AvailabilityEditPanel";
import { AvailabilityExceptionsView } from "./AvailabilityExceptionsView";
import { AvailabilityResourcesView } from "./AvailabilityResourcesView";
import { AvailabilitySidePanel } from "./AvailabilitySidePanel";
import { AvailabilityWeeklySchedule } from "./AvailabilityWeeklySchedule";
import { availabilityTabs } from "./availability.constants";
import type {
  AvailabilityException,
  AvailabilityPanel,
  AvailabilityResource,
  AvailabilityTab,
  WeeklyAvailabilityDay
} from "./availability.types";
import { buttonMotionClass } from "./dashboard.constants";
import { weeklyAvailability } from "./dashboard.data";
import {
  getAvailabilityCatalog,
  getAvailabilityExceptions,
  getWeeklyAvailability,
  saveAvailabilityCatalogItem,
  saveAvailabilityException,
  updateWeeklyAvailability
} from "./availability.api";

function minuteToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function timeToMinute(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

type DuplicateDayDraft = {
  sourceIndex: number;
  targetIndices: number[];
} | null;

function cloneDaySchedule(source: WeeklyAvailabilityDay, target: WeeklyAvailabilityDay) {
  return {
    ...target,
    enabled: source.enabled,
    status: source.status,
    slots: source.slots.map((slot) => ({ ...slot })),
    break: source.break ? { ...source.break } : null
  };
}

export function DashboardAvailabilityView() {
  const [activeTab, setActiveTab] = useState<AvailabilityTab>("weekly");
  const [activeDayMenu, setActiveDayMenu] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<AvailabilityPanel>(null);
  const [duplicateDraft, setDuplicateDraft] = useState<DuplicateDayDraft>(null);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [resources, setResources] = useState<AvailabilityResource[]>([]);
  const [availability, setAvailability] = useState<WeeklyAvailabilityDay[]>(() =>
    weeklyAvailability.map((day) => ({
      ...day,
      break: day.break ? { ...day.break } : null,
      slots: day.slots.map((slot) => ({ ...slot }))
    }))
  );
  const [savedAvailability, setSavedAvailability] = useState<WeeklyAvailabilityDay[]>([]);
  const [toast, setToast] = useState("");
  const [isSavingWeekly, setIsSavingWeekly] = useState(false);
  const queryClient = useQueryClient();
  const weeklyQuery = useQuery({
    queryKey: queryKeys.weeklyAvailability,
    queryFn: getWeeklyAvailability,
    enabled: activeTab === "weekly"
  });
  const exceptionsQuery = useQuery({
    queryKey: queryKeys.availabilityExceptions,
    queryFn: getAvailabilityExceptions,
    enabled: activeTab === "exceptions"
  });
  const catalogQuery = useQuery({
    queryKey: queryKeys.availabilityCatalog,
    queryFn: getAvailabilityCatalog,
    enabled: activeTab === "resources"
  });

  useEffect(() => {
    if (weeklyQuery.data) {
      const { data } = weeklyQuery.data;
      const loaded = weeklyAvailability.map((metadata, weekday) => {
        const slots = (data.days.find((day) => day.weekday === weekday)?.slots ?? [])
          .map((slot) => ({
            start: minuteToTime(slot.startMinute),
            end: minuteToTime(slot.endMinute)
          }));
        return {
          ...metadata,
          enabled: slots.length > 0,
          status: slots.length > 0 ? "Activo" : "Inactivo",
          slots,
          break:
            slots.length >= 2 && slots[0].end !== slots[1].start
              ? { start: slots[0].end, end: slots[1].start }
              : null
        } satisfies WeeklyAvailabilityDay;
      });
      // The editor keeps a local draft until the user saves.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailability(loaded);
      setSavedAvailability(loaded);
    }
  }, [weeklyQuery.data]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (exceptionsQuery.data) setExceptions(exceptionsQuery.data);
  }, [exceptionsQuery.data]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (catalogQuery.data) setResources(catalogQuery.data);
  }, [catalogQuery.data]);

  function updateSlotTime(
    dayIndex: number,
    slotIndex: number,
    field: "start" | "end",
    value: string
  ) {
    setAvailability((current) =>
      current.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? {
              ...day,
              slots: day.slots.map((slot, currentSlotIndex) =>
                currentSlotIndex === slotIndex ? { ...slot, [field]: value } : slot
              )
            }
          : day
      )
    );
  }

  function updateBreakTime(dayIndex: number, field: "start" | "end", value: string) {
    setAvailability((current) =>
      current.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex && day.break
          ? {
              ...day,
              break: { ...day.break, [field]: value },
              slots: day.slots.map((slot, slotIndex) =>
                field === "start" && slotIndex === 0
                  ? { ...slot, end: value }
                  : field === "end" && slotIndex === 1
                    ? { ...slot, start: value }
                    : slot
              )
            }
          : day
      )
    );
  }

  function removeSlot(dayIndex: number, slotIndex: number) {
    setAvailability((current) =>
      current.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? {
              ...day,
              slots: day.slots.filter((_, currentSlotIndex) => currentSlotIndex !== slotIndex)
            }
          : day
      )
    );
  }

  function addSlot(dayIndex: number) {
    setAvailability((current) =>
      current.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? {
              ...day,
              enabled: true,
              status: "Activo",
              slots: [...day.slots, { start: "16:00", end: "17:00" }]
            }
          : day
      )
    );
    setActiveDayMenu(null);
  }

  function openDuplicateDialog(sourceIndex: number) {
    setDuplicateDraft({
      sourceIndex,
      targetIndices: availability
        .map((_, index) => index)
        .filter((index) => index !== sourceIndex)
    });
    setActiveDayMenu(null);
  }

  function duplicateDayToAll(sourceIndex: number) {
    setAvailability((current) =>
      current.map((day, index) =>
        index === sourceIndex ? day : cloneDaySchedule(current[sourceIndex], day)
      )
    );
    setToast("Horarios duplicados en todos los días.");
    setActiveDayMenu(null);
  }

  function toggleDuplicateTarget(index: number) {
    setDuplicateDraft((current) =>
      current
        ? {
            ...current,
            targetIndices: current.targetIndices.includes(index)
              ? current.targetIndices.filter((target) => target !== index)
              : [...current.targetIndices, index].sort((a, b) => a - b)
          }
        : current
    );
  }

  function selectAllDuplicateTargets() {
    setDuplicateDraft((current) =>
      current
        ? {
            ...current,
            targetIndices: availability
              .map((_, index) => index)
              .filter((index) => index !== current.sourceIndex)
          }
        : current
    );
  }

  function clearDuplicateTargets() {
    setDuplicateDraft((current) => (current ? { ...current, targetIndices: [] } : current));
  }

  function applyDuplicateSchedule() {
    if (!duplicateDraft) return;

    const { sourceIndex, targetIndices } = duplicateDraft;
    if (targetIndices.length === 0) {
      setToast("Elegí al menos un día destino.");
      return;
    }

    setAvailability((current) =>
      current.map((day, index) =>
        index === sourceIndex || !targetIndices.includes(index)
          ? day
          : cloneDaySchedule(current[sourceIndex], day)
      )
    );
    setToast("Horarios duplicados.");
    setDuplicateDraft(null);
  }

  function toggleDayStatus(dayIndex: number) {
    setAvailability((current) =>
      current.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? {
              ...day,
              enabled: !day.enabled,
              status: day.enabled ? "Inactivo" : "Activo",
              slots:
                !day.enabled && day.slots.length === 0
                  ? [{ start: "09:00", end: "18:00" }]
                  : day.slots
            }
          : day
      )
    );
    setActiveDayMenu(null);
  }

  function toggleBreak(dayIndex: number) {
    setAvailability((current) =>
      current.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? day.break
            ? {
                ...day,
                break: null,
                slots:
                  day.slots.length >= 2
                    ? [{ start: day.slots[0].start, end: day.slots[day.slots.length - 1].end }]
                    : day.slots
              }
            : {
                ...day,
                break: { start: "13:00", end: "14:00" },
                slots:
                  day.slots.length === 1
                    ? [
                        { start: day.slots[0].start, end: "13:00" },
                        { start: "14:00", end: day.slots[0].end }
                      ]
                    : day.slots
              }
          : day
      )
    );
    setActiveDayMenu(null);
  }

  function addException() {
    const nextIndex = exceptions.length;

    setExceptions((current) => [
      ...current,
      {
        date: new Date().toISOString().slice(0, 10),
        title: "Nueva excepción",
        detail: "Definí si el local abre, cierra o trabaja con horario especial.",
        status: "Horario especial",
        enabled: true,
        startTime: "09:00",
        endTime: "18:00"
      }
    ]);
    setActivePanel({ type: "exception", index: nextIndex });
  }

  function addResource() {
    const nextIndex = resources.length;

    setResources((current) => [
      ...current,
      {
        name: "Nuevo servicio",
        duration: "30 min",
        capacity: "1",
        price: "",
        resource: "Sin asignar",
        online: true,
        buffer: "5 min"
      }
    ]);
    setActivePanel({ type: "rules", index: nextIndex });
  }

  async function saveException(index: number, draft: AvailabilityException) {
    try {
      const result = await saveAvailabilityException(draft);
      const saved = { ...draft, id: draft.id ?? result.data.id };
      setExceptions((current) =>
        current.map((item, currentIndex) =>
          currentIndex === index ? saved : item
        )
      );
      queryClient.setQueryData<AvailabilityException[]>(
        queryKeys.availabilityExceptions,
        (current = []) =>
          draft.id
            ? current.map((item) => (item.id === draft.id ? saved : item))
            : [...current, saved]
      );
      setToast("Excepción guardada.");
    } catch {
      setToast("No pudimos guardar la excepción.");
      throw new Error("Unable to save exception");
    }
  }

  async function saveResource(index: number, draft: AvailabilityResource) {
    try {
      const result = await saveAvailabilityCatalogItem(draft);
      const saved = { ...draft, id: draft.id ?? result.data.id };
      setResources((current) =>
        current.map((item, currentIndex) =>
          currentIndex === index ? saved : item
        )
      );
      queryClient.setQueryData<AvailabilityResource[]>(
        queryKeys.availabilityCatalog,
        (current = []) =>
          draft.id
            ? current.map((item) => (item.id === draft.id ? saved : item))
            : [...current, saved]
      );
      setToast("Servicio guardado.");
    } catch {
      setToast("No pudimos guardar el servicio.");
      throw new Error("Unable to save service");
    }
  }

  async function handlePrimaryAction() {
    if (activeTab === "weekly") {
      if (isSavingWeekly) return;
      if (JSON.stringify(availability) === JSON.stringify(savedAvailability)) {
        setToast("No hay cambios por guardar.");
        return;
      }
      const days = availability.map((day, weekday) => ({
        weekday,
        slots: day.enabled
          ? day.slots.map((slot) => ({
              startMinute: timeToMinute(slot.start),
              endMinute: timeToMinute(slot.end)
            }))
          : []
      }));
      const invalid = days.some((day) =>
        day.slots.some((slot, index) =>
          slot.startMinute >= slot.endMinute ||
          (index > 0 && slot.startMinute < day.slots[index - 1].endMinute)
        )
      );
      if (invalid) {
        setToast("Revisá los horarios: hay rangos inválidos o superpuestos.");
        return;
      }
      setIsSavingWeekly(true);
      try {
        await updateWeeklyAvailability(days);
        queryClient.setQueryData(queryKeys.weeklyAvailability, {
          success: true,
          data: {
            timezone: weeklyQuery.data?.data.timezone ?? "America/Argentina/Buenos_Aires",
            days
          }
        });
        setSavedAvailability(availability);
        setToast("Disponibilidad guardada.");
      } catch {
        setToast("No pudimos guardar la disponibilidad.");
      } finally {
        setIsSavingWeekly(false);
      }
      return;
    }
    if (activeTab === "exceptions") addException();
    if (activeTab === "resources") addResource();
  }

  return (
    <section className="grid min-w-0 gap-5 min-[1500px]:grid-cols-[minmax(0,1fr)_340px]">
      <article className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.84)] shadow-[0_16px_44px_rgba(32,24,54,0.05)]">
        <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-4 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-4 text-sm font-medium text-[var(--color-muted-strong)] sm:gap-6">
              {availabilityTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={`border-b-2 pb-3 ${
                    activeTab === tab.value
                      ? "border-[var(--color-ink)] text-[var(--color-ink)]"
                      : "border-transparent hover:text-[var(--color-ink)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab !== "resources" && (
              <button
                type="button"
                className="mt-4 flex w-44 items-center justify-between rounded-md border border-[var(--color-border-strong)] bg-[rgba(255,251,244,0.72)] px-3 py-2 text-left text-sm"
              >
                <span>
                  <span className="block text-xs text-[var(--color-muted)]">Sucursal</span>
                  <span className="font-semibold">Sede principal</span>
                </span>
                <span>⌄</span>
              </button>
            )}
          </div>
          <button
            type="button"
            disabled={activeTab === "weekly" && isSavingWeekly}
            onClick={() => void handlePrimaryAction()}
            className={`rounded-md border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60 ${buttonMotionClass}`}
          >
            {activeTab === "weekly"
              ? isSavingWeekly
                ? "Guardando..."
                : "Guardar horarios"
              : activeTab === "exceptions"
                ? "+ Agregar excepción"
                : "+ Agregar servicio"}
          </button>
        </div>

        {activeTab === "weekly" && (
          <AvailabilityWeeklySchedule
            activeDayMenu={activeDayMenu}
            availability={availability}
            onAddSlot={addSlot}
            onDuplicateAll={duplicateDayToAll}
            onDuplicateDay={openDuplicateDialog}
            onRemoveSlot={removeSlot}
            onToggleBreak={toggleBreak}
            onToggleDayMenu={(dayIndex) =>
              setActiveDayMenu(activeDayMenu === dayIndex ? null : dayIndex)
            }
            onToggleDayStatus={toggleDayStatus}
            onUpdateBreakTime={updateBreakTime}
            onUpdateSlotTime={updateSlotTime}
          />
        )}

        {activeTab === "exceptions" && (
          <AvailabilityExceptionsView
            exceptions={exceptions}
            onEdit={(index) => setActivePanel({ type: "exception", index })}
          />
        )}

        {activeTab === "resources" && (
          <AvailabilityResourcesView
            onEditResources={(index) => setActivePanel({ type: "resources", index })}
            onEditRules={(index) => setActivePanel({ type: "rules", index })}
            resources={resources}
          />
        )}
      </article>

      <AvailabilitySidePanel activeTab={activeTab} />

      {activePanel && (
        <AvailabilityEditPanel
          exceptions={exceptions}
          panel={activePanel}
          resources={resources}
          onClose={() => setActivePanel(null)}
          onSaveException={saveException}
          onSaveResource={saveResource}
        />
      )}
      {duplicateDraft && (
        <DuplicateDayModal
          availability={availability}
          draft={duplicateDraft}
          onClose={() => setDuplicateDraft(null)}
          onClear={clearDuplicateTargets}
          onSelectAll={selectAllDuplicateTargets}
          onToggleTarget={toggleDuplicateTarget}
          onApply={applyDuplicateSchedule}
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </section>
  );
}

function DuplicateDayModal({
  availability,
  draft,
  onApply,
  onClear,
  onClose,
  onSelectAll,
  onToggleTarget
}: {
  availability: WeeklyAvailabilityDay[];
  draft: NonNullable<DuplicateDayDraft>;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
  onSelectAll: () => void;
  onToggleTarget: (index: number) => void;
}) {
  const source = availability[draft.sourceIndex];

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[rgba(32,24,54,0.58)] px-3 py-3 backdrop-blur-sm sm:place-items-center">
      <div className="w-full max-w-2xl rounded-lg border border-[var(--color-border)] bg-[#fffaf4] p-4 shadow-[0_28px_90px_rgba(32,24,54,0.34)] sm:p-5">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-3">
          <div>
            <h2 className="text-lg font-semibold">Duplicar horarios</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
              Copiá la disponibilidad de {source.day} a uno o varios días.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-semibold text-[var(--color-muted-strong)] hover:bg-[rgba(32,24,54,0.08)]"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-white/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[var(--color-ink)]">
              Origen:
            </span>
            <span className="rounded-full bg-[rgba(32,24,54,0.08)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink)]">
              {source.day}
            </span>
            <span className="text-sm text-[var(--color-muted-strong)]">
              {source.enabled ? `${source.slots.length} bloques` : "Inactivo"}
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--color-muted-strong)]">
            Se copiarán horarios, descanso y estado. Los días destino mantienen su nombre y color.
          </p>
          <button
            type="button"
            onClick={onApply}
            className={`mt-4 w-full rounded-md bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-button-text)] ${buttonMotionClass}`}
          >
            Duplicar a los días seleccionados
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-full border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[rgba(253,134,6,0.08)]"
          >
            Seleccionar todos
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[rgba(253,134,6,0.08)]"
          >
            Limpiar selección
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {availability.map((day, index) => {
            const selected = draft.targetIndices.includes(index);
            const source = index === draft.sourceIndex;

            return (
              <button
                key={day.day}
                type="button"
                disabled={source}
                onClick={() => onToggleTarget(index)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                  source
                    ? "cursor-not-allowed border-[var(--color-border)] bg-[rgba(32,24,54,0.04)] opacity-60"
                    : selected
                      ? "border-[var(--color-ink)] bg-[rgba(32,24,54,0.06)]"
                      : "border-[var(--color-border)] bg-white/70 hover:border-[var(--color-accent)] hover:bg-[rgba(253,134,6,0.08)]"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold text-[var(--color-ink)]">
                    {day.day}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--color-muted-strong)]">
                    {day.enabled ? `${day.slots.length} bloques` : "Inactivo"}
                  </span>
                </span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold ${
                    selected
                      ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                      : "border-[var(--color-border-strong)] text-transparent"
                  }`}
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-muted-strong)] ${buttonMotionClass}`}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

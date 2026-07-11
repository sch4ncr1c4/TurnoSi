import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { PageLayout } from "../../components/layout/PageLayout";
import { ApiError } from "../../lib/api";
import { queryKeys } from "../../lib/query-keys";
import { parseFormData } from "../../utils/validation";
import {
  createPublicAppointment,
  getPublicBooking,
  getPublicLogoUrl,
  getPublicSlots,
  type PublicBookingData
} from "./booking.api";
import { bookingConfirmSchema } from "./booking.schemas";

type PublicBookingPageProps = { brand: ReactNode };
type BookingStep = "service" | "professional" | "schedule" | "details" | "success";
type ConfirmedAppointment = {
  service: string;
  professional: string;
  date: string;
  time: string;
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "UTC"
});

function isResourceOnlyBooking(category: string | null) {
  return category?.toLowerCase().includes("cancha") ?? false;
}

export function PublicBookingPage({ brand }: PublicBookingPageProps) {
  const { organizationSlug = "" } = useParams();
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [step, setStep] = useState<BookingStep>("service");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] =
    useState<ConfirmedAppointment | null>(null);
  const queryClient = useQueryClient();
  const bookingQuery = useQuery({
    queryKey: queryKeys.publicBooking(organizationSlug),
    queryFn: () => getPublicBooking(organizationSlug),
    staleTime: 10 * 60 * 1000
  });
  const slotsQuery = useQuery({
    queryKey: queryKeys.publicSlots(
      organizationSlug,
      selectedServiceId,
      selectedAssigneeId || "auto"
    ),
    queryFn: () =>
      getPublicSlots(
        organizationSlug,
        selectedServiceId,
        selectedAssigneeId || undefined
      ),
    enabled: Boolean(selectedServiceId),
    staleTime: 30 * 1000
  });
  const data: PublicBookingData | undefined = bookingQuery.data;
  const days = slotsQuery.data?.days ?? [];

  if (bookingQuery.isPending) {
    return (
      <PageLayout>
        <header className="border-b border-white/10 bg-[var(--color-ink)] px-5 py-4">
          <div className="mx-auto flex max-w-6xl items-center [&_img]:h-12 sm:[&_img]:h-16">
            {brand}
          </div>
        </header>
        <main className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section className="rounded-xl border border-[var(--color-border)] bg-white/55 p-6">
              <p className="text-sm text-[var(--color-muted-strong)]">
                Cargando negocio...
              </p>
            </section>
          </div>
          <aside className="lg:sticky lg:top-5 lg:self-start">
            <div className="rounded-xl border border-[var(--color-border)] bg-white/55 p-5">
              <p className="text-sm text-[var(--color-muted-strong)]">
                Cargando disponibilidad...
              </p>
            </div>
          </aside>
        </main>
      </PageLayout>
    );
  }
  if (!data) {
    const isNotFound =
      bookingQuery.error instanceof ApiError &&
      bookingQuery.error.status === 404;

    return (
      <PageLayout>
        <div className="grid min-h-screen bg-[var(--color-page)] px-5 py-8">
          <div className="mx-auto flex w-full max-w-3xl flex-col justify-between gap-8">
            <header className="flex items-center rounded-2xl bg-[var(--color-ink)] px-4 py-3 text-white shadow-[0_12px_30px_rgba(32,24,54,0.18)] [&_img]:h-12 sm:[&_img]:h-16">
              {brand}
            </header>

            <main className="flex flex-1 items-center justify-center">
              <section className="w-full rounded-3xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.92)] px-6 py-10 text-center shadow-[0_18px_50px_rgba(32,24,54,0.06)] sm:px-10">
                <p className="font-mono text-6xl font-semibold text-[var(--color-accent)]">
                  {isNotFound ? "404" : "!"}
                </p>
                <h1 className="mt-4 text-3xl font-semibold text-[var(--color-ink)]">
                  {isNotFound
                    ? "No encontramos este negocio"
                    : "No pudimos cargar la reserva"}
                </h1>
                <p className="mt-3 text-sm leading-7 text-[var(--color-muted-strong)]">
                  {isNotFound
                    ? "El enlace no corresponde a un negocio activo o fue escrito con un error."
                    : "Hubo un problema temporal al consultar la disponibilidad. Probá de nuevo en unos segundos."}
                </p>
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    to="/"
                    className="rounded-md bg-[var(--color-ink)] px-5 py-3 text-sm font-medium text-[var(--color-button-text)] hover:bg-[var(--color-accent)]"
                  >
                    Volver al inicio
                  </Link>
                  <Link
                    to="/login"
                    className="rounded-md border border-[var(--color-border-strong)] px-5 py-3 text-sm font-medium text-[var(--color-ink)] hover:bg-white/60"
                  >
                    Ir al acceso
                  </Link>
                </div>
              </section>
            </main>
          </div>
        </div>
      </PageLayout>
    );
  }

  const serviceId = selectedServiceId;
  const resourceOnlyBooking = isResourceOnlyBooking(data.organization.category);
  const suggestedAssigneeId = slotsQuery.data?.suggestedAssigneeId ?? null;
  const selectedAssignee =
    data.team.find((member) => member.id === selectedAssigneeId) ?? null;
  const suggestedAssignee =
    data.team.find((member) => member.id === suggestedAssigneeId) ?? null;
  const date = days.some((day) => day.date === selectedDate) ? selectedDate : "";
  const service = data.services.find((item) => item.id === serviceId);
  const selectedResourceName = service?.resourceName || service?.name || "";
  const selectedDay = days.find((day) => day.date === date);
  const selectedSlot = selectedDay?.slots.find((slot) => slot.startsAt === startsAt);
  const steps = [
    { id: "service" as const, label: resourceOnlyBooking ? "Cancha" : "Servicio" },
    ...(!resourceOnlyBooking && data.team.length > 0
      ? [{ id: "professional" as const, label: "Profesional" }]
      : []),
    { id: "schedule" as const, label: "Fecha y hora" },
    { id: "details" as const, label: "Tus datos" }
  ];
  const currentStepIndex = steps.findIndex((item) => item.id === step);

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const result = parseFormData(
      bookingConfirmSchema,
      Object.fromEntries(new FormData(event.currentTarget).entries())
    );
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    if (!serviceId || !startsAt) {
      setStatus("Elegí un horario para continuar.");
      return;
    }
    setIsSubmitting(true);
    try {
      const confirmation = {
        service: selectedResourceName || "Cancha",
        professional:
          selectedAssignee?.name ??
          suggestedAssignee?.name ??
          (resourceOnlyBooking ? "" : "Profesional según disponibilidad"),
        date,
        time: selectedSlot?.time ?? ""
      };
      await createPublicAppointment(organizationSlug, {
        ...result.parsed,
        serviceId,
        startsAt,
        assigneeId: selectedAssigneeId || undefined
      });
      setErrors({});
      setStatus("Tu turno quedó confirmado.");
      setConfirmedAppointment(confirmation);
      setStep("success");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.publicSlots(
          organizationSlug,
          serviceId,
          selectedAssigneeId || "auto"
        )
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === "SLOT_UNAVAILABLE") {
        setStartsAt("");
        setStep("schedule");
      }
      setStatus(
        error instanceof ApiError && error.code === "SLOT_UNAVAILABLE"
          ? "Ese horario acaba de ocuparse. Elegí otro."
          : "No pudimos confirmar el turno."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageLayout>
      <header className="border-b border-white/10 bg-[var(--color-ink)] px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center [&_img]:h-12 sm:[&_img]:h-16">
          {brand}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-8">
        <section className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white/55 p-3 sm:mb-5 sm:gap-4 sm:p-5">
          {data.organization.hasLogo && (
            <img
              src={getPublicLogoUrl(organizationSlug)}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl object-cover sm:h-14 sm:w-14"
            />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Reserva online
            </p>
            <h1 className="mt-1 truncate text-xl font-semibold sm:text-2xl">{data.organization.name}</h1>
            <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
              {[data.organization.category, data.organization.city]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </section>

        {step !== "success" && (
          <nav className="mb-4 rounded-xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.72)] p-2 sm:mb-5 sm:p-3">
            <ol
              className={`grid ${
                steps.length === 4 ? "grid-cols-4" : "grid-cols-3"
              } sm:flex sm:items-center`}
            >
              {steps.map((item, index) => {
                const active = item.id === step;
                const completed = index < currentStepIndex;
                return (
                  <li key={item.id} className="flex min-w-0 items-center sm:flex-1">
                    <button
                      type="button"
                      disabled={!completed}
                      onClick={() => setStep(item.id)}
                      className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-1 py-1.5 text-center text-[10px] sm:flex-row sm:gap-2 sm:px-2 sm:text-sm ${
                        active
                          ? "font-semibold text-[var(--color-ink)]"
                          : completed
                            ? "text-[var(--color-muted-strong)]"
                            : "text-[var(--color-muted)]"
                      }`}
                    >
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                          active || completed
                            ? "bg-[var(--color-ink)] text-white"
                            : "border border-[var(--color-border-strong)]"
                        }`}
                      >
                        {completed ? "✓" : index + 1}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                    {index < steps.length - 1 && (
                      <span className="hidden h-px flex-1 bg-[var(--color-border-strong)] sm:block" />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {step === "success" ? (
          <section className="mx-auto max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.9)] p-6 text-center shadow-[0_18px_50px_rgba(32,24,54,0.08)] sm:p-10">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[rgba(64,145,91,0.14)] text-2xl text-[#347548]">✓</span>
            <h2 className="mt-5 text-2xl font-semibold">Turno confirmado</h2>
            <p className="mt-2 text-sm text-[var(--color-muted-strong)]">
              Tu reserva en {data.organization.name} quedó registrada.
            </p>
            <div className="mx-auto mt-6 max-w-sm divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-white/55 px-4 text-left text-sm">
              <ConfirmationRow
                label={resourceOnlyBooking ? "Cancha" : "Servicio"}
                value={
                  confirmedAppointment?.service ??
                  (resourceOnlyBooking ? "Cancha" : "Servicio")
                }
              />
              <ConfirmationRow
                label="Fecha y hora"
                value={`${dateFormatter.format(
                  new Date(`${confirmedAppointment?.date ?? date}T00:00:00Z`)
                )} · ${confirmedAppointment?.time ?? ""}`}
              />
              {!resourceOnlyBooking && (
                <ConfirmationRow
                  label="Profesional"
                  value={
                    confirmedAppointment?.professional ??
                    "Profesional según disponibilidad"
                  }
                />
              )}
            </div>
            <p className="mt-5 text-xs text-[var(--color-muted)]">
              Guardá estos datos para recordar tu reserva.
            </p>
          </section>
        ) : (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              {step === "service" && (
                <StepCard
                  eyebrow="Paso 1"
                  title={
                    resourceOnlyBooking
                      ? "¿Qué cancha querés reservar?"
                      : "¿Qué servicio necesitás?"
                  }
                  description={
                    resourceOnlyBooking
                      ? "Elegí la cancha y después seleccioná un horario disponible."
                      : "Elegí una opción para consultar su disponibilidad."
                  }
                >
                  <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                    {data.services.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedServiceId(item.id);
                          setSelectedAssigneeId("");
                          setSelectedDate("");
                          setStartsAt("");
                        }}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          item.id === serviceId
                            ? "border-[var(--color-ink)] bg-[rgba(32,24,54,0.06)] ring-1 ring-[var(--color-ink)]"
                            : "border-[var(--color-border)] bg-white/45 hover:border-[var(--color-border-strong)]"
                        }`}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <strong>
                            {resourceOnlyBooking ? item.resourceName || item.name : item.name}
                          </strong>
                          <span className="shrink-0 text-sm font-semibold">
                            {item.priceCents != null
                              ? `$${(item.priceCents / 100).toLocaleString("es-AR")}`
                              : ""}
                          </span>
                        </span>
                        <span className="mt-2 block text-sm text-[var(--color-muted-strong)]">
                          {resourceOnlyBooking
                            ? item.description || item.name
                            : item.description || `${item.durationMinutes} minutos`}
                        </span>
                        <span className="mt-3 block text-xs font-medium text-[var(--color-muted)]">
                          Duración: {item.durationMinutes} min
                        </span>
                      </button>
                    ))}
                    {data.services.length === 0 && (
                      <p className="text-sm text-[var(--color-muted)]">
                        No hay servicios disponibles.
                      </p>
                    )}
                  </div>
                  <StepActions
                    nextDisabled={!serviceId}
                    onNext={() =>
                      setStep(
                        !resourceOnlyBooking && data.team.length > 0
                          ? "professional"
                          : "schedule"
                      )
                    }
                  />
                </StepCard>
              )}

              {step === "professional" && (
                <StepCard
                  eyebrow="Paso 2"
                  title="¿Con quién querés atenderte?"
                  description="Podés elegir una persona o dejar que asignemos la mejor opción."
                >
                  <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                    <ProfessionalOption
                      selected={selectedAssigneeId === ""}
                      title="Mejor disponibilidad"
                      detail={
                        suggestedAssignee
                          ? `Te recomendamos a ${suggestedAssignee.name}.`
                          : "Asignaremos automáticamente al profesional disponible."
                      }
                      recommended
                      onClick={() => {
                        setSelectedAssigneeId("");
                        setSelectedDate("");
                        setStartsAt("");
                      }}
                    />
                    {data.team.map((member) => (
                      <ProfessionalOption
                        key={member.id}
                        selected={member.id === selectedAssigneeId}
                        title={member.name}
                        detail={`Hasta ${member.hourlyCapacity} turnos por hora`}
                        recommended={member.id === suggestedAssigneeId}
                        onClick={() => {
                          setSelectedAssigneeId(member.id);
                          setSelectedDate("");
                          setStartsAt("");
                        }}
                      />
                    ))}
                  </div>
                  <StepActions
                    onBack={() => setStep("service")}
                    onNext={() => setStep("schedule")}
                  />
                </StepCard>
              )}

              {step === "schedule" && (
                <StepCard
                  eyebrow={`Paso ${data.team.length > 0 ? 3 : 2}`}
                  title="Elegí fecha y horario"
                  description="Sólo mostramos horarios realmente disponibles."
                >
                  <div className="p-4 sm:p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-strong)]">
                      Fecha
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {days.slice(0, 9).map((day) => (
                        <button
                          key={day.date}
                          type="button"
                          onClick={() => {
                            setSelectedDate(day.date);
                            setStartsAt("");
                          }}
                          className={`rounded-lg border p-3 text-left ${
                            day.date === date
                              ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                              : "border-[var(--color-border)] bg-white/45"
                          }`}
                        >
                          <span className="block text-sm font-semibold">
                            {dateFormatter.format(new Date(`${day.date}T00:00:00Z`))}
                          </span>
                          <span className="mt-1 block text-xs opacity-70">
                            {day.slots.length} horarios
                          </span>
                        </button>
                      ))}
                    </div>
                    {slotsQuery.isPending && (
                      <p className="py-5 text-sm text-[var(--color-muted)]">
                        Consultando horarios...
                      </p>
                    )}
                    {!slotsQuery.isPending && days.length === 0 && (
                      <p className="py-5 text-sm text-[var(--color-muted)]">
                        No hay fechas disponibles próximamente.
                      </p>
                    )}
                    {selectedDay && (
                      <>
                        <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-strong)]">
                          Horario
                        </p>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                          {selectedDay.slots.map((slot) => (
                            <button
                              key={slot.startsAt}
                              type="button"
                              onClick={() => setStartsAt(slot.startsAt)}
                              className={`rounded-md border px-3 py-2.5 text-sm font-medium ${
                                slot.startsAt === startsAt
                                  ? "border-[var(--color-accent)] bg-[rgba(253,134,6,0.18)]"
                                  : "border-[var(--color-border)] bg-white/45"
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <StepActions
                    nextDisabled={!startsAt}
                    onBack={() =>
                      setStep(
                        !resourceOnlyBooking && data.team.length > 0
                          ? "professional"
                          : "service"
                      )
                    }
                    onNext={() => setStep("details")}
                  />
                </StepCard>
              )}

              {step === "details" && (
                <StepCard
                  eyebrow={`Paso ${steps.length}`}
                  title="Completá tus datos"
                  description="Los usaremos únicamente para identificar y confirmar tu turno."
                >
                  <BookingConfirmForm
                    errors={errors}
                    isSubmitting={isSubmitting}
                    onSubmit={confirm}
                  />
                  <div className="border-t border-[var(--color-border)] p-4 sm:p-5">
                    <button
                      type="button"
                      onClick={() => setStep("schedule")}
                      className="text-sm font-semibold text-[var(--color-muted-strong)]"
                    >
                      ← Volver a fecha y hora
                    </button>
                  </div>
                </StepCard>
              )}
            </div>

            <aside className="lg:sticky lg:top-5 lg:self-start">
              <div className="rounded-xl bg-[var(--color-ink)] p-5 text-white shadow-[0_18px_44px_rgba(32,24,54,0.18)]">
                <p className="text-xs uppercase tracking-[0.16em] text-white/55">
                  Resumen de tu turno
                </p>
                <SummaryRow
                  label={resourceOnlyBooking ? "Cancha" : "Servicio"}
                  value={selectedResourceName || "Sin elegir"}
                />
                {!resourceOnlyBooking && (
                  <SummaryRow
                    label="Profesional"
                    value={
                      selectedAssignee?.name ??
                      suggestedAssignee?.name ??
                      "Mejor disponibilidad"
                    }
                  />
                )}
                <SummaryRow
                  label="Fecha"
                  value={
                    date
                      ? dateFormatter.format(new Date(`${date}T00:00:00Z`))
                      : "Sin elegir"
                  }
                />
                <SummaryRow label="Horario" value={selectedSlot?.time ?? "Sin elegir"} />
                {status && (
                  <p className="mt-4 rounded-md bg-white/10 p-3 text-sm">{status}</p>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>
      <BookingFooter organization={data.organization} />
    </PageLayout>
  );
}

function BookingFooter({
  organization
}: {
  organization: PublicBookingData["organization"];
}) {
  const location = [organization.address, organization.city, organization.province]
    .filter(Boolean)
    .join(", ");
  const storedWhatsapp = organization.whatsapp?.replace(/\D/g, "") ?? "";
  const whatsappNumber = storedWhatsapp.startsWith("54")
    ? storedWhatsapp
    : storedWhatsapp
      ? `549${storedWhatsapp}`
      : "";
  const instagramUrl = organization.instagram
    ? organization.instagram.startsWith("http")
      ? organization.instagram
      : `https://instagram.com/${organization.instagram.replace(/^@/, "")}`
    : "";

  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[rgba(255,251,244,0.72)] px-4 py-6 sm:px-5">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {organization.name}
          </p>
          {location && (
            <p className="mt-1 text-xs text-[var(--color-muted-strong)]">
              {location}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 text-xs text-[var(--color-muted-strong)] sm:items-end">
          <div className="flex flex-wrap gap-2">
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[var(--color-border-strong)] px-3 py-1.5 font-semibold text-[var(--color-ink)] hover:bg-white/70"
              >
                WhatsApp
              </a>
            )}
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[var(--color-border-strong)] px-3 py-1.5 font-semibold text-[var(--color-ink)] hover:bg-white/70"
              >
                Instagram
              </a>
            )}
          </div>
          {organization.phone && <span>{organization.phone}</span>}
          <span>
            Reservas gestionadas por{" "}
            <strong className="font-semibold text-[var(--color-ink)]">Turnosi</strong>
          </span>
        </div>
      </div>
    </footer>
  );
}

function StepCard({
  children,
  description,
  eyebrow,
  title
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.82)] shadow-[0_16px_44px_rgba(32,24,54,0.05)]">
      <div className="border-b border-[var(--color-border)] p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-strong)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

function StepActions({
  nextDisabled = false,
  onBack,
  onNext
}: {
  nextDisabled?: boolean;
  onBack?: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-border)] p-4 sm:flex-row sm:justify-between sm:p-5">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-md px-4 py-2.5 text-sm font-semibold text-[var(--color-muted-strong)] sm:w-auto"
        >
          ← Atrás
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        disabled={nextDisabled}
        onClick={onNext}
        className="w-full rounded-md bg-[var(--color-ink)] px-5 py-2.5 text-sm font-semibold text-[var(--color-button-text)] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        Continuar
      </button>
    </div>
  );
}

function ProfessionalOption({
  detail,
  onClick,
  recommended = false,
  selected,
  title
}: {
  detail: string;
  onClick: () => void;
  recommended?: boolean;
  selected: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-xl border p-4 text-left transition-colors ${
        selected
          ? "border-[var(--color-ink)] bg-[rgba(32,24,54,0.06)] ring-1 ring-[var(--color-ink)]"
          : "border-[var(--color-border)] bg-white/45 hover:border-[var(--color-border-strong)]"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <strong>{title}</strong>
        <span
          className={`grid h-5 w-5 place-items-center rounded-full border ${
            selected
              ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-xs text-white"
              : "border-[var(--color-border-strong)]"
          }`}
        >
          {selected ? "✓" : ""}
        </span>
      </span>
      <span className="mt-2 block text-sm text-[var(--color-muted-strong)]">
        {detail}
      </span>
      {recommended && (
        <span className="mt-3 inline-block rounded-full bg-[rgba(253,134,6,0.12)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-accent)]">
          Recomendado
        </span>
      )}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <span className="block text-xs text-white/55">{label}</span>
      <strong className="mt-1 block text-sm font-medium">{value}</strong>
    </div>
  );
}

function ConfirmationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="text-[var(--color-muted-strong)]">{label}</span>
      <strong className="text-right font-semibold text-[var(--color-ink)]">
        {value}
      </strong>
    </div>
  );
}

function BookingConfirmForm({
  errors,
  isSubmitting,
  onSubmit
}: {
  errors: Record<string, string>;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
      {[
        ["name", "Nombre", "text"],
        ["phone", "Teléfono", "tel"],
        ["email", "Email", "email"]
      ].map(([name, label, type]) => (
        <label
          key={name}
          className={`block text-xs font-medium text-[var(--color-muted-strong)] ${
            name === "email" ? "sm:col-span-2" : ""
          }`}
        >
          {label}
          <input
            name={name}
            type={type}
            className="mt-1.5 h-11 w-full rounded-md border border-[var(--color-border-strong)] bg-white/70 px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[rgba(32,24,54,0.08)]"
          />
          {errors[name] && (
            <span className="mt-1 block text-[#a33b32]">{errors[name]}</span>
          )}
        </label>
      ))}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 rounded-md bg-[var(--color-accent)] px-4 py-3 font-semibold text-[var(--color-button-text)] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
      >
        {isSubmitting ? "Confirmando..." : "Confirmar turno"}
      </button>
    </form>
  );
}

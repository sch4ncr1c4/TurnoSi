import { buttonMotionClass } from "./dashboard.constants";
import type { DashboardAppointment } from "./dashboard.data";
import type { DashboardView } from "./dashboard.types";

type DashboardHeaderProps = {
  activeView: DashboardView;
  appointments: DashboardAppointment[];
};

export function DashboardHeader({
  activeView,
  appointments
}: DashboardHeaderProps) {
  const today = new Date().toDateString();
  const todayAppointments = appointments.filter(
    (appointment) =>
      appointment.startsAt &&
      new Date(appointment.startsAt).toDateString() === today
  );
  const dashboardStats = [
    { label: "Turnos hoy", value: String(todayAppointments.length), detail: "Total del día" },
    { label: "Confirmados", value: String(todayAppointments.filter((item) => item.status === "Confirmado").length), detail: "Para hoy" },
    { label: "Pendientes", value: String(todayAppointments.filter((item) => item.status === "En espera").length), detail: "Requieren acción" }
  ];
  const pageTitle =
    activeView === "agenda"
      ? "Agenda"
      : activeView === "customers"
        ? "Clientes"
      : activeView === "team"
        ? "Equipo"
      : activeView === "availability"
        ? "Disponibilidad"
        : activeView === "settings"
          ? "Configuración"
        : "Operación de turnos";
  const pageDescription =
    activeView === "agenda"
      ? "Gestioná tus turnos y horarios."
      : activeView === "customers"
        ? "Gestioná clientes, ausencias y bloqueos de reservas."
      : activeView === "team"
        ? "Definí quién atiende, quién aparece online y cuánta carga diaria toma cada persona."
      : activeView === "availability"
        ? "Configurá los horarios de atención, descansos y días no laborables."
        : activeView === "settings"
          ? "Administrá los datos del local, cuenta y presencia pública."
      : "Control diario de agenda, disponibilidad, actividad y cuenta.";

  return (
    <header className="border-b border-[var(--color-border)] bg-[rgba(255,251,244,0.86)] px-5 py-3 sm:px-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{pageTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-strong)]">
            {pageDescription}
          </p>
        </div>

        {activeView === "summary" ? (
          <div className="grid min-w-0 gap-2 sm:grid-cols-3 xl:min-w-[520px]">
            {dashboardStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.72)] px-4 py-3"
              >
                <p className="text-xs font-semibold text-[var(--color-muted)]">
                  {stat.label}
                </p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className="font-mono text-2xl font-semibold text-[var(--color-ink)]">
                    {stat.value}
                  </p>
                  <p className="pb-1 text-xs text-[var(--color-muted-strong)]">
                    {stat.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : activeView === "agenda" || activeView === "customers" || activeView === "team" ? null : (
          <button
            type="button"
            className={`w-fit rounded-md bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-button-text)] ${buttonMotionClass}`}
          >
            + Agregar horario
          </button>
        )}
      </div>
    </header>
  );
}

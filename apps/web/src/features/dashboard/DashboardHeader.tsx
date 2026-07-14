import type { DashboardView } from "./dashboard.types";

type DashboardHeaderProps = {
  activeView: DashboardView;
};

export function DashboardHeader({
  activeView
}: DashboardHeaderProps) {
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
      </div>
    </header>
  );
}

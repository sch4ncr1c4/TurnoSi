import logoUrl from "../assets/logos/logo-turnosi.svg";

type PageLoaderProps = {
  overlay?: boolean;
  title?: string;
  description?: string;
};

export function PageLoader({
  overlay = false,
  title = "Preparando TurnoSi",
  description = "Cargando panel, reservas y datos de tu operación."
}: PageLoaderProps) {
  return (
    <div
      className={`grid place-items-center bg-[var(--color-ink)] px-5 text-[var(--color-button-text)] ${
        overlay
          ? "viewport-overlay z-[9999]"
          : "min-h-screen"
      }`}
    >
      <section className="w-full max-w-[360px] rounded-2xl border border-white/12 bg-white/[0.06] p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur">
        <img
          src={logoUrl}
          alt="TurnoSi"
          className="mx-auto h-12 w-auto"
        />
        <h1 className="mt-5 text-lg font-extrabold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-white/68">
          {description}
        </p>
        <div className="mt-6 overflow-hidden rounded-full bg-white/10 p-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/12">
            <div className="h-full w-1/2 animate-[auth-progress_1.15s_ease-in-out_infinite] rounded-full bg-[var(--color-accent)]" />
          </div>
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
          Un momento
        </p>
      </section>
    </div>
  );
}

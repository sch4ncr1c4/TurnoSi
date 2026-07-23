import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { ApiHealthBadge } from "../../components/system/ApiHealthBadge";
import { billingPlans } from "../billing/billing.plans";
import {
  previewRows,
  sectors
} from "./landing.data";

type LandingPageProps = {
  brand: ReactNode;
};

const navigationLinks = [
  {
    href: "#inicio",
    label: "Inicio"
  },
  {
    href: "#funciones",
    label: "Funciones"
  },
  {
    href: "#pricing",
    label: "Precios"
  },
  {
    href: "#resources",
    label: "Recursos"
  },
  {
    href: "#contact",
    label: "Contacto"
  }
];

export function LandingPage({ brand }: LandingPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 8);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-scroll-reveal]")
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("landing-scroll-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.16 }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <div className="min-h-screen w-full bg-[var(--color-page)]">
      <header
        className={`sticky top-0 z-40 bg-[var(--color-ink)] text-[var(--color-button-text)] backdrop-blur-sm transition-[border-radius] duration-300 ${
          isScrolled ? "rounded-none" : "rounded-t-[28px]"
        }`}
      >
        <div className="px-5 py-3 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 [&_img]:h-14 sm:[&_img]:h-16">{brand}</div>

            <nav className="hidden items-center gap-6 whitespace-nowrap text-sm font-medium text-white/78 min-[949px]:flex">
              {navigationLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="group relative py-2 transition-colors duration-200 hover:text-[var(--color-accent)]"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 rounded-full bg-[var(--color-accent)] transition-transform duration-200 group-hover:scale-x-100" />
                </a>
              ))}
            </nav>

            <div className="hidden items-center justify-end gap-2 min-[949px]:flex">
              <a
                href="/login"
                className="group relative px-2 py-2 text-sm font-semibold text-white/82 transition-colors duration-200 hover:text-[var(--color-accent)]"
              >
                Ingresar
                <span className="absolute bottom-0 left-2 h-0.5 w-[calc(100%-1rem)] origin-left scale-x-0 rounded-full bg-[var(--color-accent)] transition-transform duration-200 group-hover:scale-x-100" />
              </a>
              <a
                href="/register"
                className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-button-text)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
              >
                Crear cuenta
              </a>
            </div>

            <button
              type="button"
              aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((current) => !current)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/18 bg-white/8 min-[949px]:hidden"
            >
              <span className="relative h-4 w-5">
                <span
                  className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-white transition-transform duration-200 ${
                    isMenuOpen ? "translate-y-[7px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-white transition-opacity duration-200 ${
                    isMenuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-white transition-transform duration-200 ${
                    isMenuOpen ? "-translate-y-[7px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-200 min-[949px]:hidden ${
              isMenuOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="mt-3 border-t border-white/10 pt-3">
                <nav className="grid gap-1 text-sm font-medium text-white/78">
                  {navigationLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      className="group relative rounded-md px-3 py-2.5 transition-colors duration-200 hover:bg-white/8 hover:text-[var(--color-accent)]"
                    >
                      <span className="relative inline-block">
                        {link.label}
                        <span className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 rounded-full bg-[var(--color-accent)] transition-transform duration-200 group-hover:scale-x-100" />
                      </span>
                    </a>
                  ))}
                </nav>

                <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
                  <a
                    href="/login"
                    onClick={closeMenu}
                    className="group relative rounded-md border border-white/18 px-3 py-2.5 text-center text-sm font-medium text-white transition-colors duration-200 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    Ingresar
                    <span className="absolute bottom-1.5 left-1/2 h-0.5 w-10 -translate-x-1/2 origin-left scale-x-0 rounded-full bg-[var(--color-accent)] transition-transform duration-200 group-hover:scale-x-100" />
                  </a>
                  <a
                    href="/register"
                    onClick={closeMenu}
                    className="rounded-md bg-[var(--color-accent)] px-3 py-2.5 text-center text-sm font-semibold text-[var(--color-button-text)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                  >
                    Crear cuenta
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="inicio" className="relative scroll-mt-24 overflow-hidden rounded-b-[28px] border-b border-[var(--color-border)] bg-[var(--color-ink)] text-[var(--color-button-text)]">
          <div
            aria-hidden="true"
            className="landing-hero-pattern pointer-events-none absolute bottom-0 left-0 h-64 w-80 opacity-24 sm:h-80 sm:w-[34rem]"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,250,244,0.28) 1px, transparent 1px)",
              backgroundSize: "14px 14px",
              maskImage:
                "linear-gradient(35deg, black 0%, black 34%, rgba(0,0,0,0.55) 48%, transparent 70%)",
              WebkitMaskImage:
                "linear-gradient(35deg, black 0%, black 34%, rgba(0,0,0,0.55) 48%, transparent 70%)"
            }}
          />
          <div className="grid min-h-[unset] w-full min-w-0 gap-6 px-4 py-6 sm:px-7 sm:py-10 lg:min-h-[560px] lg:grid-cols-[minmax(0,0.88fr)_minmax(460px,1.12fr)] lg:items-center lg:gap-8 lg:py-16">
            <div className="landing-rise order-1 min-w-0 max-w-3xl lg:order-none">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {sectors.map((sector) => (
                  <span
                    key={sector}
                    className="rounded-md border border-white/16 px-2 py-0.5 text-[11px] font-medium text-white/72 sm:px-2.5 sm:py-1 sm:text-xs"
                  >
                    {sector}
                  </span>
                ))}
                <ApiHealthBadge />
              </div>

              <p className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase text-white/54 sm:mt-8 sm:text-xs">
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                Reservas online
              </p>
              <h1 className="mt-3 max-w-full text-3xl font-semibold leading-tight [overflow-wrap:anywhere] sm:text-5xl lg:max-w-4xl lg:text-6xl">
                Gestioná tus turnos de forma{" "}
                <span className="text-[var(--color-accent)]">simple</span>.
              </h1>
              <p className="mt-4 max-w-full text-sm leading-7 text-white/70 sm:mt-5 sm:max-w-2xl sm:text-base sm:leading-8">
                Organizá reservas, horarios, equipo y clientes desde un panel
                claro, conectado con tu página pública.
              </p>

              <div className="mt-6 grid gap-3 sm:mt-8 sm:flex sm:flex-row">
                <a
                  href="#funciones"
                  className="landing-cta inline-flex w-full min-w-0 items-center justify-center rounded-md bg-[var(--color-accent)] px-5 py-3 text-center text-sm font-semibold text-[var(--color-button-text)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 sm:w-auto"
                >
                  Ver cómo funciona
                </a>
                <a
                  href="/register"
                  className="landing-link inline-flex w-full min-w-0 items-center justify-center rounded-md border border-white/22 px-5 py-3 text-center text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:shadow-lg active:translate-y-0 sm:w-auto"
                >
                  Crear cuenta
                </a>
              </div>
            </div>

            <div
              id="product"
              className="landing-rise landing-delay-1 order-2 min-w-0 lg:order-none"
            >
              <div className="landing-product-card min-h-[420px] overflow-hidden rounded-2xl border border-white/14 bg-[#fbf4e6] text-[var(--color-ink)] shadow-[0_18px_54px_rgba(0,0,0,0.18)]">
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] bg-[rgba(255,251,244,0.86)] px-4 py-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                        Vista del producto
                      </p>
                      <h2 className="mt-1 text-xl font-semibold">
                        Agenda de hoy
                      </h2>
                      <p className="text-xs text-[var(--color-muted)]">
                        Miércoles 22 · Sede principal · 09:00 a 20:00
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 rounded-full bg-[rgba(253,134,6,0.14)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)]">
                      8 confirmados
                    </span>
                  </div>

                  <div className="grid gap-3 p-4">
                    <div className="min-w-0 space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          ["Turnos", "12"],
                          ["Disponibles", "6"],
                          ["Pendientes", "1"]
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="landing-mockup-row rounded-xl border border-[var(--color-border)] bg-white/70 p-3"
                          >
                            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                              {label}
                            </p>
                            <p className="mt-1 text-xl font-semibold">{value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white/74">
                        <div className="grid grid-cols-[58px_minmax(0,1fr)] border-b border-[var(--color-border)] bg-[rgba(32,24,54,0.035)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)] sm:grid-cols-[70px_minmax(0,1.2fr)_minmax(0,1fr)_86px]">
                          <span>Hora</span>
                          <span>Turno</span>
                          <span className="hidden sm:block">Responsable</span>
                          <span className="hidden sm:block">Estado</span>
                        </div>
                        {previewRows.map((row) => (
                          <div
                            key={row.time + row.service}
                            className="landing-mockup-row grid grid-cols-[58px_minmax(0,1fr)] items-center border-b border-[var(--color-border)] px-3 py-3 text-sm last:border-b-0 sm:grid-cols-[70px_minmax(0,1.2fr)_minmax(0,1fr)_86px]"
                          >
                            <span className="font-mono font-semibold text-[var(--color-accent)]">
                              {row.time}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">
                                {row.service}
                              </span>
                              <span className="block truncate text-xs text-[var(--color-muted)]">
                                {row.customer}
                              </span>
                            </span>
                            <span className="hidden truncate text-xs text-[var(--color-muted-strong)] sm:block">
                              {row.responsible}
                            </span>
                            <span className="hidden sm:block">
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                  row.status === "Pagado"
                                    ? "bg-[rgba(64,145,91,0.12)] text-[#347548]"
                                    : row.status === "En espera"
                                      ? "bg-[rgba(253,134,6,0.14)] text-[var(--color-accent)]"
                                      : "bg-[rgba(32,24,54,0.08)] text-[var(--color-ink)]"
                                }`}
                              >
                                {row.status}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="funciones"
          className="soft-section-divider scroll-mt-24 bg-[rgba(255,251,244,0.72)] px-5 py-12 sm:px-7"
        >
          <div className="mx-auto max-w-7xl">
            <div className="landing-rise mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                Funciones
              </p>
              <h2 className="mt-4 text-3xl font-semibold sm:text-4xl lg:text-5xl">
                La operación diaria, en una sola vista.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--color-muted-strong)]">
                Agenda, reservas, equipo y clientes conectados sin duplicar datos.
              </p>
            </div>

            <div className="mt-10 grid gap-4">
              <article data-scroll-reveal className="landing-scroll-reveal landing-feature-card overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.92)] shadow-[0_10px_28px_rgba(32,24,54,0.03)]">
                <div className="grid gap-0 lg:grid-cols-[0.34fr_0.66fr]">
                  <div className="border-b border-[var(--color-border)] p-5 lg:border-b-0 lg:border-r">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                      Agenda y reservas
                    </span>
                    <h3 className="mt-3 text-2xl font-semibold">
                      Turnos, horarios y responsables en una vista clara.
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-muted-strong)]">
                      La agenda se alimenta de las reservas online y te deja ver rápido qué sigue, quién atiende y qué estado tiene cada turno.
                    </p>
                    <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1">
                      {[
                        ["12", "turnos del día"],
                        ["6", "espacios disponibles"],
                        ["2", "sedes activas"]
                      ].map(([value, label]) => (
                        <div key={label} className="rounded-xl border border-[var(--color-border)] bg-white/60 px-4 py-3">
                          <p className="font-mono text-xl font-semibold">{value}</p>
                          <p className="mt-1 text-xs text-[var(--color-muted-strong)]">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Resumen del día</p>
                        <p className="mt-1 text-xs text-[var(--color-muted-strong)]">
                          Miércoles 22 · Sede principal · 09:00 a 20:00
                        </p>
                      </div>
                      <span className="rounded-full bg-[rgba(253,134,6,0.1)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                        Reservas online
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white/72">
                      <div className="grid grid-cols-[70px_minmax(0,1.2fr)_minmax(0,1fr)_112px] border-b border-[var(--color-border)] bg-[rgba(32,24,54,0.035)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)] sm:grid-cols-[78px_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_112px]">
                        <span>Hora</span>
                        <span>Servicio</span>
                        <span>Cliente</span>
                        <span className="hidden sm:block">Responsable</span>
                        <span>Estado</span>
                      </div>
                      {previewRows.slice(0, 5).map((row) => (
                        <div
                          key={`${row.time}-${row.customer}`}
                          className="landing-mockup-row grid grid-cols-[70px_minmax(0,1.2fr)_minmax(0,1fr)_112px] items-center border-b border-[var(--color-border)] px-3 py-3 text-sm last:border-b-0 sm:grid-cols-[78px_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_112px]"
                        >
                          <span className="font-semibold text-[var(--color-accent)]">{row.time}</span>
                          <span className="min-w-0 truncate font-semibold">{row.service}</span>
                          <span className="min-w-0 truncate text-[var(--color-muted-strong)]">{row.customer}</span>
                          <span className="hidden min-w-0 truncate text-[var(--color-muted-strong)] sm:block">
                            {row.responsible}
                          </span>
                          <span
                            className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              row.status === "Pagado"
                                ? "bg-[rgba(64,145,91,0.12)] text-[#347548]"
                                : row.status === "En espera"
                                  ? "bg-[rgba(253,134,6,0.12)] text-[var(--color-accent)]"
                                  : "bg-[rgba(32,24,54,0.08)] text-[var(--color-ink)]"
                            }`}
                          >
                            {row.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>

              <div className="grid gap-4 lg:grid-cols-2">
                <article data-scroll-reveal className="landing-scroll-reveal landing-feature-card rounded-2xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.9)] p-5 shadow-[0_10px_28px_rgba(32,24,54,0.025)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                        Equipo y permisos
                      </p>
                      <h3 className="mt-2 text-xl font-semibold">Quién atiende y qué puede gestionar.</h3>
                    </div>
                    <span className="rounded-full bg-[rgba(32,24,54,0.06)] px-3 py-1 text-xs font-semibold text-[var(--color-muted-strong)]">
                      3 roles
                    </span>
                  </div>
                  <div className="mt-5 divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-white/64">
                    {[
                      ["Cristian Schinocca", "Propietario", "Sede principal", "4 turnos hoy"],
                      ["Laura Ruiz", "Administradora", "Barber Shop Ramos", "3 turnos hoy"],
                      ["Marcos Vega", "Miembro", "Sede principal", "2 turnos hoy"]
                    ].map(([name, role, branch, load]) => (
                      <div key={name} className="landing-mockup-row grid gap-2 px-3 py-3 text-sm sm:grid-cols-[1fr_0.8fr_0.7fr] sm:items-center">
                        <div>
                          <p className="font-semibold">{name}</p>
                          <p className="mt-0.5 text-xs text-[var(--color-muted)]">{branch}</p>
                        </div>
                        <span className="text-xs font-semibold text-[var(--color-muted-strong)]">{role}</span>
                        <span className="text-xs text-[var(--color-muted-strong)]">{load}</span>
                      </div>
                    ))}
                  </div>
                </article>

                <article data-scroll-reveal className="landing-scroll-reveal landing-feature-card rounded-2xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.9)] p-5 shadow-[0_10px_28px_rgba(32,24,54,0.025)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                        Clientes y seguimiento
                      </p>
                      <h3 className="mt-2 text-xl font-semibold">Historial útil para atender mejor.</h3>
                    </div>
                    <span className="rounded-full bg-[rgba(32,24,54,0.06)] px-3 py-1 text-xs font-semibold text-[var(--color-muted-strong)]">
                      Fichas
                    </span>
                  </div>
                  <div className="mt-5 divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-white/64">
                    {[
                      ["Julieta Fernández", "Próximo turno 10:00", "Corte de pelo", "Confirmado"],
                      ["Martín Ramos", "Próximo turno 10:30", "Barba completa", "Pagado"],
                      ["Diego Torres", "Próximo turno 12:00", "Corte + barba", "En espera"]
                    ].map(([name, next, lastService, status]) => (
                      <div key={name} className="landing-mockup-row grid gap-3 px-3 py-3 text-sm sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                        <div>
                          <p className="font-semibold">{name}</p>
                          <p className="mt-0.5 text-xs text-[var(--color-muted)]">{next}</p>
                        </div>
                        <p className="text-xs text-[var(--color-muted-strong)]">
                          Último servicio: <span className="font-semibold text-[var(--color-ink)]">{lastService}</span>
                        </p>
                        <span
                          className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            status === "Pagado"
                              ? "bg-[rgba(64,145,91,0.12)] text-[#347548]"
                              : status === "En espera"
                                ? "bg-[rgba(253,134,6,0.12)] text-[var(--color-accent)]"
                                : "bg-[rgba(32,24,54,0.08)] text-[var(--color-ink)]"
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section
          id="resources"
          className="soft-section-divider scroll-mt-24 bg-[rgba(255,251,244,0.76)] px-5 py-10 sm:px-7"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-center">
              <div data-scroll-reveal className="landing-scroll-reveal landing-rise">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                  Operación real
                </p>
                <h2 className="mt-4 text-3xl font-semibold sm:text-4xl lg:text-5xl">
                  Configurás una vez. Después, solo gestionás.
                </h2>
                <p className="mt-4 text-sm leading-7 text-[var(--color-muted-strong)]">
                  TurnoSi separa configuración y operación para que el equipo no
                  tenga que tocar datos sensibles mientras atiende.
                </p>
                <div className="mt-7 grid gap-3">
                  {[
                    "Sedes, servicios y horarios quedan definidos desde configuración.",
                    "El cliente reserva desde una página pública conectada a esa agenda.",
                    "El equipo gestiona turnos, estados y clientes desde el dashboard."
                  ].map((item) => (
                    <p key={item} className="flex gap-3 text-sm leading-6 text-[var(--color-ink)]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              <div data-scroll-reveal className="landing-scroll-reveal landing-rise landing-delay-1 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.94)] shadow-[0_10px_28px_rgba(32,24,54,0.035)]">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-white/54 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">Configuración inicial</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        La cuenta queda lista para recibir turnos.
                      </p>
                    </div>
                    <span className="rounded-md bg-[rgba(64,145,91,0.12)] px-2 py-1 text-xs font-semibold text-[#347548]">
                      3/3 listo
                    </span>
                </div>
                <div className="relative grid gap-0 md:grid-cols-3">
                    <span className="pointer-events-none absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-transparent via-[rgba(253,134,6,0.32)] to-transparent md:block" />
                    {[
                      ["Local", "Nombre, rubro, logo y fotos"],
                      ["Página", "WhatsApp, dirección y URL pública"],
                      ["Agenda", "Horarios, sedes, equipo y servicios"]
                    ].map(([title, copy], index) => (
                      <div
                        key={title}
                        className="relative border-b border-[var(--color-border)] p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                      >
                        <span className="relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(253,134,6,0.24)] bg-[rgba(253,134,6,0.1)] font-mono text-xs font-semibold text-[var(--color-accent)]">
                          {index + 1}
                        </span>
                        <p className="mt-4 text-base font-semibold">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--color-muted-strong)]">
                          {copy}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 px-5 py-12 sm:px-7">
          <div className="mx-auto max-w-7xl">
            <div data-scroll-reveal className="landing-scroll-reveal landing-rise mx-auto max-w-3xl text-center">
                <p className="inline-flex items-center gap-2 rounded-full border border-[rgba(253,134,6,0.28)] bg-[rgba(253,134,6,0.12)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                  Precios
                </p>
                <h2 className="mt-5 text-3xl font-semibold sm:text-4xl lg:text-5xl">
                  Pagás por el tamaño real de tu operación.
                </h2>
                <p className="mt-4 text-sm leading-7 text-[var(--color-muted-strong)]">
                  Cada plan tiene límites concretos para evitar abusos y que el
                  sistema siga siendo estable. La prueba gratis usa el plan Inicial
                  durante 7 días.
                </p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
                {billingPlans.map((plan) => (
                  <article
                    key={plan.name}
                    data-scroll-reveal
                    className={`landing-scroll-reveal landing-feature-card relative flex min-h-[430px] flex-col overflow-hidden rounded-2xl border p-5 ${
                      plan.recommended
                        ? "border-[var(--color-ink)] bg-[linear-gradient(180deg,rgba(32,24,54,0.96),rgba(32,24,54,0.91))] text-white shadow-[0_16px_42px_rgba(32,24,54,0.16)]"
                        : "border-[var(--color-border)] bg-[rgba(255,251,244,0.86)] shadow-[0_10px_28px_rgba(32,24,54,0.035)]"
                    }`}
                  >
                    {plan.recommended && (
                      <span className="absolute right-4 top-4 rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-bold text-white">
                        Más elegido
                      </span>
                    )}
                    <h3 className="text-2xl font-semibold">{plan.name}</h3>
                    <p
                      className={`mt-3 min-h-14 text-sm leading-7 ${
                        plan.recommended ? "text-white/68" : "text-[var(--color-muted-strong)]"
                      }`}
                    >
                      {plan.description}
                    </p>

                    <div className="mt-5 flex items-end gap-1">
                      <p className="text-4xl font-semibold">
                        {plan.id === "initial" ? "$15.000" : plan.price}
                      </p>
                      <p
                        className={`pb-1 text-sm ${
                          plan.recommended ? "text-white/58" : "text-[var(--color-muted)]"
                        }`}
                      >
                        {plan.period}
                      </p>
                    </div>

                    <div
                      className={`mt-5 space-y-2 border-t pt-5 ${
                        plan.recommended ? "border-white/12" : "border-[var(--color-border)]"
                      }`}
                    >
                      {plan.features.map((feature) => (
                        <p
                          key={feature}
                          className={`flex gap-2 text-sm leading-6 ${
                            plan.recommended ? "text-white/76" : "text-[var(--color-muted-strong)]"
                          }`}
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                          {feature}
                        </p>
                      ))}
                    </div>

                    <Link
                      to={`/register?plan=${plan.id}`}
                      className={`landing-cta mt-auto inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                        plan.recommended
                          ? "bg-[var(--color-accent)] text-white shadow-[0_16px_36px_rgba(253,134,6,0.22)]"
                          : "border border-[var(--color-border-strong)] bg-white/60 text-[var(--color-ink)] hover:bg-white"
                      }`}
                    >
                      {plan.recommended ? "Empezar con Profesional" : `Elegir ${plan.name}`}
                    </Link>
                  </article>
                ))}
            </div>

            <div data-scroll-reveal className="landing-scroll-reveal landing-rise landing-delay-3 mt-8 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.86)]">
              <div className="grid gap-0 text-sm md:grid-cols-4">
                {[
                  ["Prueba gratis", "7 días del plan Inicial"],
                  ["Pagos", "Suscripción mensual con Mercado Pago"],
                  ["Cambio de plan", "Podés mejorar cuando el negocio crece"],
                  ["Cancelación", "Sin permanencia mínima"]
                ].map(([title, copy]) => (
                  <div
                    key={title}
                    className="border-b border-[var(--color-border)] p-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                  >
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-[var(--color-muted-strong)]">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="bg-[var(--color-page)]">
          <div className="mx-auto max-w-7xl">
            <section data-scroll-reveal id="contact" className="landing-scroll-reveal scroll-mt-24 w-full rounded-2xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.9)] px-6 py-8 shadow-[0_12px_34px_rgba(32,24,54,0.045)] sm:px-8 lg:px-10">
              <div className="grid gap-8 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.4fr)] lg:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                    Contacto
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
                    ¿Necesitás ayuda?
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-7 text-[var(--color-muted-strong)]">
                    Si necesitás ayuda para configurar TurnoSi o elegir un plan,
                    escribinos.
                  </p>
                </div>

                <div className="grid gap-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white/58 md:grid-cols-3">
                  {[
                    ["Email", "hola@turnosi.com", "mailto:hola@turnosi.com", "Escribir"],
                    ["Soporte", "Preguntas frecuentes", "#resources", "Ver ayuda"],
                    ["Comercial", "Planes y multi-sede", "/register", "Hablar con ventas"]
                  ].map(([title, label, href, action]) => (
                    <a
                      key={title}
                      href={href}
                      className="landing-mockup-row border-b border-[var(--color-border)] p-5 transition-colors hover:bg-white/72 md:border-b-0 md:border-r md:last:border-r-0"
                    >
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="mt-2 text-sm text-[var(--color-muted-strong)]">
                        {label}
                      </p>
                      <span className="mt-5 inline-flex text-sm font-semibold text-[var(--color-accent)]">
                        {action} <span className="ml-1" aria-hidden="true">→</span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="mx-auto max-w-7xl">
            <section data-scroll-reveal className="landing-scroll-reveal mt-8 w-full rounded-t-2xl border border-white/12 bg-[var(--color-ink)] px-6 py-6 text-[var(--color-button-text)] shadow-[0_16px_42px_rgba(32,24,54,0.2)] sm:px-8">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <h3 className="text-2xl font-semibold sm:text-3xl">
                    Empezá a organizar tus turnos hoy.
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
                    <span>7 días gratis</span>
                    <span>Sin tarjeta</span>
                    <span>Cancelá cuando quieras</span>
                  </div>
                </div>

                <div className="lg:text-right">
                  <a
                    href="/register"
                    className="landing-cta inline-flex items-center justify-center rounded-md bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-button-text)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    Comenzar gratis <span className="ml-2" aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </section>
          </div>

          <section data-scroll-reveal className="landing-scroll-reveal soft-section-divider soft-section-divider-dark relative w-full overflow-hidden rounded-b-[28px] bg-[var(--color-ink)] px-6 pb-6 pt-8 text-[var(--color-button-text)] sm:px-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 right-0 h-56 w-72 opacity-14 sm:h-72 sm:w-[30rem]"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,250,244,0.22) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
                maskImage:
                  "linear-gradient(215deg, black 0%, black 34%, rgba(0,0,0,0.52) 48%, transparent 70%)",
                WebkitMaskImage:
                  "linear-gradient(215deg, black 0%, black 34%, rgba(0,0,0,0.52) 48%, transparent 70%)"
              }}
            />
              <div className="grid gap-10 lg:grid-cols-[minmax(260px,1.35fr)_repeat(3,minmax(0,1fr))] lg:gap-14">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2">
                    {brand}
                  </div>
                  <p className="max-w-xs text-sm leading-7 text-white/70">
                    La plataforma más simple para gestionar turnos, horarios y clientes en tu negocio.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">Producto</p>
                  <ul className="mt-5 space-y-3 text-sm text-white/70">
                    <li><a href="#funciones">Funciones</a></li>
                    <li><a href="#pricing">Precios</a></li>
                    <li><a href="/login">Ingresar</a></li>
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">Soporte</p>
                  <ul className="mt-5 space-y-3 text-sm text-white/70">
                    <li><a href="#contact">Contacto</a></li>
                    <li><a href="#faq">Preguntas frecuentes</a></li>
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">Legal</p>
                  <ul className="mt-5 space-y-3 text-sm text-white/70">
                    <li>Términos y condiciones</li>
                    <li>Política de privacidad</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-4 text-sm text-white/60">
                <p>© 2026 TurnoSi</p>
              </div>
          </section>
        </footer>
      </main>
    </div>
  );
}

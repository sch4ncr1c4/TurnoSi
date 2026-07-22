import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { ApiHealthBadge } from "../../components/system/ApiHealthBadge";
import { billingPlans } from "../billing/billing.plans";
import {
  featureCards,
  landingMetrics,
  previewRows,
  resourceCards,
  sectors,
  trustLogos
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

const marqueeLanes = [0, 1, 2, 3] as const;

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
            <div className="min-w-0">{brand}</div>

            <nav className="hidden items-center gap-6 whitespace-nowrap text-sm text-white/66 min-[949px]:flex">
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
                className="group relative px-2 py-2 text-sm font-medium text-white/72 transition-colors duration-200 hover:text-[var(--color-accent)]"
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
            className="pointer-events-none absolute bottom-0 left-0 h-64 w-80 opacity-45 sm:h-80 sm:w-[34rem]"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,250,244,0.42) 1.35px, transparent 1.35px)",
              backgroundSize: "12px 12px",
              maskImage:
                "linear-gradient(35deg, black 0%, black 34%, rgba(0,0,0,0.55) 48%, transparent 70%)",
              WebkitMaskImage:
                "linear-gradient(35deg, black 0%, black 34%, rgba(0,0,0,0.55) 48%, transparent 70%)"
            }}
          />
          <div className="grid min-h-[unset] w-full min-w-0 gap-6 px-4 py-6 sm:px-7 sm:py-10 lg:min-h-[560px] lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:items-center lg:gap-8 lg:py-16">
            <div className="order-1 min-w-0 max-w-3xl lg:order-none">
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
                La forma más fácil de gestionar turnos
              </p>
              <h1 className="mt-3 max-w-full text-3xl font-semibold leading-tight [overflow-wrap:anywhere] sm:text-5xl lg:max-w-4xl lg:text-6xl">
                Gestioná tus turnos de forma{" "}
                <span className="text-[var(--color-accent)]">simple</span>.
              </h1>
              <p className="mt-4 max-w-full text-sm leading-7 text-white/70 sm:mt-5 sm:max-w-2xl sm:text-base sm:leading-8">
                Una plataforma para negocios que trabajan por horario y necesitan
                controlar turnos, disponibilidad, equipo y cuenta sin depender de
                planillas ni conversaciones dispersas.
              </p>

              <div className="mt-6 grid gap-3 sm:mt-8 sm:flex sm:flex-row">
                <a
                  href="/dashboard"
                  className="inline-flex w-full min-w-0 items-center justify-center rounded-md bg-[var(--color-accent)] px-5 py-3 text-center text-sm font-semibold text-[var(--color-button-text)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 sm:w-auto"
                >
                  Explorar dashboard
                </a>
                <a
                  href="/register"
                  className="inline-flex w-full min-w-0 items-center justify-center rounded-md border border-white/22 px-5 py-3 text-center text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:shadow-lg active:translate-y-0 sm:w-auto"
                >
                  Crear cuenta
                </a>
              </div>
            </div>

            <div
              id="product"
              className="order-2 min-w-0 overflow-hidden rounded-lg border border-white/14 bg-[rgba(255,251,244,0.96)] text-[var(--color-ink)] lg:order-none"
            >
              <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-3 py-3 sm:px-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Agenda operativa</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    Miércoles 05 · Sede principal
                  </p>
                </div>
                <span className="inline-flex shrink-0 rounded-md bg-[var(--color-status-soft)] px-2 py-1 text-[10px] font-medium text-[var(--color-status)] sm:text-xs">
                  12 confirmados
                </span>
              </div>

              <div className="md:hidden">
                <div className="divide-y divide-[var(--color-border)]">
                  {previewRows.map((row) => (
                    <div key={`mobile-${row.time + row.title}`} className="px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{row.title}</p>
                          <p className="mt-1 text-xs text-[var(--color-muted-strong)]">
                            {row.meta}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md bg-[rgba(253,134,6,0.14)] px-2 py-1 text-[10px] font-medium">
                          {row.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hidden md:block">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead className="bg-[rgba(32,24,54,0.04)] text-xs uppercase text-[var(--color-muted)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Hora</th>
                      <th className="px-4 py-3 font-medium">Reserva</th>
                      <th className="px-4 py-3 font-medium">Responsable</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr
                        key={row.time + row.title}
                        className="border-t border-[var(--color-border)]"
                      >
                        <td className="px-4 py-4 font-medium">{row.time}</td>
                        <td className="px-4 py-4">{row.title}</td>
                        <td className="px-4 py-4 text-[var(--color-muted-strong)]">
                          {row.meta}
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-md bg-[rgba(253,134,6,0.14)] px-2.5 py-1 text-xs font-medium">
                            Activo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-3 border-t border-[var(--color-border)]">
                {landingMetrics.map((metric) => (
                  <div
                    key={metric.value}
                    className="min-w-0 border-b border-[var(--color-border)] px-1 py-2 text-center last:border-b-0 sm:border-r sm:px-4 sm:py-4 sm:last:border-r-0"
                  >
                    <p className="text-base font-semibold sm:text-lg">{metric.value}</p>
                    <p className="mt-1 text-[9px] leading-3 text-[var(--color-muted)] [overflow-wrap:anywhere] sm:text-sm sm:leading-6">
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-trust-band order-3 min-w-0 space-y-4 lg:order-none lg:col-span-2 lg:space-y-6">
              <div className="hero-trust-divider" />
              <p className="text-center text-xs font-medium text-white/72 sm:text-sm">
                Más de 500 negocios ya gestionan sus turnos con{" "}
                <span className="text-[var(--color-accent)]">TurnoSi</span>
              </p>
              <div className="hero-logo-marquee mx-auto max-w-4xl pt-2">
                <div className="hero-logo-track">
                  {marqueeLanes.map((lane) => (
                    <div key={lane} className="hero-logo-lane" aria-hidden={lane > 0}>
                      {trustLogos.map((logo) => (
                        <div key={`${lane}-${logo}`} className="hero-logo-item">
                          <span className="hero-logo-pill">{logo}</span>
                        </div>
                      ))}
                    </div>
                  ))}
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
            <div className="mx-auto max-w-3xl text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-[rgba(253,134,6,0.3)] bg-[rgba(253,134,6,0.12)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                Funciones
              </p>
              <h2 className="mt-5 text-3xl font-semibold sm:text-4xl lg:text-5xl">
                Todo lo que necesitás para gestionar{" "}
                <span className="text-[var(--color-accent)]">tu negocio</span>
              </h2>
              <p className="mt-4 text-base leading-8 text-[var(--color-muted-strong)]">
                TurnoSi centraliza agenda, reservas, equipo y seguimiento en una
                experiencia clara, profesional y fácil de usar.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((card) => (
                <article
                  key={card.title}
                  className="group rounded-2xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.92)] p-5 shadow-[0_18px_50px_rgba(32,24,54,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(32,24,54,0.09)]"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
                        card.tone === "accent"
                          ? "bg-[rgba(253,134,6,0.16)] text-[var(--color-ink)]"
                          : card.tone === "ink"
                            ? "bg-[rgba(32,24,54,0.12)] text-[var(--color-ink)]"
                            : card.tone === "status"
                              ? "bg-[rgba(86,145,101,0.14)] text-[#3f7a49]"
                              : card.tone === "soft"
                                ? "bg-[rgba(67,131,151,0.12)] text-[#2f6678]"
                                : card.tone === "warm"
                                  ? "bg-[rgba(253,134,6,0.12)] text-[var(--color-ink)]"
                                  : "bg-[rgba(100,98,90,0.08)] text-[var(--color-muted-strong)]"
                      }`}
                    >
                      {card.title.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-semibold">{card.title}</p>
                      <p className="mt-1 text-sm leading-7 text-[var(--color-muted-strong)]">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-[var(--color-border)] pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      {card.meta}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="resources"
          className="soft-section-divider scroll-mt-24 bg-[rgba(255,251,244,0.76)] px-5 py-12 sm:px-7"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-[rgba(253,134,6,0.3)] bg-[rgba(253,134,6,0.12)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                Recursos
              </p>
              <h2 className="mt-5 text-3xl font-semibold sm:text-4xl lg:text-5xl">
                Recursos para hacer crecer tu negocio con{" "}
                <span className="text-[var(--color-accent)]">TurnoSi</span>
              </h2>
              <p className="mt-4 text-base leading-8 text-[var(--color-muted-strong)]">
                Encontrá guías, documentación y herramientas para sacarle el
                máximo provecho a la plataforma.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {resourceCards.map((resource, index) => (
                <article
                  key={resource.title}
                  className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.94)] p-5 shadow-[0_18px_50px_rgba(32,24,54,0.04)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(32,24,54,0.08)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(253,134,6,0.12)] text-sm font-semibold text-[var(--color-ink)]">
                    {index + 1}
                  </div>
                  <p className="mt-4 text-lg font-semibold">{resource.title}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--color-muted-strong)]">
                    {resource.description}
                  </p>
                  <button
                    type="button"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-accent)] transition-transform duration-200 hover:translate-x-1"
                  >
                    Explorar
                    <span aria-hidden="true">→</span>
                  </button>
                </article>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.94)] px-6 py-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(32,24,54,0.08)] text-xl text-[var(--color-ink)]">
                    ↗
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold">
                      ¿Listo para empezar?
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--color-muted-strong)]">
                      Unite a más de 500 negocios que ya gestionan sus turnos de
                      forma simple y profesional.
                    </p>
                    <a
                      href="/register"
                      className="mt-5 inline-flex items-center rounded-md bg-[var(--color-ink)] px-5 py-3 text-sm font-medium text-[var(--color-button-text)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      Comenzar gratis
                    </a>
                  </div>
                </div>

                <div className="grid gap-3 border-t border-[var(--color-border)] pt-5 text-sm text-[var(--color-ink)] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <p>Sin tarjeta de crédito</p>
                  <p>Prueba gratis del plan Inicial por 7 días</p>
                  <p>Cancelá cuando quieras</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 px-5 py-10 sm:px-7">
          <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">
                Precios
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                Planes claros para cada etapa del negocio.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--color-muted-strong)]">
                Empezá simple y escalá cuando tu operación necesite más equipo, más control y más visibilidad.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {billingPlans.map((plan) => (
                <article
                  key={plan.name}
                  className={`rounded-lg border p-5 ${
                    plan.recommended
                      ? "border-[var(--color-ink)] bg-[rgba(32,24,54,0.06)]"
                      : "border-[var(--color-border)] bg-[rgba(255,251,244,0.76)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{plan.name}</p>
                      <p className="mt-3 text-sm leading-7 text-[var(--color-muted-strong)]">
                        {plan.description}
                      </p>
                    </div>
                    {plan.recommended && (
                      <span className="rounded-md bg-[var(--color-accent)] px-2 py-1 text-xs font-semibold text-[var(--color-button-text)]">
                        Recomendado
                      </span>
                    )}
                  </div>

                  <div className="mt-6 flex items-end gap-1">
                    <p className="font-mono text-3xl font-semibold">{plan.price}</p>
                    <p className="pb-1 text-sm text-[var(--color-muted)]">
                      {plan.period}
                    </p>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4">
                    {plan.features.map((feature) => (
                      <p
                        key={feature}
                        className="text-sm text-[var(--color-muted-strong)]"
                      >
                        {feature}
                      </p>
                    ))}
                  </div>
                  <Link
                    to={`/register?plan=${plan.id}`}
                    className={`mt-6 inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold ${
                      plan.recommended
                        ? "bg-[var(--color-ink)] text-[var(--color-button-text)]"
                        : "border border-[var(--color-border-strong)] text-[var(--color-ink)]"
                    }`}
                  >
                    Elegir {plan.name}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <footer className="bg-[var(--color-page)]">
          <div className="mx-auto max-w-7xl">
            <section id="contact" className="scroll-mt-24 w-full rounded-[28px] border border-[var(--color-border)] bg-[rgba(255,251,244,0.92)] px-6 py-8 shadow-[0_20px_60px_rgba(32,24,54,0.08)] sm:px-8 lg:px-10">
            <div className="grid gap-6 text-center lg:grid-cols-[minmax(260px,0.95fr)_repeat(3,minmax(0,1fr))] lg:gap-6 lg:text-left">
                <div className="space-y-5 lg:pr-8 lg:text-center xl:text-left">
                  <p className="inline-flex items-center gap-2 rounded-full border border-[rgba(253,134,6,0.28)] bg-[rgba(253,134,6,0.12)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)]">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                    Contacto
                  </p>
                  <h2 className="text-3xl font-semibold sm:text-4xl">
                    ¿Tenés preguntas?
                  </h2>
                  <p className="max-w-sm text-sm leading-7 text-[var(--color-muted-strong)]">
                    Estamos para ayudarte a que saques el máximo provecho de TurnoSi.
                  </p>
                  <ul className="space-y-3 text-sm text-[var(--color-ink)]">
                    <li className="flex items-center justify-center gap-2 lg:justify-start">
                      <span className="text-[var(--color-accent)]">◌</span>
                      Respondemos en menos de 24 horas
                    </li>
                    <li className="flex items-center justify-center gap-2 lg:justify-start">
                      <span className="text-[var(--color-accent)]">◌</span>
                      Soporte real de personas
                    </li>
                    <li className="flex items-center justify-center gap-2 lg:justify-start">
                      <span className="text-[var(--color-accent)]">◌</span>
                      Te ayudamos a crecer
                    </li>
                  </ul>
                </div>

                <article className="border border-[var(--color-border)] bg-white p-6 text-center shadow-[0_14px_40px_rgba(32,24,54,0.05)] lg:px-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(253,134,6,0.14)] text-2xl text-[var(--color-accent)]">
                    ✉
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold">Email</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--color-muted-strong)]">
                    Escribinos y te respondemos a la brevedad.
                  </p>
                  <a className="mt-6 inline-flex text-sm font-semibold text-[var(--color-accent)]" href="mailto:hola@turnosi.com">
                    hola@turnosi.com
                  </a>
                  <div className="mt-8 border-t border-[var(--color-border)] pt-5">
                    <a href="mailto:hola@turnosi.com" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
                      Enviar email <span aria-hidden="true">→</span>
                    </a>
                  </div>
                </article>

                <article className="border border-[var(--color-border)] bg-white p-6 text-center shadow-[0_14px_40px_rgba(32,24,54,0.05)] lg:px-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(124,92,255,0.12)] text-2xl text-[#6f5bd6]">
                    ◔
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold">Soporte</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--color-muted-strong)]">
                    Visitá nuestro centro de ayuda y encontrá respuestas rápido.
                  </p>
                  <div className="mt-5 space-y-3 text-sm text-[var(--color-ink)]">
                    <p>Centro de ayuda</p>
                    <p>Documentación</p>
                    <p>Preguntas frecuentes</p>
                  </div>
                  <div className="mt-8 border-t border-[var(--color-border)] pt-5">
                    <a href="#resources" className="inline-flex items-center gap-2 text-sm font-medium text-[#6f5bd6]">
                      Ir al centro de ayuda <span aria-hidden="true">→</span>
                    </a>
                  </div>
                </article>

                <article className="border border-[var(--color-border)] bg-white p-6 text-center shadow-[0_14px_40px_rgba(32,24,54,0.05)] lg:px-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(86,145,101,0.12)] text-2xl text-[#3f7a49]">
                    ⌂
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold">Comercial</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--color-muted-strong)]">
                    ¿Tenés un equipo grande o necesitás algo a medida?
                  </p>
                  <div className="mt-5 space-y-3 text-sm text-[var(--color-ink)]">
                    <p>Planes para equipos</p>
                    <p>Multi-sede</p>
                    <p>Alianzas y partners</p>
                  </div>
                  <div className="mt-8 border-t border-[var(--color-border)] pt-5">
                    <a href="/register" className="inline-flex items-center gap-2 text-sm font-medium text-[#3f7a49]">
                      Hablar con ventas <span aria-hidden="true">→</span>
                    </a>
                  </div>
                </article>
              </div>
            </section>
          </div>

          <div className="mx-auto max-w-7xl">
            <section className="mt-8 w-full rounded-t-[28px] border border-white/12 bg-[var(--color-ink)] px-6 py-6 text-[var(--color-button-text)] shadow-[0_22px_60px_rgba(32,24,54,0.28)] sm:px-8">
              <div className="flex flex-col gap-5 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/14 bg-white/6 text-2xl text-[var(--color-accent)]">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold sm:text-3xl">
                      ¿Listo para <span className="text-[var(--color-accent)]">organizar</span> tus turnos?
                    </h3>
                    <p className="mt-2 text-sm text-white/76">
                      Probá el plan Inicial gratis por 7 días. Sin tarjeta de crédito.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:items-end">
                  <a
                    href="/register"
                    className="inline-flex items-center justify-center rounded-md bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-button-text)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    Comenzar gratis <span className="ml-2" aria-hidden="true">→</span>
                  </a>
                  <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/72 lg:justify-end">
                    <span>7 días gratis</span>
                    <span>Sin tarjeta</span>
                    <span>Cancelá cuando quieras</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="soft-section-divider soft-section-divider-dark relative w-full overflow-hidden rounded-b-[28px] bg-[var(--color-ink)] px-6 py-8 text-[var(--color-button-text)] sm:px-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 right-0 h-56 w-72 opacity-30 sm:h-72 sm:w-[30rem]"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,250,244,0.34) 1.25px, transparent 1.25px)",
                backgroundSize: "12px 12px",
                maskImage:
                  "linear-gradient(215deg, black 0%, black 34%, rgba(0,0,0,0.52) 48%, transparent 70%)",
                WebkitMaskImage:
                  "linear-gradient(215deg, black 0%, black 34%, rgba(0,0,0,0.52) 48%, transparent 70%)"
              }}
            />
              <div className="grid gap-8 lg:grid-cols-[minmax(260px,1.2fr)_repeat(3,minmax(0,1fr))]">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2">
                    {brand}
                  </div>
                  <p className="max-w-xs text-sm leading-7 text-white/70">
                    La plataforma más simple para gestionar turnos, horarios y clientes en tu negocio.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">Producto</p>
                  <ul className="mt-4 space-y-3 text-sm text-white/70">
                    <li><a href="#funciones">Funciones</a></li>
                    <li><a href="#pricing">Precios</a></li>
                    <li><a href="/login">Ingresar</a></li>
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">Soporte</p>
                  <ul className="mt-4 space-y-3 text-sm text-white/70">
                    <li><a href="#contact">Contacto</a></li>
                    <li><a href="#faq">Preguntas frecuentes</a></li>
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">Legal</p>
                  <ul className="mt-4 space-y-3 text-sm text-white/70">
                    <li>Términos y condiciones</li>
                    <li>Política de privacidad</li>
                    <li>Cancelaciones</li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 border-t border-white/10 pt-5 text-sm text-white/60">
                <p>© 2026 TurnoSi</p>
              </div>
          </section>
        </footer>
      </main>
    </div>
  );
}

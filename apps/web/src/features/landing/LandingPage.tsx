import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";

import { billingPlans } from "../billing/billing.plans";
import turnosiLogo from "@/components/assets/logos/turnosi-horizontal.svg";

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
  const shouldReduceMotion = useReducedMotion();
  const revealInitial = shouldReduceMotion ? false : { opacity: 0, y: 30 };
  const revealInView = shouldReduceMotion ? undefined : { opacity: 1, y: 0 };
  const previewInitial = shouldReduceMotion ? false : { opacity: 0, y: 18, scale: 0.985 };
  const previewInView = shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 };
  const motionViewport = { once: true, amount: 0.22 };
  const smoothTransition = { duration: 0.72, ease: [0.22, 1, 0.36, 1] as const };

  useLayoutEffect(() => {
    const previousHtmlBackground = document.documentElement.style.backgroundColor;
    const previousBodyBackground = document.body.style.backgroundColor;
    const previousScrollRestoration = window.history.scrollRestoration;
    const shouldResetScroll = window.matchMedia("(min-width: 949px)").matches;

    document.documentElement.style.backgroundColor = "#201836";
    document.body.style.backgroundColor = "#201836";

    if (shouldResetScroll && !window.location.hash) {
      window.history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
    }

    return () => {
      document.documentElement.style.backgroundColor = previousHtmlBackground;
      document.body.style.backgroundColor = previousBodyBackground;
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 12);
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

  useEffect(() => {
    if (!isMenuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <div className="min-h-screen w-full bg-[var(--color-page)]">
      <main>
        <section
          id="inicio"
          className="landing-hero-shell relative z-10 scroll-mt-24 border-b border-[var(--color-border)] pt-[76px] text-[var(--color-button-text)] sm:pt-[70px]"
        >
          <header
            className={`landing-hero-nav fixed z-50 ${
              isScrolled ? "landing-hero-nav--floating" : ""
            }`}
          >
            <div
              className={`landing-hero-nav__inner ${
                isScrolled
                  ? "landing-hero-nav__inner--compact px-4 py-2 sm:px-5"
                  : "px-5 py-3 sm:px-7"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div
                  className={`landing-hero-nav__brand min-w-0 ${
                    isScrolled
                      ? "landing-hero-nav__brand--compact [&_img]:h-11 sm:[&_img]:h-12"
                      : "[&_img]:h-14 sm:[&_img]:h-16"
                  }`}
                >
                  {brand}
                </div>

            <nav
              className={`landing-hero-nav__links hidden items-center whitespace-nowrap font-medium text-white/78 min-[949px]:flex ${
                isScrolled ? "landing-hero-nav__links--compact gap-5 text-[0.92rem]" : "gap-6 text-sm"
              }`}
            >
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

            <div
              className={`landing-hero-nav__actions hidden items-center justify-end min-[949px]:flex ${
                isScrolled ? "landing-hero-nav__actions--compact gap-1.5" : "gap-2"
              }`}
            >
              <a
                href="/login"
                className={`landing-hero-nav__login group relative font-semibold text-white/82 transition-colors duration-200 hover:text-[var(--color-accent)] ${
                  isScrolled ? "landing-hero-nav__login--compact px-2 py-1.5 text-[0.92rem]" : "px-2 py-2 text-sm"
                }`}
              >
                Ingresar
                <span className="absolute bottom-0 left-2 h-0.5 w-[calc(100%-1rem)] origin-left scale-x-0 rounded-full bg-[var(--color-accent)] transition-transform duration-200 group-hover:scale-x-100" />
              </a>
              <a
                href="/register"
                className={`landing-hero-nav__cta rounded-md bg-[var(--color-accent)] font-semibold text-[var(--color-button-text)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 ${
                  isScrolled ? "landing-hero-nav__cta--compact px-3.5 py-1.5 text-[0.92rem]" : "px-4 py-2 text-sm"
                }`}
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
            className={`landing-mobile-menu min-[949px]:hidden ${
              isMenuOpen ? "landing-mobile-menu--open" : ""
            }`}
            aria-hidden={!isMenuOpen}
          >
            <div className="landing-mobile-menu-panel">
              <nav className="grid gap-1.5 text-sm font-medium text-white/78">
                  {navigationLinks.map((link, index) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      style={{ transitionDelay: isMenuOpen ? `${35 + index * 25}ms` : "0ms" }}
                      className="landing-mobile-menu-item group relative rounded-md px-3 py-3 transition-colors duration-200 hover:bg-white/8 hover:text-[var(--color-accent)]"
                    >
                      <span className="relative inline-block">
                        {link.label}
                        <span className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 rounded-full bg-[var(--color-accent)] transition-transform duration-200 group-hover:scale-x-100" />
                      </span>
                    </a>
                  ))}
                </nav>

                <div className="mt-4 grid gap-2 border-t border-white/10 pt-3">
                  <a
                    href="/login"
                    onClick={closeMenu}
                    style={{ transitionDelay: isMenuOpen ? "170ms" : "0ms" }}
                    className="landing-mobile-menu-item group relative rounded-md border border-white/18 px-3 py-2.5 text-center text-sm font-medium text-white transition-colors duration-200 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    Ingresar
                    <span className="absolute bottom-1.5 left-1/2 h-0.5 w-10 -translate-x-1/2 origin-left scale-x-0 rounded-full bg-[var(--color-accent)] transition-transform duration-200 group-hover:scale-x-100" />
                  </a>
                  <a
                    href="/register"
                    onClick={closeMenu}
                    style={{ transitionDelay: isMenuOpen ? "195ms" : "0ms" }}
                    className="landing-mobile-menu-item rounded-md bg-[var(--color-accent)] px-3 py-2.5 text-center text-sm font-semibold text-[var(--color-button-text)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                  >
                    Crear cuenta
                  </a>
                </div>
            </div>
          </div>
        </div>
          </header>

          <div className="landing-hero-content relative z-10 mx-auto grid min-h-[unset] w-full max-w-[1460px] min-w-0 gap-8 px-5 py-6 sm:px-7 sm:py-10 lg:px-8 lg:py-12 xl:min-h-[560px] xl:grid-cols-[minmax(0,0.9fr)_minmax(560px,1.1fr)] xl:items-center xl:gap-12 xl:px-8 xl:py-12 2xl:gap-16">
            <div className="landing-hero-copy landing-rise order-1 mx-auto min-w-0 max-w-2xl text-center sm:text-left xl:order-none xl:mx-0 xl:translate-x-12 xl:justify-self-center 2xl:translate-x-16">
              <h1 className="max-w-full text-3xl font-semibold leading-tight [overflow-wrap:anywhere] [text-wrap:balance] sm:text-5xl xl:max-w-[660px] xl:text-6xl">
                Gestioná tus turnos de forma{" "}
                <span className="text-white">simple</span>.
              </h1>
              <div className="landing-hero-copy__description mx-auto mt-4 max-w-full space-y-2 text-sm leading-7 text-white/70 [text-wrap:balance] sm:mx-0 sm:mt-5 sm:max-w-xl sm:text-base sm:leading-8">
                <p>
                  Organizá reservas, horarios, equipo y clientes desde un panel
                  claro.
                </p>
                <p>
                  Tu página pública queda conectada para recibir turnos sin
                  complicaciones.
                </p>
              </div>

              <div className="landing-hero-copy__actions mt-6 grid gap-3 sm:mt-8 sm:flex sm:flex-row">
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
              className="landing-rise landing-delay-1 order-2 mx-auto w-full min-w-0 max-w-4xl xl:order-none xl:mt-24 xl:max-w-[900px] xl:-translate-x-2 xl:justify-self-start 2xl:max-w-[960px] 2xl:translate-x-0"
            >
              <div className="landing-product-scene landing-product-card relative min-h-[430px] overflow-hidden text-white xl:min-h-[470px]">
                <div className="landing-hero-orbits" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="landing-product-board absolute -right-2 left-6 top-12 hidden min-[1080px]:block">
                  <div className="grid min-h-[330px] grid-cols-[126px_minmax(0,1fr)_160px] overflow-hidden rounded-[22px] border border-white/14 bg-[#ffffff] text-[var(--color-ink)] shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
                    <div className="bg-[rgba(32,24,54,0.98)] p-4 text-white">
                      <div className="mb-8 flex items-center gap-2">
                        <img src={turnosiLogo} alt="TurnoSi" className="h-6 w-auto opacity-95" />
                      </div>
                      {["Resumen", "Agenda", "Clientes", "Equipo", "Configuración"].map((item, index) => (
                        <div
                          key={item}
                          className={`mb-2 rounded-md px-2 py-2 text-[10px] font-semibold ${
                            index === 1 ? "bg-white/14 text-white" : "text-white/46"
                          }`}
                        >
                          {item}
                        </div>
                      ))}
                      <div className="mt-7 h-8 rounded-md bg-[var(--color-accent)]" />
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="h-5 w-44 rounded bg-[rgba(32,24,54,0.16)]" />
                          <div className="mt-2 h-2.5 w-56 rounded bg-[rgba(32,24,54,0.08)]" />
                        </div>
                        <div className="flex gap-1.5">
                          <span className="h-7 w-9 rounded bg-[var(--color-ink)]" />
                          <span className="h-7 w-10 rounded border border-[var(--color-border)]" />
                          <span className="h-7 w-9 rounded border border-[var(--color-border)]" />
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        {[0, 1, 2].map((item) => (
                          <div
                            key={item}
                            className="rounded-xl border border-[var(--color-border)] bg-white/58 p-3"
                          >
                            <div className="h-3 w-14 rounded bg-[rgba(32,24,54,0.1)]" />
                            <div className="mt-3 h-5 w-8 rounded bg-[rgba(32,24,54,0.18)]" />
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-white/62">
                        <div className="landing-hero-table-row grid grid-cols-[56px_minmax(0,1fr)_minmax(0,0.7fr)_76px] gap-3 border-b border-[var(--color-border)] px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          <span>Hora</span>
                          <span>Turno</span>
                          <span className="landing-hero-responsible">Responsable</span>
                          <span>Estado</span>
                        </div>

                        {[0, 1, 2, 3].map((item) => (
                          <div
                            key={item}
                            className="landing-hero-table-row grid grid-cols-[56px_minmax(0,1fr)_minmax(0,0.7fr)_76px] items-center gap-3 border-b border-[var(--color-border)] px-3 py-2.5 last:border-b-0"
                          >
                            <div className="h-3 w-9 rounded bg-[rgba(253,134,6,0.32)]" />
                            <div>
                              <div className="h-3 w-28 rounded bg-[rgba(32,24,54,0.15)]" />
                              <div className="mt-2 h-2.5 w-20 rounded bg-[rgba(32,24,54,0.08)]" />
                            </div>
                            <div className="landing-hero-responsible h-3 w-24 rounded bg-[rgba(32,24,54,0.1)]" />
                            <div className="h-5 rounded-full bg-[rgba(253,134,6,0.15)]" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 border-l border-[var(--color-border)] bg-white/35 p-3">
                      <div className="rounded-xl border border-[var(--color-border)] bg-white/58 p-3">
                        <div className="flex items-center justify-between">
                          <div className="h-3.5 w-20 rounded bg-[rgba(32,24,54,0.14)]" />
                          <div className="h-3 w-3 rounded-full bg-[var(--color-ink)]" />
                        </div>
                        <div className="mt-4 grid grid-cols-7 gap-1">
                          {Array.from({ length: 28 }).map((_, index) => (
                            <span
                              key={index}
                              className={`h-3.5 rounded ${
                                index === 10
                                  ? "bg-[var(--color-ink)]"
                                  : index % 4 === 0
                                    ? "bg-[#569165]/45"
                                    : "bg-[rgba(32,24,54,0.08)]"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-[var(--color-border)] bg-white/58 p-3">
                        <div className="h-4 w-24 rounded bg-[rgba(32,24,54,0.14)]" />
                        <div className="mt-3 space-y-2">
                          <div className="h-3 w-full rounded bg-[rgba(32,24,54,0.1)]" />
                          <div className="h-3 w-3/4 rounded bg-[rgba(32,24,54,0.08)]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="landing-reservation-toast">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-[rgba(253,134,6,0.16)] text-sm font-semibold text-[var(--color-accent)]">
                        TS
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white">Nueva reserva recibida</p>
                        <p className="mt-1 truncate text-[11px] text-white/58">
                          Corte de pelo · Viernes 16:00
                        </p>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-[#72d59b]" />
                    </div>
                  </div>
                </div>

                <div className="landing-product-mobile-board min-[1080px]:hidden">
                  <div className="landing-product-mobile-panel grid grid-cols-[76px_minmax(0,1fr)] overflow-hidden rounded-[22px] border border-white/14 bg-[#ffffff] text-[var(--color-ink)] shadow-[0_28px_72px_rgba(4,2,12,0.28)]">
                    <div className="bg-[rgba(32,24,54,0.98)] p-3 text-white">
                      <img src={turnosiLogo} alt="TurnoSi" className="h-5 w-auto min-w-[58px] opacity-95" />
                      <div className="mt-8 space-y-3">
                        {["Resumen", "Agenda", "Clientes", "Equipo"].map((item, index) => (
                          <span
                            key={item}
                            className={`block rounded-md px-2 py-1.5 text-[8px] font-semibold ${
                              index === 1 ? "bg-white/14 text-white" : "text-white/42"
                            }`}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                      <span className="mt-8 block h-7 rounded-md bg-[var(--color-accent)]" />
                    </div>

                    <div className="min-w-0 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="h-3.5 w-32 rounded bg-[rgba(32,24,54,0.16)]" />
                          <div className="mt-2 h-2.5 w-44 max-w-full rounded bg-[rgba(32,24,54,0.08)]" />
                        </div>
                        <span className="h-6 w-6 rounded bg-[var(--color-ink)]" />
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {[0, 1, 2].map((item) => (
                          <div
                            key={item}
                            className="rounded-lg border border-[var(--color-border)] bg-white/62 p-2"
                          >
                            <div className="h-2 w-12 rounded bg-[rgba(32,24,54,0.1)]" />
                            <div className="mt-2 h-4 w-7 rounded bg-[rgba(32,24,54,0.15)]" />
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-white/66">
                        <div className="grid grid-cols-[42px_minmax(0,1fr)_54px] gap-2 border-b border-[var(--color-border)] px-2.5 py-2 text-[7px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          <span>Hora</span>
                          <span>Turno</span>
                          <span>Estado</span>
                        </div>
                        {[0, 1].map((item) => (
                          <div
                            key={item}
                            className="grid grid-cols-[42px_minmax(0,1fr)_54px] items-center gap-2 border-b border-[var(--color-border)] px-2.5 py-2.5 last:border-b-0"
                          >
                            <span className="h-2.5 w-8 rounded bg-[rgba(253,134,6,0.32)]" />
                            <span>
                              <span className="block h-2.5 w-24 max-w-full rounded bg-[rgba(32,24,54,0.14)]" />
                              <span className="mt-1.5 block h-2 w-16 rounded bg-[rgba(32,24,54,0.08)]" />
                            </span>
                            <span className="h-4 rounded-full bg-[rgba(253,134,6,0.16)]" />
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-white/58 p-2">
                        <div className="h-3 w-24 rounded bg-[rgba(32,24,54,0.12)]" />
                        <div className="mt-2 grid grid-cols-7 gap-1">
                          {Array.from({ length: 21 }).map((_, index) => (
                            <span
                              key={index}
                              className={`h-2.5 rounded ${
                                index === 10
                                  ? "bg-[var(--color-ink)]"
                                  : index % 4 === 0
                                    ? "bg-[#569165]/45"
                                    : "bg-[rgba(32,24,54,0.08)]"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="landing-mobile-reservation-toast">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(253,134,6,0.16)] text-xs font-semibold text-[var(--color-accent)]">
                      TS
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-white">Nueva reserva recibida</p>
                      <div className="mt-1 h-2 w-28 rounded bg-white/18" />
                    </div>
                    <span className="h-2 w-2 rounded-full bg-[#72d59b]" />
                  </div>
                </div>

              </div>
            </div>
          </div>
          <div className="landing-hero-wave" aria-hidden="true" />
        </section>

        <section
          id="funciones"
          className="landing-functions-section soft-section-divider scroll-mt-24 px-5 py-14 sm:px-7 lg:py-16"
        >
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mx-auto max-w-4xl text-center"
              initial={revealInitial}
              whileInView={revealInView}
              viewport={motionViewport}
              transition={smoothTransition}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                Funciones
              </p>
              <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-medium leading-[1.08] tracking-[-0.04em] sm:text-4xl lg:text-[3.35rem]">
                Todo para gestionar tus turnos.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-[0.95rem] leading-7 text-[var(--color-muted-strong)]">
                Agenda, clientes y equipo en un solo lugar.
              </p>
            </motion.div>

            <div className="landing-functions-layout mt-11">
              <motion.article
                className="landing-feature-card landing-function-block landing-function-block--agenda"
                initial={revealInitial}
                whileInView={revealInView}
                viewport={motionViewport}
                transition={{ ...smoothTransition, delay: 0.08 }}
              >
                <div className="landing-function-copy">
                  <p className="landing-function-eyebrow">01 · Agenda clara</p>
                  <h3>Todos tus turnos, claros de un vistazo.</h3>
                  <p>
                    Horarios, responsables y estados en una sola vista.
                  </p>
                  <div className="landing-function-points">
                    <span>Vista diaria, semanal y mensual.</span>
                    <span>Señas y pagos visibles.</span>
                    <span>Reprogramación desde el turno.</span>
                  </div>
                </div>

                <motion.div
                  className="landing-appointment-stream"
                  aria-label="Turnos entrando a la agenda"
                  initial={shouldReduceMotion ? false : { opacity: 0 }}
                  whileInView={shouldReduceMotion ? undefined : { opacity: 1 }}
                  viewport={motionViewport}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
                >
                  <div className="landing-appointment-plane">
                    {[
                      [
                        ["09:00", "Corte de pelo", "Confirmado"],
                        ["10:30", "Limpieza dental", "Señado"],
                        ["12:00", "Color y corte", "En espera"],
                        ["14:30", "Consulta odontológica", "Pagado"],
                        ["16:00", "Barba completa", "Confirmado"]
                      ],
                      [
                        ["09:30", "Control mensual", "Señado"],
                        ["11:00", "Consulta inicial", "Confirmado"],
                        ["13:30", "Perfilado", "Pagado"],
                        ["15:00", "Ortodoncia", "En espera"],
                        ["18:00", "Corte + barba", "Confirmado"]
                      ]
                    ].map((column, columnIndex) => (
                      <div
                        key={columnIndex}
                        className={`landing-appointment-track landing-appointment-track--${columnIndex + 1}`}
                      >
                        {[0, 1, 2].map((groupIndex) => (
                          <div key={groupIndex} className="landing-appointment-group" aria-hidden={groupIndex > 0}>
                            {column.map(([time, service, status]) => (
                              <div key={`${service}-${time}-${groupIndex}`} className="landing-appointment-pill">
                                <span>{time}</span>
                                <strong>{service}</strong>
                                <small data-status={status}>{status}</small>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </motion.div>

                <div className="landing-agenda-sparkles" aria-hidden="true">
                  {Array.from({ length: 7 }, (_, index) => (
                    <span key={index} />
                  ))}
                </div>
              </motion.article>

              <div className="landing-functions-split">
                <motion.article
                  className="landing-feature-card landing-function-block landing-function-block--booking landing-function-card-dark"
                  initial={revealInitial}
                  whileInView={revealInView}
                  whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                  viewport={motionViewport}
                  transition={{ ...smoothTransition, delay: 0.12 }}
                >
                  <div className="landing-function-copy">
                    <span className="landing-function-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M8 12h8M8 16h5M7 4.5h10A2.5 2.5 0 0 1 19.5 7v10A2.5 2.5 0 0 1 17 19.5H7A2.5 2.5 0 0 1 4.5 17V7A2.5 2.5 0 0 1 7 4.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                        <path d="M8 8h.01M12 8h.01M16 8h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                      </svg>
                    </span>
                    <p className="landing-function-eyebrow">02 · Reserva pública</p>
                    <h3>El cliente reserva sin escribirte para cada horario.</h3>
                    <p>
                      Tu página pública muestra servicios, horarios disponibles y confirmación conectada a tu agenda.
                    </p>
                    <div className="landing-function-points">
                      <span>Reservas 24/7 desde cualquier dispositivo.</span>
                      <span>Disponibilidad real según sede, servicio y profesional.</span>
                      <span>Señas y pagos listos para escalar la operación.</span>
                    </div>
                  </div>

                  <motion.div
                    className="landing-booking-preview"
                    aria-label="Vista previa de reserva online"
                    initial={previewInitial}
                    whileInView={previewInView}
                    viewport={motionViewport}
                    transition={{ ...smoothTransition, delay: 0.2 }}
                  >
                    <div className="landing-booking-steps">
                      {["Servicio", "Fecha", "Hora", "Confirmación"].map((step, index) => (
                        <span key={step} className={index === 0 ? "is-active" : undefined}>
                          {index + 1}
                          <small>{step}</small>
                        </span>
                      ))}
                    </div>

                    <div className="landing-booking-grid">
                      <div className="landing-booking-services">
                        {[
                          ["Corte de pelo", "30 min"],
                          ["Barba completa", "30 min"],
                          ["Corte + barba", "60 min"],
                          ["Color y corte", "90 min"]
                        ].map(([service, duration], index) => (
                          <span key={service} className={index === 0 ? "is-selected" : undefined}>
                            <strong>{service}</strong>
                            <small>{duration}</small>
                          </span>
                        ))}
                      </div>

                      <div className="landing-booking-calendar">
                        <div>
                          <strong>Mayo 2026</strong>
                          <span>‹ ›</span>
                        </div>
                        {Array.from({ length: 28 }, (_, index) => (
                          <span key={index} className={index === 18 ? "is-selected" : index > 20 ? "is-muted" : undefined}>
                            {index + 1}
                          </span>
                        ))}
                      </div>

                      <div className="landing-booking-hours">
                        {["09:00", "10:30", "12:00", "14:30", "16:00", "19:00"].map((hour) => (
                          <span key={hour} className={hour === "10:30" ? "is-selected" : undefined}>
                            {hour}
                          </span>
                        ))}
                      </div>

                      <div className="landing-booking-confirm">
                        <span>✓</span>
                        <strong>¡Listo, tu turno está confirmado!</strong>
                        <small>Corte de pelo · Viernes 24/05 a las 10:30</small>
                        <button type="button">Ver mi turno</button>
                      </div>
                    </div>
                  </motion.div>

                </motion.article>

                <motion.article
                  className="landing-feature-card landing-function-block landing-function-block--clients landing-function-card-dark"
                  initial={revealInitial}
                  whileInView={revealInView}
                  whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                  viewport={motionViewport}
                  transition={{ ...smoothTransition, delay: 0.18 }}
                >
                  <div className="landing-function-copy">
                    <span className="landing-function-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M9.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4.5 18.5c.8-2.6 2.55-4.1 5-4.1s4.2 1.5 5 4.1M16.5 11.5a2.45 2.45 0 1 0 0-4.9M15.5 14.5c1.9.2 3.25 1.45 4 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                    </span>
                    <p className="landing-function-eyebrow">03 · Clientes y equipo</p>
                    <h3>Historial, contacto y permisos sin mezclar responsabilidades.</h3>
                    <p>
                      Cada cliente queda unificado por contacto, y cada persona del equipo accede solo a lo que necesita.
                    </p>
                    <div className="landing-function-points">
                      <span>Clientes duplicados reducidos por teléfono o email.</span>
                      <span>Roles para propietario, administrador y miembros.</span>
                      <span>Ausencias, pagos y seguimiento en un mismo perfil.</span>
                    </div>
                  </div>

                  <motion.div
                    className="landing-client-preview"
                    aria-label="Vista previa de clientes y equipo"
                    initial={previewInitial}
                    whileInView={previewInView}
                    viewport={motionViewport}
                    transition={{ ...smoothTransition, delay: 0.26 }}
                  >
                    <div>
                      <div className="landing-client-header">
                        <div>
                          <strong>Historial del cliente</strong>
                          <span>Cliente desde abril</span>
                        </div>
                        <span>JP</span>
                      </div>
                      {[
                        ["15/05/2026", "Corte de pelo", "Confirmado"],
                        ["30/04/2026", "Barba completa", "Pagado"],
                        ["10/04/2026", "Corte + barba", "Señado"]
                      ].map(([date, service, status]) => (
                        <div key={`${date}-${service}`} className="landing-client-row">
                          <span>{date}</span>
                          <strong>{service}</strong>
                          <small>{status}</small>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="landing-client-header">
                        <div>
                          <strong>Equipo y permisos</strong>
                          <span>Acceso por rol y sede</span>
                        </div>
                        <button type="button">+ Invitar</button>
                      </div>
                      {[
                        ["Sofía Díaz", "Propietaria", "Activo"],
                        ["Martina Ramos", "Agenda y clientes", "Activo"],
                        ["Nicolás Silva", "Agenda", "Activo"]
                      ].map(([name, role, status]) => (
                        <div key={name} className="landing-client-row">
                          <strong>{name}</strong>
                          <span>{role}</span>
                          <small>{status}</small>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </motion.article>
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

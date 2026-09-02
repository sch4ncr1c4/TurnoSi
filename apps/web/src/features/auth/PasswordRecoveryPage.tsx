import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";

import { PageLayout } from "../../components/layout/PageLayout";
import backChevronIcon from "../../components/assets/icons/actions/back-chevron.svg";
import keyRoundIcon from "../../components/assets/icons/auth/key-round.svg";
import loginUserIcon from "../../components/assets/icons/auth/login-user.svg";
import { PasswordRequirementField } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { requestPasswordReset, resetPassword } from "./auth.api";

const maxCodeSendAttempts = 5;

export function PasswordRecoveryPage({ brand }: { brand: ReactNode }) {
  const shouldReduceMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [codeSendAttempts, setCodeSendAttempts] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timeout = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [resendCooldown]);

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    if (submitting || codeSendAttempts >= maxCodeSendAttempts) return;
    setSubmitting(true);
    setError("");
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      const nextAttempts = codeSendAttempts + 1;
      setCodeSendAttempts(nextAttempts);
      setCodeRequested(true);
      setResendCooldown(10);
      setMessage(
        nextAttempts >= maxCodeSendAttempts
          ? "Llegaste al límite de envíos. Esperá 30 minutos para pedir otro código."
          : "Si la cuenta existe, enviamos un código válido por 3 minutos."
      );
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "TOO_MANY_ATTEMPTS") {
        setCodeSendAttempts(maxCodeSendAttempts);
      }
      setError(
        caught instanceof ApiError && caught.code === "TOO_MANY_ATTEMPTS"
          ? "Llegaste al límite de intentos. Esperá 30 minutos para pedir otro código."
          : "No pudimos enviar el código. Intentá nuevamente."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await resetPassword(email.trim().toLowerCase(), code, newPassword);
      setMessage("Contraseña actualizada. Todas las sesiones anteriores se cerraron.");
      setCompleted(true);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "INVALID_CODE"
          ? "El código es incorrecto o venció."
          : "No pudimos cambiar la contraseña."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageLayout>
      <div className="grid min-h-screen lg:grid-cols-2">
        <aside className="auth-brand-panel hidden flex-col bg-[var(--color-ink)] px-8 py-8 text-white lg:flex">
          <motion.div
            className="relative z-10 mx-auto flex w-full max-w-[34rem] flex-1 flex-col justify-center text-center"
            initial={shouldReduceMotion ? false : { opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="mb-10 flex justify-center [&_*]:text-white">{brand}</div>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Recuperá tu cuenta.
              <span className="block">Volvé a trabajar.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/68">
              Restablecé tu contraseña de forma segura y retomá la gestión de tu negocio.
            </p>
          </motion.div>
        </aside>

        <section className="auth-surface-pattern relative flex min-w-0 flex-col overflow-hidden bg-white">
          <motion.header
            className="relative z-10 flex justify-start px-5 py-5 sm:px-8 lg:justify-end"
            initial={shouldReduceMotion ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          >
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-muted-strong)] transition hover:text-[var(--color-ink)]"
            >
              <img
                src={backChevronIcon}
                alt=""
                aria-hidden="true"
                className="h-4 w-4 opacity-70 transition-transform duration-300 group-hover:-translate-x-1"
              />
              Volver al inicio de sesión
            </Link>
          </motion.header>

          <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-8 pt-4 sm:px-7 lg:pb-12">
            <motion.div
              className="w-full max-w-[500px] rounded-2xl border border-[rgba(32,24,54,0.11)] bg-white/90 px-7 py-7 shadow-[0_24px_70px_rgba(32,24,54,0.12)] backdrop-blur sm:px-9 sm:py-8 lg:-translate-y-2 lg:px-10 lg:py-9"
              initial={shouldReduceMotion ? false : { opacity: 0, x: 32, scale: 0.985 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--color-ink)]">
                Seguridad de la cuenta
              </p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">
                {completed ? "Acceso recuperado" : codeRequested ? "Ingresá el código" : "Recuperar acceso"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted-strong)]">
                {completed
                  ? "Tu contraseña fue actualizada correctamente."
                  : codeRequested
                    ? `Usá el código que enviamos a ${email}.`
                    : "Te enviaremos un código para crear una contraseña nueva."}
              </p>

              {message && (
                <p className="mt-5 rounded-md border border-[#b9d8bf] bg-[#eef8ee] p-3 text-sm text-[#28633a]">
                  {message}
                </p>
              )}
              {error && (
                <p role="alert" className="mt-5 rounded-md border border-[#e7b9b2] bg-[#fde8e5] p-3 text-sm text-[#9f1f16]">
                  {error}
                </p>
              )}

              {!completed && !codeRequested ? (
                <form onSubmit={requestCode} className="mt-6 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">Email</span>
                    <span className="group/auth-field relative block">
                      <img
                        src={loginUserIcon}
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute left-4 top-1/2 z-10 h-[22px] w-[22px] -translate-y-1/2 opacity-60"
                      />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="nombre@correo.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-white pl-12 pr-3 text-sm outline-none transition hover:border-[var(--color-accent)] focus:border-[var(--color-accent)]"
                      />
                    </span>
                  </label>
                  <button
                    disabled={submitting}
                    className="auth-submit-button inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg bg-[var(--color-ink)] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(32,24,54,0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>{submitting ? "Enviando..." : "Enviar código"}</span>
                    {!submitting && <span aria-hidden="true">→</span>}
                  </button>
                </form>
              ) : !completed ? (
                <form onSubmit={changePassword} className="mt-6 space-y-4">
              <label className="block text-sm font-medium">
                Código de 6 dígitos
                <span className="group/auth-field relative mt-2 block">
                  <img
                    src={keyRoundIcon}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 opacity-62 transition duration-200 ease-out group-focus-within/auth-field:scale-110 group-focus-within/auth-field:opacity-90"
                  />
                  <input
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    placeholder="Ingresá el código"
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, ""))
                    }
                    className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-white pl-12 pr-3 text-sm outline-none transition placeholder:text-[#77727f] placeholder:opacity-100 hover:border-[var(--color-accent)] focus:border-[var(--color-accent)]"
                  />
                </span>
              </label>
              <PasswordRequirementField
                label="Contraseña nueva"
                required
                autoComplete="new-password"
                placeholder="Ingresá una contraseña nueva"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <button
                disabled={submitting}
                className="auth-submit-button inline-flex h-11 w-full items-center justify-center rounded-lg bg-[var(--color-ink)] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Actualizando..." : "Cambiar contraseña"}
              </button>
              <button
                type="button"
                disabled={
                  submitting ||
                  resendCooldown > 0 ||
                  codeSendAttempts >= maxCodeSendAttempts
                }
                onClick={(event) => void requestCode(event)}
                className="h-11 w-full rounded-lg border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {codeSendAttempts >= maxCodeSendAttempts
                  ? "Límite alcanzado. Esperá 30 minutos"
                  : resendCooldown > 0
                  ? `Podés reenviar en ${resendCooldown}s`
                  : "Reenviar código"}
              </button>
                </form>
              ) : null}

              <div className="mt-5 border-t border-[var(--color-border)] pt-4 text-center text-sm text-[var(--color-muted)]">
                ¿Ya recordaste tu contraseña?{" "}
                <Link to="/login" className="font-bold text-[var(--color-ink)]">
                  Iniciar sesión
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

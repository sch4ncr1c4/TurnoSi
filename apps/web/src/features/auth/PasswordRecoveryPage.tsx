import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { PageLayout } from "../../components/layout/PageLayout";
import { ApiError } from "../../lib/api";
import { requestPasswordReset, resetPassword } from "./auth.api";

const maxCodeSendAttempts = 5;

export function PasswordRecoveryPage({ brand }: { brand: ReactNode }) {
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
      <header className="border-b border-[var(--color-border)] bg-[var(--color-ink)] px-5 py-4 text-white">
        <div className="mx-auto max-w-5xl [&_*]:text-white">{brand}</div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-5 py-10">
        <section className="w-full rounded-xl border border-[var(--color-border)] bg-[#fffaf4] p-5 shadow-[0_24px_70px_rgba(32,24,54,0.12)] sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            Seguridad de la cuenta
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Recuperar acceso</h1>
          <p className="mt-2 text-sm text-[var(--color-muted-strong)]">
            Te enviaremos un código para crear una contraseña nueva.
          </p>

          {message && (
            <p className="mt-5 rounded-md border border-[#b9d8bf] bg-[#eef8ee] p-3 text-sm text-[#28633a]">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-5 rounded-md border border-[#e7b9b2] bg-[#fde8e5] p-3 text-sm text-[#9f1f16]">
              {error}
            </p>
          )}

          {!completed && !codeRequested ? (
            <form onSubmit={requestCode} className="mt-6 space-y-4">
              <label className="block text-sm font-medium">
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-[var(--color-border-strong)] bg-white/70 px-3 outline-none focus:border-[var(--color-accent)]"
                />
              </label>
              <button
                disabled={submitting}
                className="w-full rounded-md bg-[var(--color-ink)] px-4 py-3 text-sm font-semibold text-white"
              >
                {submitting ? "Enviando..." : "Enviar código"}
              </button>
            </form>
          ) : !completed ? (
            <form onSubmit={changePassword} className="mt-6 space-y-4">
              <label className="block text-sm font-medium">
                Código de 6 dígitos
                <input
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, ""))
                  }
                  className="mt-2 h-11 w-full rounded-md border border-[var(--color-border-strong)] bg-white/70 px-3 font-mono tracking-[0.3em] outline-none focus:border-[var(--color-accent)]"
                />
              </label>
              <label className="block text-sm font-medium">
                Contraseña nueva
                <input
                  type="password"
                  minLength={12}
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-[var(--color-border-strong)] bg-white/70 px-3 outline-none focus:border-[var(--color-accent)]"
                />
              </label>
              <button
                disabled={submitting}
                className="w-full rounded-md bg-[var(--color-ink)] px-4 py-3 text-sm font-semibold text-white"
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
                className="w-full rounded-md border border-[var(--color-border-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-60"
              >
                {codeSendAttempts >= maxCodeSendAttempts
                  ? "Límite alcanzado. Esperá 30 minutos"
                  : resendCooldown > 0
                  ? `Podés reenviar en ${resendCooldown}s`
                  : "Reenviar código"}
              </button>
            </form>
          ) : null}

          <Link to="/login" className="mt-6 block text-center text-sm font-semibold">
            Volver al inicio de sesión
          </Link>
        </section>
      </main>
    </PageLayout>
  );
}

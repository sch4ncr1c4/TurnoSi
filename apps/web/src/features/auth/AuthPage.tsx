import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { PageLayout } from "../../components/layout/PageLayout";
import { PasswordRequirementField } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { parseFormData } from "../../utils/validation";
import { login, register, resendVerification } from "./auth.api";
import { authRoutes } from "./auth.data";
import { useSessionQuery } from "./auth.queries";
import { loginSchema, registerSchema } from "./auth.schemas";

type AuthPageProps = {
  brand: ReactNode;
  route: "login" | "register";
};

const maxVerificationSendAttempts = 5;

function getAuthErrorMessage(error: ApiError) {
  if (error.code === "INVALID_CREDENTIALS") {
    return "El email o la contraseña no son correctos.";
  }

  if (error.code === "EMAIL_ALREADY_IN_USE") {
    return "Ya existe una cuenta con ese email.";
  }

  if (error.code === "EMAIL_NOT_VERIFIED") {
    return "Verificá tu correo antes de iniciar sesión.";
  }

  if (error.code === "TOO_MANY_ATTEMPTS") {
    return "Demasiados intentos. Esperá unos minutos y volvé a intentar.";
  }

  return "No pudimos completar la operación. Intentá nuevamente.";
}

export function AuthPage({ brand, route }: AuthPageProps) {
  const config = authRoutes.find((r) => r.path === `/${route}`)!;
  const isLogin = route === "login";
  const schema = isLogin ? loginSchema : registerSchema;
  const session = useSessionQuery();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get("plan");
  const dashboardTarget = selectedPlan
    ? `/dashboard?plan=${encodeURIComponent(selectedPlan)}`
    : "/dashboard";

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationSendAttempts, setVerificationSendAttempts] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timeout = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [resendCooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form.entries());
    const result = parseFormData(schema, data);

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setFormError("");
    setFormMessage("");
    setIsSubmitting(true);
    try {
      if (isLogin) {
        await login(result.parsed as Parameters<typeof login>[0]);
      } else {
        const registration = await register(
          result.parsed as Parameters<typeof register>[0]
        );
        if (!registration.data.verificationRequired) {
          navigate(dashboardTarget, { replace: true });
          return;
        }
        setPendingVerificationEmail(registration.data.email ?? result.parsed.email);
        setVerificationSendAttempts(1);
        setResendCooldown(10);
        setFormMessage(
          "Te enviamos un correo para verificar tu cuenta. La cuenta se crea recién cuando confirmás ese enlace."
        );
        return;
      }
      navigate(dashboardTarget, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (isLogin && error.code === "EMAIL_NOT_VERIFIED") {
          const email = String(data.email ?? "");
          if (email.includes("@")) setPendingVerificationEmail(email);
        }
        setFormError(getAuthErrorMessage(error));
      } else {
        setFormError("No pudimos conectar con el servidor.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendVerification() {
    if (
      !pendingVerificationEmail ||
      isSubmitting ||
      verificationSendAttempts >= maxVerificationSendAttempts
    ) return;
    setFormError("");
    setIsSubmitting(true);
    try {
      await resendVerification(pendingVerificationEmail);
      const nextAttempts = verificationSendAttempts + 1;
      setVerificationSendAttempts(nextAttempts);
      setResendCooldown(10);
      setFormMessage(
        nextAttempts >= maxVerificationSendAttempts
          ? "Llegaste al límite de envíos. Esperá 30 minutos para pedir otro correo."
          : "Te reenviamos el correo de verificación."
      );
    } catch (error) {
      if (error instanceof ApiError && error.code === "TOO_MANY_ATTEMPTS") {
        setVerificationSendAttempts(maxVerificationSendAttempts);
      }
      setFormError(
        error instanceof ApiError && error.code === "TOO_MANY_ATTEMPTS"
          ? "Llegaste al límite de envíos. Esperá 30 minutos para pedir otro correo."
          : "No pudimos reenviar el correo de verificación."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (session.isSuccess) return <Navigate to={dashboardTarget} replace />;

  return (
    <PageLayout>
      <div className="grid min-h-screen lg:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)]">
        <aside className="dot-pattern-corner dot-pattern-bottom-left flex flex-col justify-between bg-[var(--color-ink)] px-5 py-5 text-[var(--color-button-text)] sm:px-7 lg:px-8">
          <div>
            <div className="[&_*]:text-[var(--color-button-text)]">
              {brand}
            </div>

            <div className="mt-12 max-w-xl">
              <p className="text-xs font-semibold uppercase text-white/52">
                {config.eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                {config.sideTitle}
              </h1>
              <p className="mt-4 text-sm leading-7 text-white/68">
                {config.sideCopy}
              </p>
            </div>
          </div>

          <div className="mt-10 border-t border-white/12 pt-5">
            <div className="space-y-3">
              {config.sideItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 text-sm last:border-b-0 last:pb-0"
                >
                  <span className="text-white/68">{item}</span>
                  <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex flex-col">
          <header className="border-b border-[var(--color-border)] bg-[rgba(255,251,244,0.9)] px-5 py-4 sm:px-7">
            <div className="flex items-center justify-end gap-4">
              <Link
                to="/"
                className="text-sm font-medium text-[var(--color-muted-strong)]"
              >
                Volver al inicio
              </Link>
            </div>
          </header>

          <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-7">
            <div className="w-full max-w-[520px]">
              <div className="border-b border-[var(--color-border)] pb-6">
                <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">
                  {config.eyebrow}
                </p>
                <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
                  {config.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--color-muted-strong)]">
                  {config.description}
                </p>
              </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {formError && (
                    <div role="alert" className="rounded-md border border-[#f0c9c5] bg-[#fff3f1] p-3 text-sm text-[#9f261d]">
                      {formError}
                    </div>
                  )}
                  {(formMessage || searchParams.get("verified") === "1") && (
                    <div className="rounded-md border border-[#b9d8bf] bg-[#eef8ee] p-3 text-sm text-[#28633a]">
                      {formMessage || "Correo verificado. Ya podés iniciar sesión."}
                    </div>
                  )}
                  {pendingVerificationEmail && (
                    <button
                      type="button"
                      disabled={
                        isSubmitting ||
                        resendCooldown > 0 ||
                        verificationSendAttempts >= maxVerificationSendAttempts
                      }
                      onClick={() => void handleResendVerification()}
                      className="text-sm font-semibold text-[var(--color-ink)] underline-offset-4 hover:underline disabled:opacity-60"
                    >
                      {verificationSendAttempts >= maxVerificationSendAttempts
                        ? "Límite alcanzado. Esperá 30 minutos"
                        : resendCooldown > 0
                        ? `Podés reenviar en ${resendCooldown}s`
                        : "Reenviar correo de verificación"}
                    </button>
                  )}
                  {config.fields.map((field) => {
                    const autoComplete =
                      field.id === "firstName"
                        ? "given-name"
                        : field.id === "lastName"
                          ? "family-name"
                          : field.id === "email" && isLogin
                            ? "username"
                            : field.type === "password"
                              ? isLogin
                                ? "current-password"
                                : "new-password"
                              : field.type === "email"
                                ? "email"
                                : "organization";
                    const error = errors[field.id];

                    if (!isLogin && field.type === "password") {
                      return (
                        <div key={field.id}>
                          <PasswordRequirementField
                            id={field.id}
                            name={field.id}
                            label={field.label}
                            placeholder={field.placeholder}
                            autoComplete={autoComplete}
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? `${field.id}-error` : undefined}
                          />
                          {error && (
                            <p id={`${field.id}-error`} className="mt-1 text-xs text-[#b42318]">
                              {error}
                            </p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <label key={field.id} className="block">
                        <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
                          {field.label}
                        </span>
                        <input
                          id={field.id}
                          name={field.id}
                          type={field.type}
                          placeholder={field.placeholder}
                          autoComplete={autoComplete}
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? `${field.id}-error` : undefined}
                          className={`w-full rounded-md border bg-[rgba(255,251,244,0.88)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] ${
                            error
                              ? "border-[#b42318]"
                              : "border-[var(--color-border)]"
                          }`}
                        />
                        {error && (
                          <p id={`${field.id}-error`} className="mt-1 text-xs text-[#b42318]">
                            {error}
                          </p>
                        )}
                      </label>
                    );
                  })}

                  {isLogin && (
                    <div className="flex items-center justify-between gap-4 pt-1 text-sm">
                      <label className="flex items-center gap-2 text-[var(--color-muted-strong)]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
                        />
                        Recordarme
                      </label>
                      <Link
                        to="/recuperar-acceso"
                        className="font-medium text-[var(--color-ink)]"
                      >
                        Recuperar acceso
                      </Link>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[var(--color-ink)] px-5 py-3 text-sm font-medium text-[var(--color-button-text)] hover:bg-[var(--color-accent)] hover:text-[var(--color-button-text)]"
                  >
                    {isSubmitting ? "Procesando..." : config.submitLabel}
                  </button>
                </form>

              <div className="mt-6 border-t border-[var(--color-border)] pt-5 text-sm text-[var(--color-muted)]">
                {config.alternateLabel}{" "}
                <Link
                  to={config.alternateHref}
                  className="font-medium text-[var(--color-ink)]"
                >
                  {config.alternateCta}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { PageLayout } from "../../components/layout/PageLayout";
import backChevronIcon from "../../components/assets/icons/actions/back-chevron.svg";
import loginPasswordIcon from "../../components/assets/icons/auth/login-password.svg";
import loginUserIcon from "../../components/assets/icons/auth/login-user.svg";
import passwordEyeOffIcon from "../../components/assets/icons/auth/password-eye-off.svg";
import passwordEyeIcon from "../../components/assets/icons/auth/password-eye.svg";
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

function AuthFieldIcon({ fieldId }: { fieldId: string }) {
  const icon = fieldId === "password" ? loginPasswordIcon : loginUserIcon;
  const sizeClass = fieldId === "password" ? "h-[21px] w-[21px]" : "h-[22px] w-[22px]";

  return (
    <img
      src={icon}
      alt=""
      aria-hidden="true"
      className={`block ${sizeClass} opacity-62 transition duration-200 ease-out group-focus-within/auth-field:scale-110 group-focus-within/auth-field:opacity-90`}
    />
  );
}

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
  const [showLoginPassword, setShowLoginPassword] = useState(false);

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
      <div className="grid min-h-screen lg:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]">
        <aside className="dot-pattern-corner dot-pattern-bottom-left flex flex-col bg-[var(--color-ink)] px-5 py-5 text-[var(--color-button-text)] sm:px-7 lg:px-8">
          <div>
            <div className="[&_*]:text-[var(--color-button-text)]">
              {brand}
            </div>

            <div className="mt-8 max-w-lg">
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

          <div className="mt-8 border-t border-white/12 pt-5">
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

        <section className="relative flex min-w-0 flex-col overflow-hidden bg-[#fbfaf7]">
          <header className="relative z-10 flex justify-end px-5 py-5 sm:px-8">
            <Link
              to="/"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-muted-strong)] transition hover:text-[var(--color-ink)]"
            >
              <img
                src={backChevronIcon}
                alt=""
                aria-hidden="true"
                className="h-4 w-4 opacity-70 transition-transform duration-300 ease-out group-hover:-translate-x-1"
              />
              Volver al inicio
            </Link>
          </header>

          <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-8 pt-4 sm:px-7 lg:pb-12">
            <div className="w-full max-w-[590px] rounded-2xl border border-[rgba(32,24,54,0.11)] bg-white/90 px-8 py-7 shadow-[0_24px_70px_rgba(32,24,54,0.12)] backdrop-blur sm:px-14 sm:py-12 lg:px-16 lg:py-14 lg:-translate-y-2">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--color-ink)]">
                  {config.eyebrow}
                </p>
                <h2 className="mt-3 max-w-md text-3xl font-extrabold leading-tight sm:text-4xl">
                  {config.title}
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-[var(--color-muted-strong)]">
                  {config.description}
                </p>
              </div>

                <form onSubmit={handleSubmit} className="mt-7 space-y-4">
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
                    if (!isLogin && field.id === "lastName") return null;

                    if (!isLogin && field.id === "firstName") {
                      const lastNameField = config.fields.find((item) => item.id === "lastName");
                      const nameFields = lastNameField ? [field, lastNameField] : [field];

                      return (
                        <div key={field.id} className="grid gap-4 sm:grid-cols-2">
                          {nameFields.map((nameField) => {
                            const nameError = errors[nameField.id];
                            return (
                              <label key={nameField.id} className="block">
                                <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
                                  {nameField.label}
                                </span>
                                <input
                                  id={nameField.id}
                                  name={nameField.id}
                                  type={nameField.type}
                                  placeholder={nameField.placeholder}
                                  autoComplete={nameField.id === "firstName" ? "given-name" : "family-name"}
                                  aria-invalid={Boolean(nameError)}
                                  aria-describedby={nameError ? `${nameField.id}-error` : undefined}
                                  className={`h-12 w-full rounded-lg border bg-white/70 px-3 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-muted)] hover:border-[var(--color-accent)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(253,134,6,0.18)] ${
                                    nameError
                                      ? "border-[#b42318]"
                                      : "border-[var(--color-border)]"
                                  }`}
                                />
                                {nameError && (
                                  <p id={`${nameField.id}-error`} className="mt-1 text-xs text-[#b42318]">
                                    {nameError}
                                  </p>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      );
                    }

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
                        <span className="group/auth-field relative block">
                          <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[var(--color-muted)] transition duration-200 ease-out group-focus-within/auth-field:text-[var(--color-accent)]">
                            <AuthFieldIcon fieldId={field.id} />
                          </span>
                          <input
                            id={field.id}
                            name={field.id}
                            type={field.type === "password" && showLoginPassword ? "text" : field.type}
                            placeholder={field.placeholder}
                            autoComplete={autoComplete}
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? `${field.id}-error` : undefined}
                            className={`relative z-0 h-12 w-full rounded-lg border bg-white/70 py-3 pl-12 text-sm text-[var(--color-ink)] outline-none transition-all duration-200 ease-out placeholder:text-[var(--color-muted)] hover:border-[var(--color-accent)] focus:-translate-y-0.5 focus:border-[var(--color-accent)] focus:shadow-[0_14px_34px_rgba(253,134,6,0.13)] focus:ring-2 focus:ring-[rgba(253,134,6,0.18)] ${
                              field.type === "password" ? "pr-12" : ""
                            } ${
                              error
                                ? "border-[#b42318]"
                                : "border-[var(--color-border)]"
                            }`}
                          />
                          {field.type === "password" && (
                            <button
                              type="button"
                              onClick={() => setShowLoginPassword((current) => !current)}
                              aria-label={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                              className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-muted-strong)] transition hover:bg-[rgba(32,24,54,0.06)] hover:text-[var(--color-ink)] active:scale-95"
                            >
                              <img
                                key={showLoginPassword ? "eye-off" : "eye"}
                                src={showLoginPassword ? passwordEyeOffIcon : passwordEyeIcon}
                                alt=""
                                aria-hidden="true"
                                className="auth-icon-swap h-5 w-5 opacity-70"
                              />
                            </button>
                          )}
                        </span>
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
                      <label className="flex cursor-pointer items-center gap-2 text-[var(--color-muted-strong)]">
                        <input
                          name="rememberMe"
                          value="true"
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border-[var(--color-border)] accent-[var(--color-accent)]"
                        />
                        Recordarme
                      </label>
                      <Link
                        to="/recuperar-acceso"
                        className="font-semibold text-[var(--color-ink)]"
                      >
                        Recuperar acceso
                      </Link>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-3 inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-[var(--color-ink)] px-5 text-sm font-bold text-[var(--color-button-text)] shadow-[0_14px_30px_rgba(32,24,54,0.2)] transition hover:-translate-y-0.5 hover:bg-[var(--color-accent)] hover:text-[var(--color-button-text)]"
                  >
                    <span>{isSubmitting ? "Procesando..." : config.submitLabel}</span>
                    {!isSubmitting && <span aria-hidden="true">→</span>}
                  </button>
                </form>

              <div className="mt-6 border-t border-[var(--color-border)] pt-5 text-center text-sm text-[var(--color-muted)]">
                {config.alternateLabel}{" "}
                <Link
                  to={config.alternateHref}
                  className="font-bold text-[var(--color-ink)]"
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

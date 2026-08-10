import { type ChangeEvent, type InputHTMLAttributes, useState } from "react";

import passwordEyeOffIcon from "../assets/icons/auth/password-eye-off.svg";
import passwordEyeIcon from "../assets/icons/auth/password-eye.svg";

type PasswordRequirementFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "onChange" | "type"
> & {
  label: string;
  minLength?: number;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function PasswordRequirementField({
  label,
  minLength = 12,
  onChange,
  value,
  ...props
}: PasswordRequirementFieldProps) {
  const [internalValue, setInternalValue] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const currentValue = typeof value === "string" ? value : internalValue;
  const remaining = Math.max(0, minLength - currentValue.length);
  const isTooShort = currentValue.length > 0 && remaining > 0;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (value === undefined) {
      setInternalValue(event.target.value);
    }
    onChange?.(event);
  }

  return (
    <label className="relative grid min-w-0 gap-1.5 text-sm">
      <span className="flex items-center justify-between gap-2">
        <span className="font-semibold text-[var(--color-muted-strong)]">
          {label}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            remaining === 0
              ? "bg-[rgba(64,145,91,0.12)] text-[#347548]"
              : "bg-[rgba(253,134,6,0.12)] text-[var(--color-accent)]"
          }`}
        >
          Mín. {minLength} caracteres
        </span>
      </span>
      <span className="relative">
        <input
          {...props}
          type={isVisible ? "text" : "password"}
          value={value}
          minLength={minLength}
          onChange={handleChange}
          className={`w-full rounded-md border bg-[rgba(32,24,54,0.035)] px-3 py-2.5 pr-12 text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent)] focus:ring-2 ${
            isTooShort
              ? "border-[var(--color-accent)] focus:border-[var(--color-accent)] focus:ring-[rgba(253,134,6,0.16)]"
              : "border-[var(--color-border-strong)] focus:border-[var(--color-accent)] focus:ring-[rgba(253,134,6,0.2)]"
          }`}
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-muted-strong)] transition hover:bg-[rgba(32,24,54,0.06)] hover:text-[var(--color-ink)] active:scale-95"
        >
          <img
            key={isVisible ? "eye-off" : "eye"}
            src={isVisible ? passwordEyeOffIcon : passwordEyeIcon}
            alt=""
            aria-hidden="true"
            className="auth-icon-swap h-5 w-5 opacity-70"
          />
        </button>
      </span>
      <span
        className={`rounded-md border px-3 py-1.5 text-xs transition ${
          isTooShort
            ? "border-[rgba(253,134,6,0.28)] bg-[#fff3e5] text-[var(--color-ink)]"
            : "border-[var(--color-border)] bg-[rgba(32,24,54,0.035)] text-[var(--color-muted)]"
        }`}
      >
        {isTooShort
          ? `Faltan ${remaining} caracteres.`
          : `Mínimo ${minLength} caracteres.`}
      </span>
    </label>
  );
}

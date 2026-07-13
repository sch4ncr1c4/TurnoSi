type TimeInputProps = {
  ariaLabel: string;
  className?: string;
  onChange: (value: string) => void;
  value: string;
};

function formatTimeInput(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function normalizeTimeInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 3) return value;

  const hours = Math.min(Number(digits.slice(0, 2)) || 0, 23);
  const minutes = Math.min(Number(digits.slice(2, 4)) || 0, 59);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function TimeInput({
  ariaLabel,
  className = "",
  onChange,
  value
}: TimeInputProps) {
  return (
    <input
      aria-label={ariaLabel}
      className={`h-10 w-full min-w-0 rounded-md border border-[var(--color-border-strong)] bg-[rgba(255,251,244,0.74)] px-2 text-center font-mono text-sm leading-10 text-[var(--color-ink)] outline-none transition-colors duration-200 hover:border-[var(--color-ink)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(253,134,6,0.2)] xl:w-[104px] xl:min-w-[104px] ${className}`}
      inputMode="numeric"
      maxLength={5}
      onBlur={(event) => onChange(normalizeTimeInput(event.target.value))}
      onChange={(event) => onChange(formatTimeInput(event.target.value))}
      placeholder="09:00"
      pattern="[0-9]{2}:[0-9]{2}"
      type="text"
      value={value}
    />
  );
}

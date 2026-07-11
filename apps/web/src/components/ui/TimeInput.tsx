type TimeInputProps = {
  ariaLabel: string;
  className?: string;
  onChange: (value: string) => void;
  value: string;
};

export function TimeInput({
  ariaLabel,
  className = "",
  onChange,
  value
}: TimeInputProps) {
  return (
    <input
      aria-label={ariaLabel}
      className={`w-full min-w-0 rounded-md border border-[var(--color-border-strong)] bg-[rgba(255,251,244,0.74)] px-2 py-1.5 font-mono text-sm text-[var(--color-ink)] outline-none transition-colors duration-200 hover:border-[var(--color-ink)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(253,134,6,0.2)] xl:w-[104px] xl:min-w-[104px] ${className}`}
      onChange={(event) => onChange(event.target.value)}
      step={60}
      type="time"
      value={value}
    />
  );
}

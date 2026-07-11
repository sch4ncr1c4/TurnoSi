export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-page)] px-5">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.9)] p-6 shadow-[0_18px_50px_rgba(32,24,54,0.06)]">
        <div className="space-y-3">
          <div className="h-3 w-28 animate-pulse rounded-full bg-[rgba(32,24,54,0.14)]" />
          <div className="h-3 w-44 animate-pulse rounded-full bg-[rgba(32,24,54,0.1)]" />
          <div className="h-3 w-36 animate-pulse rounded-full bg-[rgba(32,24,54,0.08)]" />
        </div>
        <p className="mt-5 text-sm text-[var(--color-muted)]">
          Preparando la vista...
        </p>
      </div>
    </div>
  );
}

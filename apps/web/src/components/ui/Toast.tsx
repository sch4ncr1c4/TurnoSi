import { useEffect } from "react";

export function Toast({
  message,
  onDismiss
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 z-[70] max-w-sm rounded-lg border border-white/15 bg-[var(--color-ink)] px-4 py-3 text-sm font-medium text-white shadow-[0_16px_45px_rgba(32,24,54,0.3)] sm:bottom-5 sm:left-auto sm:right-5"
    >
      {message}
    </div>
  );
}

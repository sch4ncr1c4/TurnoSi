import type { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  return (
    <main className="page-shell min-h-screen w-full px-4 py-4 text-[var(--color-ink)] sm:px-6 sm:py-6">
      {children}
    </main>
  );
}


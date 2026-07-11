import type { ReactNode } from "react";

type PageLayoutProps = {
  children: ReactNode;
};

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--color-page)] text-[var(--color-ink)]">
      {children}
    </main>
  );
}

import type { ReactNode } from "react";

type PageLayoutProps = {
  children: ReactNode;
  className?: string;
};

export function PageLayout({ children, className = "" }: PageLayoutProps) {
  return (
    <main
      className={`flex min-h-screen flex-col bg-[var(--color-page)] text-[var(--color-ink)] ${className}`}
    >
      {children}
    </main>
  );
}

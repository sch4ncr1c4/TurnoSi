import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

const CARD_BASE =
  "min-w-0 rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.84)] shadow-[0_16px_44px_rgba(32,24,54,0.05)]";

export function Card({ children, className = "" }: CardProps) {
  return (
    <article className={`${CARD_BASE} ${className}`}>
      {children}
    </article>
  );
}

export function CardHeader({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-[var(--color-border)] px-4 py-4">
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

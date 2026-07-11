import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useSessionQuery } from "./auth.queries";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation();
  const session = useSessionQuery();

  if (session.isPending) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--color-ink)] px-5 text-white">
        <section className="w-full max-w-sm rounded-2xl border border-white/12 bg-white/8 p-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.24)] backdrop-blur">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--color-accent)] font-mono text-lg font-semibold">
            ✓
          </div>
          <h1 className="mt-4 text-xl font-semibold">Protegiendo tu cuenta</h1>
          <p className="mt-2 text-sm leading-6 text-white/64">
            Estamos verificando tu sesión antes de abrir el panel.
          </p>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-[auth-progress_1.1s_ease-in-out_infinite] rounded-full bg-[var(--color-accent)]" />
          </div>
        </section>
      </main>
    );
  }
  if (session.isError) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

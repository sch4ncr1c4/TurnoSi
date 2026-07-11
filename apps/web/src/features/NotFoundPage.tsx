import { Link } from "react-router-dom";

import { Brand } from "../components/brand/Brand";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-page)]">
      <header className="border-b border-[var(--color-border)] bg-[rgba(255,251,244,0.86)] px-5 py-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Brand boxed />
          <Link
            to="/"
            className="text-sm font-medium text-[var(--color-muted-strong)] hover:text-[var(--color-ink)]"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-16 text-center">
        <div className="max-w-md">
          <p className="font-mono text-6xl font-semibold text-[var(--color-accent)]">
            404
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-[var(--color-ink)]">
            Página no encontrada
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted-strong)]">
            La página que buscás no existe o fue movida. Chequeá la URL o volvé al inicio.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/"
              className="rounded-md bg-[var(--color-ink)] px-5 py-2.5 text-sm font-medium text-[var(--color-button-text)] hover:bg-[var(--color-accent)]"
            >
              Volver al inicio
            </Link>
            <Link
              to="/dashboard"
              className="rounded-md border border-[var(--color-border-strong)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] hover:bg-white/60"
            >
              Ir al dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

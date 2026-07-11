import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-page)] px-5 text-center">
          <div className="max-w-md">
            <h1 className="text-3xl font-semibold text-[var(--color-ink)]">
              Algo salió mal
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted-strong)]">
              Ocurrió un error inesperado. Podés intentar recargar la página o volver al inicio.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="rounded-md bg-[var(--color-ink)] px-5 py-2.5 text-sm font-medium text-[var(--color-button-text)] hover:bg-[var(--color-accent)]"
              >
                Reintentar
              </button>
              <a
                href="/"
                className="rounded-md border border-[var(--color-border-strong)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] hover:bg-white/60"
              >
                Volver al inicio
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

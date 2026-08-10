import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { PageLoader } from "../../components/layout/PageLoader";
import { useSessionQuery } from "./auth.queries";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation();
  const session = useSessionQuery();

  if (session.isPending) {
    return (
      <PageLoader
        title="Verificando sesión"
        description="Confirmando tu acceso antes de abrir el panel."
      />
    );
  }
  if (session.isError) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

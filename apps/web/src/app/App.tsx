import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Brand } from "../components/brand/Brand";
import { ErrorBoundary } from "../components/layout/ErrorBoundary";
import { PageShell } from "../components/layout/PageShell";
import { ROUTES } from "./routes";
import { AuthGuard } from "../features/auth/AuthGuard";

import { LandingPage } from "../features/landing/LandingPage";
import { AuthPage } from "../features/auth/AuthPage";
import { PasswordRecoveryPage } from "../features/auth/PasswordRecoveryPage";
import { PlansPage } from "../features/billing/PlansPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { PublicBookingPage } from "../features/booking/PublicBookingPage";
import { SuperAdminPage } from "../features/superadmin/SuperAdminPage";
import { NotFoundPage } from "../features/NotFoundPage";

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route
            path={ROUTES.home}
            element={
              <PageShell>
                <LandingPage brand={<Brand boxed />} />
              </PageShell>
            }
          />
          <Route
            path={ROUTES.login}
            element={<AuthPage brand={<Brand asLink boxed />} route="login" />}
          />
          <Route
            path={ROUTES.register}
            element={
              <AuthPage brand={<Brand asLink boxed />} route="register" />
            }
          />
          <Route
            path={ROUTES.recoverPassword}
            element={<PasswordRecoveryPage brand={<Brand asLink boxed />} />}
          />
          <Route path={ROUTES.superadmin} element={<SuperAdminPage />} />
          <Route
            path={ROUTES.dashboard}
            element={
              <AuthGuard>
                <DashboardPage brand={<Brand boxed />} />
              </AuthGuard>
            }
          />
          <Route
            path={ROUTES.plans}
            element={
              <AuthGuard>
                <PlansPage brand={<Brand boxed />} />
              </AuthGuard>
            }
          />
          <Route
            path={ROUTES.booking}
            element={<PublicBookingPage brand={<Brand asLink />} />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

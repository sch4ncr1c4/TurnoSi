import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Brand } from "../components/brand/Brand";
import { ErrorBoundary } from "../components/layout/ErrorBoundary";
import { ROUTES } from "./routes";
import { loadAuthPage, loadDashboardPage } from "./route-loaders";
import { AuthGuard } from "../features/auth/AuthGuard";

import { LandingPage } from "../features/landing/LandingPage";
import { NotFoundPage } from "../features/NotFoundPage";

const loadPasswordRecoveryPage = () => import("../features/auth/PasswordRecoveryPage");

const AuthPage = lazy(() => loadAuthPage().then((module) => ({ default: module.AuthPage })));
const PasswordRecoveryPage = lazy(() =>
  loadPasswordRecoveryPage().then((module) => ({ default: module.PasswordRecoveryPage }))
);
const PlansPage = lazy(() =>
  import("../features/billing/PlansPage").then((module) => ({ default: module.PlansPage }))
);
const DashboardPage = lazy(() =>
  loadDashboardPage().then((module) => ({ default: module.DashboardPage }))
);
const PublicBookingPage = lazy(() =>
  import("../features/booking/PublicBookingPage").then((module) => ({ default: module.PublicBookingPage }))
);
const SuperAdminPage = lazy(() =>
  import("../features/superadmin/SuperAdminPage").then((module) => ({ default: module.SuperAdminPage }))
);

function RouteFallback() {
  return <div className="min-h-screen bg-[var(--color-page)]" aria-hidden="true" />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route
          path={ROUTES.home}
          element={<LandingPage />}
        />
        <Route
          path={ROUTES.login}
          element={<AuthPage brand={<Brand asLink boxed variant="turnoar" />} route="login" />}
        />
        <Route
          path={ROUTES.register}
          element={<AuthPage brand={<Brand asLink boxed variant="turnoar" />} route="register" />}
        />
        <Route
          path={ROUTES.recoverPassword}
          element={<PasswordRecoveryPage brand={<Brand asLink boxed variant="turnoar" />} />}
        />
        <Route path={ROUTES.superadmin} element={<SuperAdminPage />} />
        <Route
          path={ROUTES.dashboard}
          element={
            <AuthGuard>
              <DashboardPage brand={<Brand boxed variant="turnoar" />} />
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
    </Suspense>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

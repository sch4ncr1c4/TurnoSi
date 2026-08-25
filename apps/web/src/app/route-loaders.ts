export const loadAuthPage = () => import("../features/auth/AuthPage");

export const loadDashboardPage = () => import("../features/dashboard/DashboardPage");

export function preloadAuthPage() {
  void loadAuthPage();
}

export function preloadDashboardPage() {
  void loadDashboardPage();
}

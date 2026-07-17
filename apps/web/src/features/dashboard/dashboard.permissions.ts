import type { AuthOrganization } from "../auth/auth.types";
import type { DashboardView } from "./dashboard.types";

export type DashboardRole = NonNullable<AuthOrganization["role"]>;

const roleViews: Record<DashboardRole, DashboardView[]> = {
  owner: ["summary", "agenda", "customers", "team", "availability", "settings"],
  admin: ["summary", "agenda", "customers", "team", "availability", "settings"],
  member: ["summary", "agenda"]
};

export function getAllowedDashboardViews(role?: DashboardRole): DashboardView[] {
  return role ? roleViews[role] : ["summary"];
}

export function canAccessDashboardView(
  role: DashboardRole | undefined,
  view: DashboardView
) {
  return getAllowedDashboardViews(role).includes(view);
}

export function canOpenBillingPlans(role?: DashboardRole) {
  return role === "owner";
}

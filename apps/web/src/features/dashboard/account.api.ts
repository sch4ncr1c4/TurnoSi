import { apiRequest } from "../../lib/api";
import type { AuthUser } from "../auth/auth.types";

export function updateAccountProfile(data: {
  firstName: string;
  lastName: string;
  email: string;
}) {
  return apiRequest<{ success: true; data: AuthUser }>("/api/v1/users/me/profile", {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export function changeAccountPassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  return apiRequest("/api/v1/users/me/password", {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export function markOnboardingGuideSeen() {
  return apiRequest<{
    success: true;
    data: { onboardingGuideSeen: true };
  }>("/api/v1/users/me/onboarding-guide-seen", { method: "POST" });
}

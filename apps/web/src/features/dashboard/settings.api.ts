import { apiRequest } from "../../lib/api";
import type {
  OrganizationSettings,
  OrganizationSettingsInput
} from "./settings.types";

export async function getOrganizationSettings() {
  const response = await apiRequest<{ success: true; data: OrganizationSettings }>(
    "/api/v1/organizations/current/settings"
  );
  return response.data;
}

export function updateOrganizationSettings(data: OrganizationSettingsInput) {
  return apiRequest<{ success: true; data: { onboardingCompleted: true } }>(
    "/api/v1/organizations/current/settings",
    { method: "PATCH", body: JSON.stringify(data) }
  );
}

export function uploadOrganizationLogo(file: File) {
  return apiRequest<{ success: true; data: { uploaded: true } }>(
    "/api/v1/organizations/current/logo",
    {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file
    }
  );
}

export function uploadOrganizationGalleryImage(slot: 0 | 1, file: File) {
  return apiRequest<{ success: true; data: { uploaded: true } }>(
    `/api/v1/organizations/current/gallery/${slot}`,
    {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file
    }
  );
}

export function deleteOrganizationGalleryImage(slot: 0 | 1) {
  return apiRequest<{ success: true; data: { deleted: true } }>(
    `/api/v1/organizations/current/gallery/${slot}`,
    { method: "DELETE" }
  );
}

export function completeOnboarding() {
  return apiRequest<{ success: true; data: { onboardingCompleted: true } }>(
    "/api/v1/organizations/current/complete-onboarding",
    { method: "POST" }
  );
}

export function deleteCurrentOrganization(password: string) {
  return apiRequest<{ success: true; data: { deleted: true } }>(
    "/api/v1/organizations/current",
    {
      method: "DELETE",
      body: JSON.stringify({ password })
    }
  );
}

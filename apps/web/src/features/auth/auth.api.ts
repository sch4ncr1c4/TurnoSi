import { apiRequest } from "../../lib/api";
import type { LoginFormData, RegisterFormData } from "./auth.schemas";
import type { AuthResult } from "./auth.types";

export function login(data: LoginFormData) {
  return apiRequest<AuthResult>(
    "/api/v1/auth/login",
    { method: "POST", body: JSON.stringify(data) },
    false
  );
}

export function register(data: RegisterFormData) {
  return apiRequest<
    AuthResult & {
      data: AuthResult["data"] & {
        verificationRequired: boolean;
      };
    }
  >(
    "/api/v1/auth/register",
    { method: "POST", body: JSON.stringify(data) },
    false
  );
}

export function getCurrentSession() {
  return apiRequest<AuthResult>("/api/v1/auth/me");
}

export function logout() {
  return apiRequest<{ success: true; data: { loggedOut: true } }>(
    "/api/v1/auth/logout",
    { method: "POST" },
    false
  );
}

export function requestPasswordReset(email: string) {
  return apiRequest<{
    success: true;
    data: { sent: true };
  }>(
    "/api/v1/auth/request-password-reset",
    { method: "POST", body: JSON.stringify({ email }) },
    false
  );
}

export function resetPassword(email: string, code: string, newPassword: string) {
  return apiRequest<{ success: true; data: { reset: true } }>(
    "/api/v1/auth/reset-password",
    {
      method: "POST",
      body: JSON.stringify({ email, code, newPassword })
    },
    false
  );
}

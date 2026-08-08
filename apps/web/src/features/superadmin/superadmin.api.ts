import { apiRequest } from "../../lib/api";

type ApiResponse<T> = {
  success: true;
  data: T;
};

export type SuperadminSession = {
  email: string;
};

export type SuperadminOverview = {
  organizations: number;
  ownerAccounts: number;
  activeSubscriptions: number;
};

export type SuperadminOrganization = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  location: string;
  createdAt: string;
  onboardingCompletedAt: string | null;
  owner: {
    name: string;
    email: string;
  };
  subscription: {
    plan: "trial" | "initial" | "professional" | "operation";
    status: "pending" | "authorized" | "paused" | "canceled";
    mercadoPagoPreapprovalId: string | null;
    trialEndsAt: string | null;
    paymentGraceEndsAt: string | null;
    nextPaymentAt: string | null;
    payerEmail: string | null;
    lastPaymentStatus:
      | "pending"
      | "approved"
      | "rejected"
      | "cancelled"
      | "refunded"
      | "charged_back"
      | "unknown"
      | null;
  } | null;
  counts: {
    branches: number;
    memberships: number;
    services: number;
  };
};

export type SuperadminOrganizationDetail = SuperadminOrganization & {
  phone: string | null;
  whatsapp: string | null;
  publicEmail: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  description: string | null;
  updatedAt: string;
  branches: Array<{
    id: string;
    name: string;
    city: string | null;
    province: string | null;
    isMain: boolean;
    isActive: boolean;
  }>;
  memberships: Array<{
    role: "owner" | "admin" | "member";
    bookingsEnabled: boolean;
    visibleInPublicBooking: boolean;
    hourlyCapacity: number;
    user: {
      id: string;
      email: string;
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      emailVerifiedAt: string | null;
    };
  }>;
  services: Array<{
    id: string;
    name: string;
    category: string | null;
    durationMinutes: number;
    isActive: boolean;
    isOnlineBookable: boolean;
  }>;
  subscriptionPayments: Array<{
    id: string;
    status: string;
    amountCents: number | null;
    currencyId: string | null;
    paidAt: string | null;
    createdAt: string;
  }>;
  _count: {
    branches: number;
    customers: number;
    memberships: number;
    services: number;
  };
};

export type SuperadminSubscriptionActionPayload = {
  action: "grant" | "extend" | "pause" | "cancel";
  plan?: "trial" | "initial" | "professional" | "operation";
  extensionDays?: number;
  reason: string;
};

export function superadminLogin(email: string, password: string) {
  return apiRequest<ApiResponse<SuperadminSession>>("/api/v1/superadmin/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function superadminLogout() {
  return apiRequest<ApiResponse<{ loggedOut: true }>>("/api/v1/superadmin/logout", {
    method: "POST"
  });
}

export function getSuperadminSession() {
  return apiRequest<ApiResponse<SuperadminSession>>(
    "/api/v1/superadmin/me",
    {},
    false
  );
}

export function getSuperadminOverview() {
  return apiRequest<ApiResponse<SuperadminOverview>>("/api/v1/superadmin/overview");
}

export function getSuperadminOrganizations(search: string) {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<ApiResponse<SuperadminOrganization[]>>(
    `/api/v1/superadmin/organizations${suffix}`
  );
}

export function getSuperadminOrganization(id: string) {
  return apiRequest<ApiResponse<SuperadminOrganizationDetail>>(
    `/api/v1/superadmin/organizations/${id}`
  );
}

export function deleteSuperadminOrganization(id: string) {
  return apiRequest<ApiResponse<{ deleted: true; deletedUsers: number }>>(
    `/api/v1/superadmin/organizations/${id}`,
    { method: "DELETE" }
  );
}

export function updateSuperadminSubscription(
  id: string,
  payload: SuperadminSubscriptionActionPayload
) {
  return apiRequest<ApiResponse<SuperadminOrganizationDetail["subscription"]>>(
    `/api/v1/superadmin/organizations/${id}/subscription`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    }
  );
}

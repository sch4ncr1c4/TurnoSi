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
  users: number;
  appointments: number;
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
    trialEndsAt: string | null;
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
    appointments: number;
    branches: number;
    memberships: number;
    services: number;
  };
  lastAppointmentAt: string | null;
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
  appointments: Array<{
    id: string;
    title: string;
    startsAt: string;
    status: string;
    customer: { fullName: string };
    service: { name: string };
    branch: { name: string } | null;
    assignedUser: { firstName: string | null; lastName: string | null } | null;
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
    appointments: number;
    branches: number;
    customers: number;
    memberships: number;
    services: number;
  };
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

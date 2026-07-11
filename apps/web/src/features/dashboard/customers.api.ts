import { apiRequest } from "../../lib/api";

export type Customer = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  noShowCount: number;
  blockedAt: string | null;
  blockedReason: string | null;
};

type CustomerResponse = {
  success: true;
  data: {
    data: Customer[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

export async function getCustomers(search: string, status: string, page: number) {
  const params = new URLSearchParams({
    limit: "20",
    page: String(page),
    status
  });
  if (search) params.set("search", search);
  const response = await apiRequest<CustomerResponse>(
    `/api/v1/customers?${params}`
  );
  return response.data;
}

export function blockCustomer(customerId: string, reason: string) {
  return apiRequest(`/api/v1/customers/${customerId}/block`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export function unblockCustomer(customerId: string) {
  return apiRequest(`/api/v1/customers/${customerId}/unblock`, {
    method: "POST"
  });
}

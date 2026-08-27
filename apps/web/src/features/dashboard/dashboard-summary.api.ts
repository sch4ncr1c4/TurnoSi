import { ApiError, apiRequest, getApiUrl } from "../../lib/api";

export type DashboardSummaryPeriod = "7d" | "30d" | "current_month" | "previous_month";
export type DashboardSummary = {
  period: DashboardSummaryPeriod;
  metrics: {
    incomeCents: number;
    expenseCents: number;
    netIncomeCents: number;
    totalAppointments: number;
    completedAppointments: number;
    averageTicketCents: number;
    occupancyPercent: number;
    cancellationRatePercent: number;
    noShowRatePercent: number;
    confirmedAppointments: number;
    depositedAppointments: number;
    depositIncomeCents: number;
    pendingCollectionCents: number;
    pendingAppointments: number;
    canceledAppointments: number;
    noShowAppointments: number;
    changes: {
      incomePercent: number | null;
      expensePercent: number | null;
      netIncomePercent: number | null;
      completedPercent: number | null;
      averageTicketPercent: number | null;
      occupancyPercent: number | null;
      cancellationRatePercent: number | null;
      noShowRatePercent: number | null;
    };
  };
  today: {
    appointments: number;
    estimatedIncomeCents: number;
    expenseCents: number;
    netIncomeCents: number;
    confirmed: number;
    completed: number;
    deposited: number;
    pending: number;
    canceled: number;
    noShow: number;
    paymentMethods: Array<{ amountCents: number; method: string }>;
    movements: Array<{ amountCents: number; concept: string; description: string; kind: "income" | "expense"; label: string; method: string; sortAt: string; time: string }>;
    upcoming: Array<{
      id: string;
      time: string;
      client: string;
      service: string;
      professional: string;
      status: string;
      paymentStatus: string;
      paymentMethod: string;
      depositAmountCents: number | null;
    }>;
  };
  chart: Array<{ date: string; incomeCents: number; expenseCents: number }>;
  services: Array<{ id: string; name: string; appointments: number; incomeCents: number; averageTicketCents: number; incomeSharePercent: number }>;
  team: Array<{ id: string; name: string; completedAppointments: number; incomeCents: number; averageTicketCents: number; occupancyPercent: number }>;
};

export type DashboardExpense = {
  id: string;
  description: string;
  amountCents: number;
  category: string;
  paymentMethod: string | null;
  occurredOn: string;
  createdAt: string;
};

export async function getDashboardSummary(period: DashboardSummaryPeriod) {
  const response = await apiRequest<{ success: true; data: DashboardSummary }>(`/api/v1/dashboard/summary?period=${period}`);
  return response.data;
}

export function createDashboardExpense(input: { description: string; amountCents: number; category: string; paymentMethod: string; occurredOn: string }) {
  return apiRequest("/api/v1/dashboard/expenses", { method: "POST", body: JSON.stringify(input) });
}

export async function getDashboardExpenses(period: DashboardSummaryPeriod) {
  const response = await apiRequest<{ success: true; data: DashboardExpense[] }>(
    `/api/v1/dashboard/expenses?period=${period}`
  );
  return response.data;
}

export function deleteDashboardExpense(expenseId: string) {
  return apiRequest(`/api/v1/dashboard/expenses/${expenseId}`, { method: "DELETE" });
}

export async function getDailyClosingPdf(date: string, retry = true) {
  const path = `/api/v1/dashboard/daily-closing.pdf?date=${encodeURIComponent(date)}`;
  let response = await fetch(getApiUrl(path), { credentials: "include" });

  if (response.status === 401 && retry) {
    const refreshed = await fetch(getApiUrl("/api/v1/auth/refresh"), {
      credentials: "include",
      method: "POST"
    });
    if (refreshed.ok) response = await fetch(getApiUrl(path), { credentials: "include" });
  }

  if (!response.ok) {
    throw new ApiError("No se pudo generar el cierre de caja", "PDF_FAILED", response.status);
  }

  return response.blob();
}

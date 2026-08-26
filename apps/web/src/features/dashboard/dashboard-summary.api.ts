import { apiRequest } from "../../lib/api";

export type DashboardSummaryPeriod = "7d" | "30d" | "current_month" | "previous_month";
export type DashboardSummary = {
  period: DashboardSummaryPeriod;
  metrics: { incomeCents: number; expenseCents: number; netIncomeCents: number; completedAppointments: number; averageTicketCents: number; occupancyPercent: number; confirmedAppointments: number; depositedAppointments: number; pendingAppointments: number; canceledAppointments: number; noShowAppointments: number; changes: { incomePercent: number | null; expensePercent: number | null; completedPercent: number | null } };
  today: { appointments: number; estimatedIncomeCents: number; confirmed: number; deposited: number; pending: number; canceled: number };
  chart: Array<{ date: string; incomeCents: number; expenseCents: number }>;
  services: Array<{ id: string; name: string; appointments: number; incomeCents: number; incomeSharePercent: number }>;
  team: Array<{ id: string; name: string; completedAppointments: number; incomeCents: number; occupancyPercent: number }>;
};

export async function getDashboardSummary(period: DashboardSummaryPeriod) {
  const response = await apiRequest<{ success: true; data: DashboardSummary }>(`/api/v1/dashboard/summary?period=${period}`);
  return response.data;
}

export function createDashboardExpense(input: { description: string; amountCents: number; category: string; occurredOn: string }) {
  return apiRequest("/api/v1/dashboard/expenses", { method: "POST", body: JSON.stringify(input) });
}

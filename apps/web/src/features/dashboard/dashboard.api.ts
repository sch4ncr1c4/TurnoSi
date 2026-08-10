import { format } from "date-fns";

import { apiRequest } from "../../lib/api";
import type { DashboardAppointment } from "./dashboard.data";
import type { AppointmentStatusLabel } from "./dashboard.constants";

const statusLabels: Record<string, AppointmentStatusLabel> = {
  pending: "En espera",
  confirmed: "Confirmado",
  completed: "Asistido",
  canceled: "Cancelado",
  no_show: "No asistió"
};

const statusValues: Record<AppointmentStatusLabel, string> = {
  "En espera": "pending",
  Confirmado: "confirmed",
  Pagado: "confirmed",
  Asistido: "completed",
  Cancelado: "canceled",
  "No asistió": "no_show"
};

type DashboardAppointmentResponse = {
  id: string;
  startsAt: string;
  createdAt: string;
  service: string;
  client: string;
  assignee: string;
  status: string;
  channel: string;
  depositPayment: {
    status: string;
    amountCents: number;
    paidAt: string | null;
  } | null;
};

function mapDashboardAppointment(
  appointment: DashboardAppointmentResponse
): DashboardAppointment {
  const startsAt = new Date(appointment.startsAt);
  return {
    id: appointment.id,
    startsAt: appointment.startsAt,
    createdAt: appointment.createdAt,
    day: format(startsAt, "yyyy-MM-dd"),
    time: format(startsAt, "HH:mm"),
    service: appointment.service,
    client: appointment.client,
    assignee: appointment.assignee,
    status: statusLabels[appointment.status] ?? "En espera",
    channel: appointment.channel,
    depositPayment: appointment.depositPayment,
    attended: appointment.status === "completed"
  };
}

export async function getDashboardAppointments(from: Date, to: Date) {
  const response = await apiRequest<{
    success: true;
    data: DashboardAppointmentResponse[];
  }>(`/api/v1/calendar/appointments?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);

  return response.data.map(mapDashboardAppointment);
}

export async function getRecentDashboardReservations(since: Date) {
  const response = await apiRequest<{
    success: true;
    data: DashboardAppointmentResponse[];
  }>(`/api/v1/calendar/appointments/recent?since=${encodeURIComponent(since.toISOString())}`);

  return response.data.map(mapDashboardAppointment);
}

export function updateDashboardAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatusLabel
) {
  return apiRequest(`/api/v1/calendar/appointments/${appointmentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: statusValues[status] })
  });
}

export type ManualAppointmentPayload = {
  serviceId: string;
  branchId?: string;
  assigneeId?: string;
  startsAt: string;
  customerName: string;
  phone: string;
  email?: string;
  depositPaid: boolean;
  notes?: string;
};

export function createManualDashboardAppointment(data: ManualAppointmentPayload) {
  return apiRequest<{ success: true; data: { id: string; startsAt: string } }>(
    "/api/v1/calendar/appointments/manual",
    {
      method: "POST",
      body: JSON.stringify(data)
    }
  );
}

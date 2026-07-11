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

export async function getDashboardAppointments(from: Date, to: Date) {
  const response = await apiRequest<{
    success: true;
    data: {
      id: string;
      startsAt: string;
      service: string;
      client: string;
      assignee: string;
      status: string;
      channel: string;
    }[];
  }>(`/api/v1/calendar/appointments?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);

  return response.data.map((appointment): DashboardAppointment => {
    const startsAt = new Date(appointment.startsAt);
    return {
      id: appointment.id,
      startsAt: appointment.startsAt,
      day: format(startsAt, "yyyy-MM-dd"),
      time: format(startsAt, "HH:mm"),
      service: appointment.service,
      client: appointment.client,
      assignee: appointment.assignee,
      status: statusLabels[appointment.status] ?? "En espera",
      channel: appointment.channel,
      attended: appointment.status === "completed"
    };
  });
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

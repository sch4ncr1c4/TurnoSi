import { format } from "date-fns";

import { apiRequest } from "../../lib/api";
import type { PublicSlotsData } from "../booking/booking.api";
import type { DashboardAppointment } from "./dashboard.data";
import type { AppointmentStatusLabel } from "./dashboard.constants";

const statusLabels: Record<string, AppointmentStatusLabel> = {
  pending: "En espera",
  confirmed: "Confirmado",
  paid: "Pagado",
  completed: "Asistido",
  canceled: "Cancelado",
  no_show: "No asistió"
};

const statusValues: Record<AppointmentStatusLabel, string> = {
  "En espera": "pending",
  Confirmado: "confirmed",
  Señado: "confirmed",
  Pagado: "paid",
  Asistido: "completed",
  Cancelado: "canceled",
  "No asistió": "no_show"
};

type DashboardAppointmentResponse = {
  id: string;
  serviceId: string;
  branchId: string;
  assigneeId: string | null;
  startsAt: string;
  createdAt: string;
  confirmedByBusinessAt: string | null;
  service: string;
  client: string;
  customerPhone: string | null;
  assignee: string;
  status: string;
  channel: string;
  depositPayment: {
    status: string;
    amountCents: number;
    method: string | null;
    paidAt: string | null;
  } | null;
};

function mapDashboardAppointment(
  appointment: DashboardAppointmentResponse
): DashboardAppointment {
  const startsAt = new Date(appointment.startsAt);
  return {
    id: appointment.id,
    serviceId: appointment.serviceId,
    branchId: appointment.branchId,
    assigneeId: appointment.assigneeId,
    startsAt: appointment.startsAt,
    createdAt: appointment.createdAt,
    confirmedByBusinessAt: appointment.confirmedByBusinessAt,
    day: format(startsAt, "yyyy-MM-dd"),
    time: format(startsAt, "HH:mm"),
    service: appointment.service,
    client: appointment.client,
    customerPhone: appointment.customerPhone,
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

export type DashboardCalendarIndicator = {
  date: string;
  count: number;
};

export async function getDashboardAppointmentIndicators(from: Date, to: Date) {
  const response = await apiRequest<{
    success: true;
    data: DashboardCalendarIndicator[];
  }>(
    `/api/v1/calendar/appointments/indicators?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
  );

  return response.data;
}

export type DashboardAppointmentsPageParams = {
  day?: string;
  from: Date;
  limit: number;
  offset?: number;
  search?: string;
  status?: "pending" | "confirmed" | "paid" | "paid_deposit" | "completed" | "canceled" | "no_show";
  to: Date;
};

export async function getDashboardAppointmentsPage({
  day,
  from,
  limit,
  offset = 0,
  search,
  status,
  to
}: DashboardAppointmentsPageParams) {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    limit: String(limit),
    offset: String(offset)
  });
  if (day) params.set("day", day);
  if (search?.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);

  const response = await apiRequest<{
    success: true;
    data: {
      items: DashboardAppointmentResponse[];
      total: number;
      limit: number;
      offset: number;
    };
  }>(`/api/v1/calendar/appointments?${params.toString()}`);

  return {
    ...response.data,
    items: response.data.items.map(mapDashboardAppointment)
  };
}

export async function getRecentDashboardReservations(since: Date) {
  const response = await apiRequest<{
    success: true;
    data: DashboardAppointmentResponse[];
  }>(`/api/v1/calendar/appointments/recent?since=${encodeURIComponent(since.toISOString())}`);

  return response.data.map(mapDashboardAppointment);
}

export async function getReservationNotificationState() {
  const response = await apiRequest<{
    success: true;
    data: { seenUntil: string | null };
  }>("/api/v1/calendar/notifications/reservations");

  return response.data.seenUntil ? Date.parse(response.data.seenUntil) : 0;
}

export async function updateReservationNotificationState(seenUntil: Date) {
  const response = await apiRequest<{
    success: true;
    data: { seenUntil: string };
  }>("/api/v1/calendar/notifications/reservations", {
    method: "PUT",
    body: JSON.stringify({ seenUntil: seenUntil.toISOString() })
  });

  return Date.parse(response.data.seenUntil);
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

export type DepositPaymentMethod = "cash" | "bank_transfer" | "other";

export function markDashboardAppointmentDepositPaid(
  appointmentId: string,
  payload?: { amountCents?: number; method?: DepositPaymentMethod }
) {
  return apiRequest<{
    success: true;
    data: {
      status: "confirmed";
      depositPayment: {
        status: string;
        amountCents: number;
        method: string | null;
        paidAt: string | null;
      };
    };
  }>(`/api/v1/calendar/appointments/${appointmentId}/deposit-payment`, {
    method: "PATCH",
    body: JSON.stringify(payload ?? {})
  });
}

export function clearDashboardAppointmentDepositPayment(appointmentId: string) {
  return apiRequest<{
    success: true;
    data: { depositPayment: null };
  }>(`/api/v1/calendar/appointments/${appointmentId}/deposit-payment`, {
    method: "DELETE",
    body: JSON.stringify({ reason: "manual_correction" })
  });
}

export function rescheduleDashboardAppointment(
  appointmentId: string,
  startsAt: string
) {
  return apiRequest<{
    success: true;
    data: { startsAt: string; endsAt: string };
  }>(`/api/v1/calendar/appointments/${appointmentId}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify({ startsAt })
  });
}

export async function getDashboardAppointmentRescheduleSlots(
  appointmentId: string
) {
  const response = await apiRequest<{ success: true; data: PublicSlotsData }>(
    `/api/v1/calendar/appointments/${appointmentId}/reschedule-slots`
  );

  return {
    ...response.data,
    days: response.data.days.filter((day) => day.slots.length > 0)
  };
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

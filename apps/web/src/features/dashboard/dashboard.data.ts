export const dashboardSections = [
  { label: "Resumen", href: "/dashboard" },
  { label: "Agenda", href: "#today" },
  { label: "Clientes", href: "#customers" },
  { label: "Equipo", href: "#team" },
  { label: "Disponibilidad", href: "#availability" },
  { label: "Configuración", href: "#settings" }
];

export type AppointmentStatus =
  | "Confirmado"
  | "En espera"
  | "Señado"
  | "Pagado"
  | "Asistido"
  | "Cancelado"
  | "No asistió";

export type DashboardAppointment = {
  id: string;
  serviceId?: string;
  branchId?: string;
  assigneeId?: string | null;
  startsAt?: string;
  createdAt?: string;
  day?: string;
  time: string;
  service: string;
  client: string;
  customerPhone?: string | null;
  assignee: string;
  status: AppointmentStatus;
  channel: string;
  depositPayment?: {
    status: string;
    amountCents: number;
    method: string | null;
    paidAt: string | null;
  } | null;
  attended?: boolean;
};

export function formatDepositAmount(amountCents: number) {
  return new Intl.NumberFormat("es-AR", {
    currency: "ARS",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(amountCents / 100);
}

export function getDepositPaymentLabel(appointment: DashboardAppointment) {
  const deposit = appointment.depositPayment;
  if (!deposit) return "";
  const amount = formatDepositAmount(deposit.amountCents);
  const methodLabel =
    deposit.method === "mercadopago"
      ? "Mercado Pago"
      : deposit.method === "cash"
        ? "Efectivo"
        : deposit.method === "bank_transfer"
          ? "Transferencia"
          : deposit.method === "other"
            ? "Otro"
            : "";
  const suffix = methodLabel ? ` · ${methodLabel}` : "";
  if (deposit.status === "approved") return `Seña pagada · ${amount}${suffix}`;
  if (deposit.status === "pending") return `Seña pendiente · ${amount}`;
  if (deposit.status === "cancelled") return `Seña vencida · ${amount}`;
  if (deposit.status === "rejected") return `Seña rechazada · ${amount}`;
  return `Seña sin confirmar · ${amount}`;
}

export function getDepositPaymentBadgeClassName(appointment: DashboardAppointment) {
  const status = appointment.depositPayment?.status;
  if (status === "approved") return "dashboard-deposit-badge dashboard-deposit-badge-paid";
  if (status === "pending") return "dashboard-deposit-badge dashboard-deposit-badge-pending";
  if (status === "rejected" || status === "cancelled") {
    return "dashboard-deposit-badge dashboard-deposit-badge-problem";
  }
  return "dashboard-deposit-badge";
}

export const weeklyAvailability: WeeklyAvailabilityDay[] = [
  {
    day: "Lunes",
    shortDay: "L",
    enabled: false,
    tone: "purple",
    slots: [],
    break: null,
    status: "Inactivo"
  },
  {
    day: "Martes",
    shortDay: "M",
    enabled: false,
    tone: "blue",
    slots: [],
    break: null,
    status: "Inactivo"
  },
  {
    day: "Miércoles",
    shortDay: "X",
    enabled: false,
    tone: "green",
    slots: [],
    break: null,
    status: "Inactivo"
  },
  {
    day: "Jueves",
    shortDay: "J",
    enabled: false,
    tone: "orange",
    slots: [],
    break: null,
    status: "Inactivo"
  },
  {
    day: "Viernes",
    shortDay: "V",
    enabled: false,
    tone: "yellow",
    slots: [],
    break: null,
    status: "Inactivo"
  },
  {
    day: "Sábado",
    shortDay: "S",
    enabled: false,
    tone: "purple",
    slots: [],
    break: null,
    status: "Inactivo"
  },
  {
    day: "Domingo",
    shortDay: "D",
    enabled: false,
    tone: "red",
    slots: [],
    break: null,
    status: "Inactivo"
  }
];

export const availabilityInsights = [
  { label: "Horarios", value: "Configurados en PostgreSQL", tone: "purple" },
  { label: "Excepciones", value: "Aplicadas automáticamente", tone: "blue" },
  { label: "Servicios", value: "Con cupos y recursos", tone: "orange" },
  { label: "Reservas", value: "Actualización en tiempo real", tone: "green" }
] as const;

export const agendaHours = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00"
] as const;
import type { WeeklyAvailabilityDay } from "./availability.types";

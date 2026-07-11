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
  | "Pagado"
  | "Asistido"
  | "Cancelado"
  | "No asistió";

export type DashboardAppointment = {
  id: string;
  startsAt?: string;
  day?: string;
  time: string;
  service: string;
  client: string;
  assignee: string;
  status: AppointmentStatus;
  channel: string;
  attended?: boolean;
};

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

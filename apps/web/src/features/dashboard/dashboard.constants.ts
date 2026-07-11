import { MOTION_CLASS } from "../../components/ui";
import type { DashboardAppointment } from "./dashboard.data";

export type ScheduleView = "day" | "week" | "month";

export type AppointmentStatusLabel =
  | "En espera"
  | "Confirmado"
  | "Pagado"
  | "Asistido"
  | "Cancelado"
  | "No asistió";

export type AppointmentFilter =
  | "all"
  | "pending"
  | "confirmed"
  | "attended"
  | "cancelled"
  | "noShow";

export type StatusChangeDraft = {
  appointment: DashboardAppointment;
  currentStatus: AppointmentStatusLabel;
  nextStatus: AppointmentStatusLabel | "";
  isCorrection?: boolean;
};

export const scheduleOptions: { label: string; value: ScheduleView }[] = [
  { label: "Día", value: "day" },
  { label: "Semana", value: "week" },
  { label: "Mes", value: "month" }
];

export const appointmentFilterOptions: {
  label: string;
  value: AppointmentFilter;
}[] = [
  { label: "Todos", value: "all" },
  { label: "Pendientes", value: "pending" },
  { label: "Confirmados", value: "confirmed" },
  { label: "Asistidos", value: "attended" },
  { label: "Cancelados", value: "cancelled" },
  { label: "No asistió", value: "noShow" }
];

export const statusGuide = [
  { label: "Confirmado", description: "turno reservado" },
  { label: "En espera", description: "requiere confirmación" },
  { label: "Pagado", description: "pago registrado" },
  { label: "Asistido", description: "cliente presente" },
  { label: "Cancelado", description: "turno dado de baja" },
  { label: "No asistió", description: "cliente ausente" }
] satisfies { label: AppointmentStatusLabel; description: string }[];

export const activeDayLabel = "Mié 05";

const statusColors: Record<
  AppointmentStatusLabel,
  { solid: string; muted: string; border: string; light: string; ring: string }
> = {
  Confirmado: {
    solid: "var(--color-accent)",
    muted: "var(--color-accent)",
    border: "var(--color-accent)",
    light: "rgba(253,134,6,0.05)",
    ring: "rgba(253,134,6,0.28)"
  },
  "En espera": {
    solid: "#438397",
    muted: "#438397",
    border: "#438397",
    light: "rgba(67,131,151,0.07)",
    ring: "rgba(67,131,151,0.28)"
  },
  Pagado: {
    solid: "#569165",
    muted: "#569165",
    border: "#569165",
    light: "rgba(86,145,101,0.07)",
    ring: "rgba(86,145,101,0.28)"
  },
  Asistido: {
    solid: "rgba(32,24,54,0.9)",
    muted: "var(--color-ink)",
    border: "var(--color-ink)",
    light: "rgba(32,24,54,0.08)",
    ring: "rgba(32,24,54,0.22)"
  },
  Cancelado: {
    solid: "#b42318",
    muted: "#b42318",
    border: "#b42318",
    light: "rgba(180,35,24,0.08)",
    ring: "rgba(180,35,24,0.26)"
  },
  "No asistió": {
    solid: "#8a5a44",
    muted: "#8a5a44",
    border: "#8a5a44",
    light: "rgba(138,90,68,0.08)",
    ring: "rgba(138,90,68,0.24)"
  }
};

function buildStatusMap<T>(fn: (status: AppointmentStatusLabel, color: typeof statusColors[AppointmentStatusLabel]) => T): Record<AppointmentStatusLabel, T> {
  return Object.fromEntries(
    (Object.keys(statusColors) as AppointmentStatusLabel[]).map((s) => [s, fn(s, statusColors[s])])
  ) as Record<AppointmentStatusLabel, T>;
}

export const statusClassName = buildStatusMap(
  (_, c) => `bg-[${c.solid}] text-white`
);

export const rowClassName = buildStatusMap(
  (_, c) => `border-l-4 border-l-[${c.border}] bg-[${c.light}]`
);

export const statusDotClassName = buildStatusMap(
  (_, c) => `bg-[${c.solid}]`
);

export const statusOptionClassName = buildStatusMap(
  (_, c) => `border-[${c.border}40] border-l-[${c.border}] bg-[#fffaf4]`
);

export const statusOptionTextClassName = "text-[var(--color-ink)]";

export const selectedStatusOptionClassName = buildStatusMap(
  (_, c) =>
    `border-[var(--color-ink)] border-l-[${c.border}] bg-[#fffaf4] text-[var(--color-ink)] ring-2 ring-[${c.ring}]`
);

const statusModalDotOverrides: Partial<Record<AppointmentStatusLabel, string>> = {
  Confirmado: "bg-[var(--color-ink)]",
  Asistido: "bg-[var(--color-ink)]"
};

export function getStatusModalDotClassName(status: AppointmentStatusLabel): string {
  return statusModalDotOverrides[status] ?? statusDotClassName[status];
}

export const statusModalLabel: Record<AppointmentStatusLabel, string> = {
  Confirmado: "Pedido confirmado",
  "En espera": "En espera",
  Pagado: "Pagado",
  Asistido: "Asistido",
  Cancelado: "Cancelado",
  "No asistió": "No asistió"
};

const statusModalDescriptionOverrides: Partial<
  Record<AppointmentStatusLabel, string>
> = {
  Confirmado: "reserva confirmada",
  Cancelado: "turno cancelado"
};

export function getStatusModalDescription(status: AppointmentStatusLabel): string {
  const override = statusModalDescriptionOverrides[status];
  if (override) return override;
  const guide = statusGuide.find((item) => item.label === status);
  return guide?.description ?? "";
}

export const statusTransitionOptions: Record<
  AppointmentStatusLabel,
  AppointmentStatusLabel[]
> = {
  "En espera": ["Confirmado", "Cancelado"],
  Confirmado: ["Pagado", "Asistido", "No asistió", "Cancelado"],
  Pagado: ["Asistido", "No asistió", "Cancelado"],
  Asistido: [],
  Cancelado: [],
  "No asistió": []
};

export const statusCorrectionOptions: Record<
  AppointmentStatusLabel,
  AppointmentStatusLabel[]
> = {
  "En espera": ["Confirmado", "Cancelado"],
  Confirmado: ["En espera", "Pagado", "Asistido", "No asistió", "Cancelado"],
  Pagado: ["Confirmado", "Asistido", "No asistió", "Cancelado"],
  Asistido: ["Confirmado", "Pagado", "No asistió", "Cancelado"],
  Cancelado: ["En espera", "Confirmado", "Pagado"],
  "No asistió": ["Confirmado", "Pagado", "Asistido", "Cancelado"]
};

export const inactiveDayRowClassName =
  "border-l-4 border-l-transparent bg-[rgba(100,98,90,0.035)] text-[var(--color-muted-strong)]";

export const buttonMotionClass = MOTION_CLASS;

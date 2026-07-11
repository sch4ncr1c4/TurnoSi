import {
  buttonMotionClass,
  inactiveDayRowClassName,
  rowClassName,
  statusClassName,
  statusTransitionOptions,
  type AppointmentStatusLabel,
  type ScheduleView
} from "./dashboard.constants";
import { format } from "date-fns";
import type { DashboardAppointment } from "./dashboard.data";

type SummaryAppointmentsTableProps = {
  dateFilterLabel: string;
  getAppointmentStatus: (appointment: DashboardAppointment) => AppointmentStatusLabel;
  onRequestStatusChange: (
    appointment: DashboardAppointment,
    currentStatus: AppointmentStatusLabel,
    isCorrection?: boolean
  ) => void;
  scheduleView: ScheduleView;
  visibleAppointments: DashboardAppointment[];
};

export function SummaryAppointmentsTable({
  dateFilterLabel,
  getAppointmentStatus,
  onRequestStatusChange,
  scheduleView,
  visibleAppointments
}: SummaryAppointmentsTableProps) {
  if (visibleAppointments.length === 0) {
    return (
      <div className="border-t border-[var(--color-border)] px-4 py-10 text-center">
        <p className="text-sm font-semibold text-[var(--color-ink)]">
          No hay turnos para este período
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Probá con otra fecha o cambiá la vista de día, semana o mes.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="hidden w-full min-w-[760px] border-collapse text-left text-sm lg:table">
        <thead className="bg-[rgba(32,24,54,0.04)] text-xs uppercase text-[var(--color-muted)]">
          <tr>
            {scheduleView !== "day" && (
              <th className="px-4 py-3 font-medium">{dateFilterLabel}</th>
            )}
            <th className="px-4 py-3 font-medium">Hora</th>
            <th className="px-4 py-3 font-medium">Turno</th>
            <th className="px-4 py-3 font-medium">Responsable</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Acción</th>
          </tr>
        </thead>
        <tbody>
          {visibleAppointments.map((appointment) => {
            const status = getAppointmentStatus(appointment);
            const hasStatusActions = statusTransitionOptions[status].length > 0;
            const isActiveDay =
              scheduleView === "day" || appointment.day === format(new Date(), "yyyy-MM-dd");
            const appointmentRowClassName = isActiveDay
              ? `${rowClassName[status] ?? ""} ring-1 ring-inset ring-[rgba(253,134,6,0.16)]`
              : inactiveDayRowClassName;

            return (
              <tr
                key={appointment.id}
                className={`border-t border-[var(--color-border)] transition-colors ${appointmentRowClassName}`}
              >
                {scheduleView !== "day" && (
                  <td className="px-4 py-5 font-medium">
                    <div className="flex items-center gap-2">
                      <span>{appointment.day ?? "Hoy"}</span>
                      {isActiveDay && (
                        <span className="rounded-sm bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-button-text)]">
                          Hoy
                        </span>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-4 py-5 font-medium">{appointment.time}</td>
                <td className="px-4 py-5">
                  <p className="font-medium">{appointment.service}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                    {appointment.client} · {appointment.channel}
                  </p>
                </td>
                <td className="px-4 py-5 text-[var(--color-muted-strong)]">
                  {appointment.assignee}
                </td>
                <td className="px-4 py-5">
                  <span
                    className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${
                      statusClassName[status]
                    }`}
                  >
                    {status}
                  </span>
                </td>
                <td className="px-4 py-5">
                  <StatusButton
                    appointment={appointment}
                    hasStatusActions={hasStatusActions}
                    onRequestStatusChange={onRequestStatusChange}
                    status={status}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="space-y-3 lg:hidden">
        {visibleAppointments.map((appointment) => {
          const status = getAppointmentStatus(appointment);
          const hasStatusActions = statusTransitionOptions[status].length > 0;
          const isActiveDay =
            scheduleView === "day" || appointment.day === format(new Date(), "yyyy-MM-dd");

          return (
            <div
              key={appointment.id}
              className={`rounded-lg border border-[var(--color-border)] p-4 ${
                isActiveDay
                  ? `${rowClassName[status]} ring-1 ring-inset ring-[rgba(253,134,6,0.16)]`
                  : inactiveDayRowClassName
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{appointment.time}</span>
                    {scheduleView !== "day" && (
                      <span className="text-xs text-[var(--color-muted)]">
                        {appointment.day ?? "Hoy"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-medium">{appointment.service}</p>
                  <p className="mt-0.5 text-sm text-[var(--color-muted-strong)]">
                    {appointment.client} · {appointment.channel}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {appointment.assignee}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${
                    statusClassName[status]
                  }`}
                >
                  {status}
                </span>
              </div>
              <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                <StatusButton
                  appointment={appointment}
                  hasStatusActions={hasStatusActions}
                  onRequestStatusChange={onRequestStatusChange}
                  status={status}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusButton({
  appointment,
  hasStatusActions,
  onRequestStatusChange,
  status
}: {
  appointment: DashboardAppointment;
  hasStatusActions: boolean;
  onRequestStatusChange: (
    appointment: DashboardAppointment,
    currentStatus: AppointmentStatusLabel,
    isCorrection?: boolean
  ) => void;
  status: AppointmentStatusLabel;
}) {
  return (
    <button
      type="button"
      onClick={() => onRequestStatusChange(appointment, status, !hasStatusActions)}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
        hasStatusActions
          ? "border-[var(--color-border-strong)] text-[var(--color-ink)]"
          : "border-[var(--color-border)] text-[var(--color-muted-strong)]"
      } ${buttonMotionClass}`}
    >
      {hasStatusActions ? "Cambiar estado" : "Editar estado"}
    </button>
  );
}

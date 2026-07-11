export type ScheduledAppointment = {
  serviceId: string;
  resourceId: string | null;
  assignedUserId?: string | null;
  startsAt: Date;
  endsAt: Date;
  service: {
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
  };
};

type BookingContext = {
  resourceId: string | null;
  service: {
    id: string;
    capacity: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
  };
};

function overlapsBlockedRange(
  appointment: ScheduledAppointment,
  startsAt: Date,
  endsAt: Date,
  bufferBeforeMinutes: number,
  bufferAfterMinutes: number
) {
  const candidateStart = startsAt.getTime() - bufferBeforeMinutes * 60_000;
  const candidateEnd = endsAt.getTime() + bufferAfterMinutes * 60_000;
  const existingStart =
    appointment.startsAt.getTime() -
    appointment.service.bufferBeforeMinutes * 60_000;
  const existingEnd =
    appointment.endsAt.getTime() +
    appointment.service.bufferAfterMinutes * 60_000;
  return existingStart < candidateEnd && existingEnd > candidateStart;
}

export function slotHasCapacity(
  appointments: ScheduledAppointment[],
  context: BookingContext,
  startsAt: Date,
  endsAt: Date
) {
  const overlapping = appointments.filter((appointment) =>
    overlapsBlockedRange(
      appointment,
      startsAt,
      endsAt,
      context.service.bufferBeforeMinutes,
      context.service.bufferAfterMinutes
    )
  );
  const serviceOccupied = overlapping.filter(
    (appointment) => appointment.serviceId === context.service.id
  ).length;
  const resourceBusy = context.resourceId
    ? overlapping.some(
        (appointment) =>
          appointment.resourceId === context.resourceId &&
          appointment.serviceId !== context.service.id
      )
    : false;
  return serviceOccupied < context.service.capacity && !resourceBusy;
}

function localHourInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}-${value.hour}`;
}

export function assigneeHasCapacity(
  appointments: ScheduledAppointment[],
  assignee: { userId: string; hourlyCapacity: number },
  startsAt: Date,
  endsAt: Date,
  timezone: string,
  context: BookingContext
) {
  const targetHour = localHourInTimezone(startsAt, timezone);
  const assignedAppointments = appointments.filter(
    (appointment) => appointment.assignedUserId === assignee.userId
  );
  const assignedCountForHour = assignedAppointments.filter(
    (appointment) =>
      localHourInTimezone(appointment.startsAt, timezone) === targetHour
  ).length;
  if (assignedCountForHour >= assignee.hourlyCapacity) {
    return false;
  }

  return !assignedAppointments.some((appointment) =>
    overlapsBlockedRange(
      appointment,
      startsAt,
      endsAt,
      context.service.bufferBeforeMinutes,
      context.service.bufferAfterMinutes
    )
  );
}

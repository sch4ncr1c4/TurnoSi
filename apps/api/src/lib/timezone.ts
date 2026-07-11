export function zonedTimeToUtc(date: string, minutes: number, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const hours = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const candidate = Date.UTC(year, month - 1, day, hours, minute);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(candidate));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const represented = Date.UTC(
    Number(value.year),
    Number(value.month) - 1,
    Number(value.day),
    Number(value.hour),
    Number(value.minute)
  );
  return new Date(candidate - (represented - candidate));
}

export function parseTimeString(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

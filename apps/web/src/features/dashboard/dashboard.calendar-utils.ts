import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek
} from "date-fns";
import { es } from "date-fns/locale";

export function getMonthCalendarDays(selectedDate: Date) {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 })
  });
}

export function formatCalendarMonthLabel(date: Date) {
  return format(date, "MMMM yyyy", { locale: es });
}

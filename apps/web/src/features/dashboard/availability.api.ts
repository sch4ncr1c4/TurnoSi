import { apiRequest } from "../../lib/api";
import type {
  AvailabilityException,
  AvailabilityResource
} from "./availability.types";

export type WeeklyAvailabilityResponse = {
  success: true;
  data: {
    timezone: string;
    days: {
      weekday: number;
      slots: { startMinute: number; endMinute: number }[];
    }[];
  };
};

export function getWeeklyAvailability() {
  return apiRequest<WeeklyAvailabilityResponse>("/api/v1/availability/weekly");
}

export function updateWeeklyAvailability(
  days: WeeklyAvailabilityResponse["data"]["days"]
) {
  return apiRequest("/api/v1/availability/weekly", {
    method: "PUT",
    body: JSON.stringify({ days })
  });
}

export async function getAvailabilityExceptions() {
  const response = await apiRequest<{ success: true; data: AvailabilityException[] }>(
    "/api/v1/availability/exceptions"
  );
  return response.data;
}

export function saveAvailabilityException(exception: AvailabilityException) {
  const path = exception.id
    ? `/api/v1/availability/exceptions/${exception.id}`
    : "/api/v1/availability/exceptions";
  return apiRequest<{ success: true; data: { id?: string; updated?: true } }>(
    path,
    {
      method: exception.id ? "PATCH" : "POST",
      body: JSON.stringify(exception)
    }
  );
}

export async function getAvailabilityCatalog() {
  const response = await apiRequest<{
    success: true;
    data: {
      id: string;
      name: string;
      durationMinutes: number;
      capacity: number;
      bufferMinutes: number;
      priceCents: number | null;
      resourceName: string;
      online: boolean;
    }[];
  }>("/api/v1/availability/catalog");
  return response.data.map((item): AvailabilityResource => ({
    id: item.id,
    name: item.name,
    duration: `${item.durationMinutes} min`,
    capacity: String(item.capacity),
    buffer: `${item.bufferMinutes} min`,
    price: item.priceCents == null ? "" : String(item.priceCents / 100),
    resource: item.resourceName || "Sin asignar",
    online: item.online
  }));
}

function parseMinutes(value: string) {
  return Number.parseInt(value, 10) || 0;
}

export function saveAvailabilityCatalogItem(item: AvailabilityResource) {
  const path = item.id
    ? `/api/v1/availability/catalog/${item.id}`
    : "/api/v1/availability/catalog";
  return apiRequest<{ success: true; data: { id?: string; updated?: true } }>(
    path,
    {
      method: item.id ? "PATCH" : "POST",
      body: JSON.stringify({
        name: item.name,
        durationMinutes: parseMinutes(item.duration),
        capacity: Math.max(1, parseMinutes(item.capacity)),
        bufferMinutes: parseMinutes(item.buffer),
        priceCents: item.price.trim()
          ? Math.round(Number(item.price.replace(/\./g, "").replace(",", ".")) * 100)
          : null,
        resourceName: item.resource === "Sin asignar" ? "" : item.resource,
        online: item.online
      })
    }
  );
}

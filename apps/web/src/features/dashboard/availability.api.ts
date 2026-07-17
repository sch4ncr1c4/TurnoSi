import { apiRequest } from "../../lib/api";
import type {
  AvailabilityException,
  AvailabilityResource,
  AvailabilityServiceCategory
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

function withBranch(path: string, branchId?: string) {
  if (!branchId) return path;
  return `${path}?branchId=${encodeURIComponent(branchId)}`;
}

export function getWeeklyAvailability(branchId?: string) {
  return apiRequest<WeeklyAvailabilityResponse>(
    withBranch("/api/v1/availability/weekly", branchId)
  );
}

export function updateWeeklyAvailability(
  days: WeeklyAvailabilityResponse["data"]["days"],
  branchId?: string
) {
  return apiRequest(withBranch("/api/v1/availability/weekly", branchId), {
    method: "PUT",
    body: JSON.stringify({ days })
  });
}

export async function getAvailabilityExceptions(branchId?: string) {
  const response = await apiRequest<{ success: true; data: AvailabilityException[] }>(
    withBranch("/api/v1/availability/exceptions", branchId)
  );
  return response.data;
}

export function saveAvailabilityException(exception: AvailabilityException, branchId?: string) {
  const path = exception.id
    ? `/api/v1/availability/exceptions/${exception.id}`
    : "/api/v1/availability/exceptions";
  return apiRequest<{ success: true; data: { id?: string; updated?: true } }>(
    withBranch(path, branchId),
    {
      method: exception.id ? "PATCH" : "POST",
      body: JSON.stringify(exception)
    }
  );
}

export function deleteAvailabilityException(id: string, branchId?: string) {
  return apiRequest<{ success: true; data: { deleted: true } }>(
    withBranch(`/api/v1/availability/exceptions/${id}`, branchId),
    { method: "DELETE" }
  );
}

export async function getAvailabilityCatalog() {
  const response = await apiRequest<{
    success: true;
    data: {
      categories: AvailabilityServiceCategory[];
      services: {
        id: string;
        name: string;
        category: string;
        durationMinutes: number;
        capacity: number;
        bufferMinutes: number;
        priceCents: number | null;
        resourceName: string;
        online: boolean;
      }[];
    };
  }>("/api/v1/availability/catalog");
  return {
    categories: response.data.categories,
    services: response.data.services.map((item): AvailabilityResource => ({
      id: item.id,
      name: item.name,
      category: item.category ?? "",
      duration: `${item.durationMinutes} min`,
      capacity: String(item.capacity),
      buffer: `${item.bufferMinutes} min`,
      price: item.priceCents == null ? "" : String(item.priceCents / 100),
      resource: item.resourceName || "Sin asignar",
      online: item.online
    }))
  };
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
        category: item.category.trim(),
        durationMinutes: parseMinutes(item.duration),
        capacity: Math.max(1, parseMinutes(item.capacity)),
        bufferMinutes: parseMinutes(item.buffer),
        priceCents: item.price.trim()
          ? Math.round(Number(item.price.replace(/\./g, "").replace(",", ".")) * 100)
          : null,
        resourceName: "",
        online: item.online
      })
    }
  );
}

export function saveAvailabilityCategory(name: string) {
  return apiRequest<{ success: true; data: AvailabilityServiceCategory }>(
    "/api/v1/availability/catalog/categories",
    {
      method: "POST",
      body: JSON.stringify({ name })
    }
  );
}

export function deleteAvailabilityCatalogItem(id: string) {
  return apiRequest<{ success: true; data: { deleted: true } }>(
    `/api/v1/availability/catalog/${id}`,
    { method: "DELETE" }
  );
}

export function deleteAvailabilityCategory(id: string) {
  return apiRequest<{ success: true; data: { deleted: true } }>(
    `/api/v1/availability/catalog/categories/${id}`,
    { method: "DELETE" }
  );
}

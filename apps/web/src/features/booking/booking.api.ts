import { apiRequest, getApiUrl } from "../../lib/api";
import type { BookingConfirmData } from "./booking.schemas";

export type PublicBookingData = {
  organization: {
    name: string;
    slug: string;
    category: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    description: string | null;
    phone: string | null;
    whatsapp: string | null;
    instagram: string | null;
    hasLogo: boolean;
    logoVersion: number | null;
    galleryImageSlots: number[];
    galleryVersions: {
      slot: number;
      version: number;
    }[];
    galleryFocus: {
      slot: number;
      focusX: number;
      focusY: number;
      zoom: number;
    }[];
  };
  branches: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    province: string | null;
    phone: string | null;
    whatsapp: string | null;
    isMain: boolean;
  }[];
  team: {
    id: string;
    branchIds: string[];
    name: string;
    hourlyCapacity: number;
  }[];
  services: {
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceCents: number | null;
    resourceName: string | null;
  }[];
};

export type BookingDay = {
  date: string;
  slots: { time: string; startsAt: string }[];
};

export type PublicSlotsData = {
  days: BookingDay[];
  suggestedAssigneeId: string | null;
};

export async function getPublicBooking(slug: string) {
  const response = await apiRequest<{ success: true; data: PublicBookingData }>(
    `/api/v1/public/booking/${slug}`
  );
  return response.data;
}

export async function getPublicSlots(
  slug: string,
  serviceId: string,
  branchId?: string,
  assigneeId?: string
) {
  const params = new URLSearchParams({ serviceId });
  if (branchId) params.set("branchId", branchId);
  if (assigneeId) params.set("assigneeId", assigneeId);
  const response = await apiRequest<{ success: true; data: PublicSlotsData }>(
    `/api/v1/public/booking/${slug}/slots?${params.toString()}`
  );
  return {
    ...response.data,
    days: response.data.days.filter((day) => day.slots.length > 0)
  };
}

export function createPublicAppointment(
  slug: string,
  data: BookingConfirmData & {
    serviceId: string;
    branchId?: string;
    startsAt: string;
    assigneeId?: string;
  }
) {
  return apiRequest(
    `/api/v1/public/booking/${slug}/appointments`,
    { method: "POST", body: JSON.stringify(data) },
    false
  );
}

export function getPublicLogoUrl(slug: string, version?: number | null) {
  const suffix = version ? `?v=${version}` : "";
  return getApiUrl(`/api/v1/public/booking/${slug}/logo${suffix}`);
}

export function getPublicGalleryImageUrl(
  slug: string,
  slot: 0 | 1,
  version?: number | null
) {
  const suffix = version ? `?v=${version}` : "";
  return getApiUrl(`/api/v1/public/booking/${slug}/gallery/${slot}${suffix}`);
}

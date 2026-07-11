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
  };
  team: {
    id: string;
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
  assigneeId?: string
) {
  const params = new URLSearchParams({ serviceId });
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

export function getPublicLogoUrl(slug: string) {
  return getApiUrl(`/api/v1/public/booking/${slug}/logo`);
}

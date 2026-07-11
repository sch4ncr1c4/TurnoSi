export const queryKeys = {
  session: ["session"] as const,
  organizationSettings: ["organization", "settings"] as const,
  appointments: (month: string) => ["appointments", month] as const,
  weeklyAvailability: ["availability", "weekly"] as const,
  availabilityExceptions: ["availability", "exceptions"] as const,
  availabilityCatalog: ["availability", "catalog"] as const,
  teamMembers: ["team", "members"] as const,
  customers: (search: string, status: string, page: number) =>
    ["customers", search, status, page] as const,
  publicBooking: (slug: string) => ["public-booking", slug] as const,
  publicSlots: (slug: string, serviceId: string, assigneeId = "auto") =>
    ["public-booking", slug, "slots", serviceId, assigneeId] as const
};

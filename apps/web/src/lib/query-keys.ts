export const queryKeys = {
  session: ["session"] as const,
  organizationSettings: ["organization", "settings"] as const,
  organizationBranches: ["organization", "branches"] as const,
  appointments: (month: string) => ["appointments", month] as const,
  weeklyAvailability: (branchId = "main") => ["availability", "weekly", branchId] as const,
  availabilityExceptions: (branchId = "main") =>
    ["availability", "exceptions", branchId] as const,
  availabilityCatalog: ["availability", "catalog"] as const,
  teamMembers: ["team", "members"] as const,
  customers: (search: string, status: string, page: number) =>
    ["customers", search, status, page] as const,
  publicBooking: (slug: string) => ["public-booking", slug] as const,
  publicSlots: (slug: string, serviceId: string, assigneeId = "auto", branchId = "main") =>
    ["public-booking", slug, "slots", serviceId, assigneeId, branchId] as const
};

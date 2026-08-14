export const queryKeys = {
  session: ["session"] as const,
  organizationSettings: ["organization", "settings"] as const,
  organizationSettingsSection: (section: string) =>
    ["organization", "settings", section] as const,
  organizationBranches: ["organization", "branches"] as const,
  appointments: (month: string) => ["appointments", month] as const,
  appointmentIndicators: (month: string) =>
    ["appointments", "indicators", month] as const,
  appointmentRescheduleSlots: (appointmentId: string) =>
    ["appointments", appointmentId, "reschedule-slots"] as const,
  recentReservations: (since: string) => ["appointments", "recent", since] as const,
  reservationNotifications: (organizationId: string) =>
    ["appointments", "notifications", organizationId] as const,
  weeklyAvailability: (branchId = "main") => ["availability", "weekly", branchId] as const,
  availabilityExceptions: (branchId = "main") =>
    ["availability", "exceptions", branchId] as const,
  availabilityCatalog: (branchId = "main") =>
    ["availability", "catalog", branchId] as const,
  teamMembers: ["team", "members"] as const,
  customers: (search: string, status: string, page: number) =>
    ["customers", search, status, page] as const,
  publicBooking: (slug: string) => ["public-booking", slug] as const,
  publicSlots: (slug: string, serviceId: string, assigneeId = "auto", branchId = "main") =>
    ["public-booking", slug, "slots", serviceId, assigneeId, branchId] as const
};

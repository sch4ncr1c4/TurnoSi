import { describe, expect, it } from "vitest";

import { dashboardRanges, deriveDashboardMetrics } from "./dashboard.service.js";

describe("dashboard metrics", () => {
  it("calculates income, expenses, net income, average ticket and occupancy", () => {
    expect(deriveDashboardMetrics(
      { appointmentCount: 8, completedCount: 4, confirmedCount: 2, depositedCount: 1, pendingCount: 1, canceledCount: 1, noShowCount: 1, revenueAppointmentCount: 4, incomeCents: 100_000 },
      { completedCount: 2, incomeCents: 80_000 },
      30_000,
      20_000
    )).toEqual({
      incomeCents: 100_000,
      expenseCents: 30_000,
      netIncomeCents: 70_000,
      completedAppointments: 4,
      averageTicketCents: 25_000,
      occupancyPercent: 70,
      confirmedAppointments: 2,
      depositedAppointments: 1,
      pendingAppointments: 1,
      canceledAppointments: 1,
      noShowAppointments: 1,
      changes: { incomePercent: 25, expensePercent: 50, completedPercent: 100 }
    });
  });

  it("builds month boundaries using the organization timezone", () => {
    const ranges = dashboardRanges(
      "current_month",
      "America/Argentina/Buenos_Aires",
      new Date("2026-08-26T02:00:00.000Z")
    );
    expect(ranges.today.from.toISOString()).toBe("2026-08-25T03:00:00.000Z");
    expect(ranges.currentMonth.from.toISOString()).toBe("2026-08-01T03:00:00.000Z");
    expect(ranges.previousMonth.from.toISOString()).toBe("2026-07-01T03:00:00.000Z");
  });
});

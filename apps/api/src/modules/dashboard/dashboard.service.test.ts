import { describe, expect, it } from "vitest";

import { dashboardRanges, deriveDashboardMetrics } from "./dashboard.service.js";

describe("dashboard metrics", () => {
  it("calculates income, expenses, net income, average ticket and occupancy", () => {
    expect(deriveDashboardMetrics(
      { appointmentCount: 8, completedCount: 4, confirmedCount: 2, depositedCount: 1, pendingCount: 1, canceledCount: 1, noShowCount: 1, revenueAppointmentCount: 4, completedIncomeCents: 120_000, depositIncomeCents: 20_000, pendingCollectionCents: 45_000, incomeCents: 100_000 },
      { appointmentCount: 5, completedCount: 2, confirmedCount: 1, depositedCount: 1, pendingCount: 1, canceledCount: 1, noShowCount: 0, revenueAppointmentCount: 2, completedIncomeCents: 70_000, depositIncomeCents: 10_000, pendingCollectionCents: 30_000, incomeCents: 80_000 },
      30_000,
      20_000
    )).toEqual({
      incomeCents: 100_000,
      expenseCents: 30_000,
      netIncomeCents: 70_000,
      totalAppointments: 10,
      completedAppointments: 4,
      averageTicketCents: 30_000,
      occupancyPercent: 60,
      cancellationRatePercent: 10,
      noShowRatePercent: 10,
      confirmedAppointments: 2,
      depositedAppointments: 1,
      depositIncomeCents: 20_000,
      pendingCollectionCents: 45_000,
      pendingAppointments: 1,
      canceledAppointments: 1,
      noShowAppointments: 1,
      changes: {
        averageTicketPercent: -14.3,
        cancellationRatePercent: -40.1,
        completedPercent: 100,
        expensePercent: 50,
        incomePercent: 25,
        netIncomePercent: 16.7,
        noShowRatePercent: null,
        occupancyPercent: 20
      }
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

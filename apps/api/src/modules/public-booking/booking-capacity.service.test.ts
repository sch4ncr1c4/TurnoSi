import { describe, expect, it } from "vitest";

import {
  slotHasCapacity,
  type ScheduledAppointment
} from "./booking-capacity.service.js";

const context = {
  resourceId: "resource-1",
  service: {
    id: "service-1",
    capacity: 2,
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 10
  }
};

function appointment(
  serviceId: string,
  startsAt: string,
  endsAt: string
): ScheduledAppointment {
  return {
    serviceId,
    resourceId: "resource-1",
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    service: { bufferBeforeMinutes: 0, bufferAfterMinutes: 0 }
  };
}

describe("slotHasCapacity", () => {
  it("allows reservations until service capacity is reached", () => {
    const existing = [
      appointment("service-1", "2026-07-01T12:00:00Z", "2026-07-01T12:30:00Z")
    ];
    expect(
      slotHasCapacity(
        existing,
        context,
        new Date("2026-07-01T12:00:00Z"),
        new Date("2026-07-01T12:30:00Z")
      )
    ).toBe(true);
  });

  it("blocks another service using the same resource", () => {
    const existing = [
      appointment("service-2", "2026-07-01T12:00:00Z", "2026-07-01T12:30:00Z")
    ];
    expect(
      slotHasCapacity(
        existing,
        context,
        new Date("2026-07-01T12:30:00Z"),
        new Date("2026-07-01T13:00:00Z")
      )
    ).toBe(false);
  });
});

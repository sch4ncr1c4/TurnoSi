import { describe, expect, it } from "vitest";

import { subscriptionGrantsAccess } from "./subscription-access.service.js";

describe("billing access", () => {
  const now = new Date("2026-07-10T12:00:00Z");

  it("allows active paid subscriptions", () => {
    expect(subscriptionGrantsAccess({ status: "authorized", plan: "initial", trialEndsAt: null }, now)).toBe(true);
  });

  it("rejects expired trials and pending subscriptions", () => {
    expect(subscriptionGrantsAccess({ status: "authorized", plan: "trial", trialEndsAt: new Date("2026-07-09") }, now)).toBe(false);
    expect(subscriptionGrantsAccess({ status: "pending", plan: "initial", trialEndsAt: null }, now)).toBe(false);
  });
});

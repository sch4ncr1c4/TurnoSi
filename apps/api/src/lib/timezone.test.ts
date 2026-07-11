import { describe, expect, it } from "vitest";

import { zonedTimeToUtc } from "./timezone.js";

describe("zonedTimeToUtc", () => {
  it("converts Buenos Aires local time to UTC", () => {
    expect(
      zonedTimeToUtc(
        "2026-07-01",
        9 * 60,
        "America/Argentina/Buenos_Aires"
      ).toISOString()
    ).toBe("2026-07-01T12:00:00.000Z");
  });
});

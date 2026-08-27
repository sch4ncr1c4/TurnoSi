import { describe, expect, it } from "vitest";

import { analyticsReportPdfQuerySchema, dashboardSummaryQuerySchema } from "./dashboard.schemas.js";

describe("dashboard tenant isolation input", () => {
  it("rejects attempts to select an organization from query parameters", () => {
    expect(() => dashboardSummaryQuerySchema.parse({ period: "30d", organizationId: "other-tenant" })).toThrow();
  });
});

describe("analytics report range", () => {
  it("accepts a valid cross-month range", () => {
    expect(analyticsReportPdfQuerySchema.parse({ from: "2026-08-15", to: "2026-09-15" })).toEqual({
      from: "2026-08-15",
      to: "2026-09-15"
    });
  });

  it("rejects inverted or excessive ranges", () => {
    expect(() => analyticsReportPdfQuerySchema.parse({ from: "2026-09-15", to: "2026-08-15" })).toThrow();
    expect(() => analyticsReportPdfQuerySchema.parse({ from: "2025-01-01", to: "2026-01-02" })).toThrow();
  });
});

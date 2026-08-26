import { describe, expect, it } from "vitest";

import { dashboardSummaryQuerySchema } from "./dashboard.schemas.js";

describe("dashboard tenant isolation input", () => {
  it("rejects attempts to select an organization from query parameters", () => {
    expect(() => dashboardSummaryQuerySchema.parse({ period: "30d", organizationId: "other-tenant" })).toThrow();
  });
});

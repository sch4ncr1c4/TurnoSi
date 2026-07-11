import { describe, expect, it } from "vitest";

import { tenantMembershipWhere } from "./resolve-tenant.js";

describe("tenant isolation", () => {
  it("always scopes a selected tenant by user and organization", () => {
    expect(tenantMembershipWhere("user-a", "organization-b")).toEqual({
      userId: "user-a",
      organizationId: "organization-b"
    });
  });
});

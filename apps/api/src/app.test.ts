import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";

describe("API infrastructure", () => {
  const app = createApp();

  it("returns health with security headers", async () => {
    const response = await request(app).get("/api/v1/health").expect(200);
    expect(response.body).toEqual({
      success: true,
      data: { status: "ok" }
    });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(response.headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(response.headers["cross-origin-resource-policy"]).toBe("same-site");
  });

  it("publishes the OpenAPI document", async () => {
    const response = await request(app).get("/api/v1/openapi.json").expect(200);
    expect(response.body.openapi).toBe("3.1.0");
  });

  it("rejects state changes from an unknown origin", async () => {
    await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "https://attacker.example")
      .send({})
      .expect(403);
  });
});

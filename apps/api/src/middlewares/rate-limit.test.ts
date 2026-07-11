import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../lib/app-error.js";
import { createRateLimit, resetRateLimitsForTests } from "./rate-limit.js";

describe("in-memory rate limit", () => {
  beforeEach(resetRateLimitsForTests);

  it("isolates clients and rejects only after the configured limit", () => {
    const middleware = createRateLimit("test", 2, 60_000);
    const response = { setHeader: vi.fn() } as unknown as Response;
    const invoke = (ip: string) => {
      const next = vi.fn() as unknown as NextFunction;
      middleware({ ip, path: "/login" } as Request, response, next);
      return next as unknown as ReturnType<typeof vi.fn>;
    };

    expect(invoke("1.1.1.1")).toHaveBeenCalledWith();
    expect(invoke("1.1.1.1")).toHaveBeenCalledWith();
    expect(invoke("2.2.2.2")).toHaveBeenCalledWith();
    const blocked = invoke("1.1.1.1").mock.calls[0][0];
    expect(blocked).toBeInstanceOf(AppError);
    expect(blocked.statusCode).toBe(429);
  });
});

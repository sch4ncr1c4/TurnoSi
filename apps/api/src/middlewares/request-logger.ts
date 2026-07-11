import type { NextFunction, Request, Response } from "express";

import { logger } from "../lib/logger.js";

export function requestLogger(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const startedAt = performance.now();
  response.once("finish", () => {
    if (request.path.endsWith("/health")) return;
    logger.info("request completed", {
      requestId: request.id,
      method: request.method,
      path: request.path,
      status: response.statusCode,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100
    });
  });
  next();
}

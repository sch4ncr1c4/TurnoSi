import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../lib/app-error.js";
import { fail } from "../lib/http.js";
import { logger } from "../lib/logger.js";

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction
) {
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }));

    return response.status(400).json({
      success: false as const,
      message: "Invalid request data",
      code: "VALIDATION_ERROR",
      details
    });
  }

  if (error instanceof AppError) {
    return response.status(error.statusCode).json(fail(error.message, error.code));
  }

  logger.error("unhandled error", {
    requestId: request.id,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });

  return response.status(500).json(
    fail("Internal server error", "INTERNAL_SERVER_ERROR")
  );
}

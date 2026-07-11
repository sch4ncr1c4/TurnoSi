import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

const allowedOrigins = env.WEB_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

export function securityHeaders(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Resource-Policy", "same-site");
  response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if (process.env.NODE_ENV === "production") {
    response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  response.setHeader("Cache-Control", "no-store");
  next();
}

export function verifyRequestOrigin(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  const origin = request.get("origin");
  if (!safeMethods.has(request.method)) {
    if (
      request.path === "/api/v1/billing/webhooks/mercadopago" &&
      !origin
    ) {
      next();
      return;
    }
    if (!origin) {
      next(new AppError(403, "INVALID_ORIGIN", "Request origin required"));
      return;
    }
    if (!allowedOrigins.includes(origin)) {
      next(new AppError(403, "INVALID_ORIGIN", "Request origin not allowed"));
      return;
    }
  }
  next();
}

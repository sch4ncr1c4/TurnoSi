import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestId(request: Request, response: Response, next: NextFunction) {
  const raw = request.headers["x-request-id"];
  const id = (typeof raw === "string" ? raw.slice(0, 128) : null) || randomUUID();
  request.id = id;
  response.setHeader("X-Request-Id", id);
  next();
}

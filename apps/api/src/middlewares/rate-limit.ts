import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { prisma } from "../database/prisma.js";
import { AppError } from "../lib/app-error.js";

type Bucket = { count: number; resetsAt: number };
const buckets = new Map<string, Bucket>();

function hashClient(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createRateLimit(
  namespace: string,
  maxAttempts: number,
  windowMs: number,
  useUserId = false
) {
  return async (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();
    const client = useUserId && request.auth?.sub
      ? hashClient(request.auth.sub)
      : hashClient(request.ip ?? "unknown");
    const key = `${namespace}:${request.path}:${client}`;

    if (env.NODE_ENV === "production") {
      try {
        const bucket = await prisma.$transaction(async (transaction) => {
          const current = await transaction.rateLimitBucket.findUnique({
            where: { key }
          });
          const resetsAt = new Date(now + windowMs);
          if (!current || current.resetsAt.getTime() <= now) {
            return transaction.rateLimitBucket.upsert({
              where: { key },
              create: { key, count: 1, resetsAt },
              update: { count: 1, resetsAt }
            });
          }
          return transaction.rateLimitBucket.update({
            where: { key },
            data: { count: { increment: 1 } }
          });
        });

        if (bucket.count > maxAttempts) {
          response.setHeader(
            "Retry-After",
            String(Math.max(1, Math.ceil((bucket.resetsAt.getTime() - now) / 1000)))
          );
          next(new AppError(429, "TOO_MANY_ATTEMPTS", "Too many attempts, try again later"));
          return;
        }
        next();
      } catch (error) {
        next(error);
      }
      return;
    }

    const current = buckets.get(key);
    const bucket = !current || current.resetsAt <= now
      ? { count: 1, resetsAt: now + windowMs }
      : { count: current.count + 1, resetsAt: current.resetsAt };
    buckets.set(key, bucket);

    if (bucket.count > maxAttempts) {
      response.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetsAt - now) / 1000))));
      next(new AppError(429, "TOO_MANY_ATTEMPTS", "Too many attempts, try again later"));
      return;
    }

    if (buckets.size > 10_000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetsAt <= now) buckets.delete(bucketKey);
      }
    }
    next();
  };
}

export function resetRateLimitsForTests() {
  buckets.clear();
}

export const authRateLimit = createRateLimit("auth", 20, 15 * 60 * 1000);
export const authCodeRateLimit = createRateLimit("auth-code", 5, 30 * 60 * 1000);
export const authenticatedRateLimit = createRateLimit("authenticated", 100, 60 * 1000, true);
export const publicBookingRateLimit = createRateLimit("booking", 10, 60 * 1000);
export const publicSlotsRateLimit = createRateLimit("slots", 120, 60 * 1000);

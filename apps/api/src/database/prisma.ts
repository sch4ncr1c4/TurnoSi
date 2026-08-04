import { Prisma, PrismaClient } from "@prisma/client";

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

type AppPrismaClient = PrismaClient<Prisma.PrismaClientOptions, "query">;

const globalForPrisma = globalThis as {
  prisma?: AppPrismaClient;
  prismaSlowQueryLoggerAttached?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  (new PrismaClient({
    transactionOptions: {
      maxWait: env.DATABASE_TRANSACTION_MAX_WAIT_MS,
      timeout: env.DATABASE_TRANSACTION_TIMEOUT_MS
    },
    log: [
      ...(env.DATABASE_SLOW_QUERY_MS > 0 ? [{ emit: "event" as const, level: "query" as const }] : []),
      ...(env.NODE_ENV === "development" ? (["warn", "error"] as const) : (["error"] as const))
    ]
  }) as AppPrismaClient);

if (env.DATABASE_SLOW_QUERY_MS > 0 && !globalForPrisma.prismaSlowQueryLoggerAttached) {
  prisma.$on("query", (event) => {
    if (event.duration < env.DATABASE_SLOW_QUERY_MS) {
      return;
    }

    logger.warn("slow database query", {
      durationMs: event.duration,
      thresholdMs: env.DATABASE_SLOW_QUERY_MS,
      target: event.target,
      query: env.NODE_ENV === "production" ? undefined : event.query
    });
  });
  globalForPrisma.prismaSlowQueryLoggerAttached = true;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

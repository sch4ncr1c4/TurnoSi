import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { prisma } from "./database/prisma.js";
import { logger } from "./lib/logger.js";
import { AppError } from "./lib/app-error.js";
import { ok } from "./lib/http.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { requestId } from "./middlewares/request-id.js";
import { requestLogger } from "./middlewares/request-logger.js";
import { securityHeaders, verifyRequestOrigin } from "./middlewares/security.js";
import { apiRouter } from "./modules/index.js";
import { openApiDocument } from "./docs/openapi.js";

const allowedOrigins = env.WEB_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(requestId);
  app.use(requestLogger);
  app.use(securityHeaders);
  app.use(
    cors({
      origin(origin, callback) {
        if (origin && allowedOrigins.includes(origin)) {
          callback(null, true);
        } else if (!origin) {
          callback(null, true);
        } else {
          callback(new AppError(403, "INVALID_ORIGIN", "Request origin not allowed"));
        }
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(verifyRequestOrigin);

  app.get("/health", (_request, response) => {
    response.json(ok({ status: "ok" }));
  });

  app.get("/api/v1/health", (_request, response) => {
    response.json(ok({ status: "ok" }));
  });
  app.get("/api/v1/health/ready", async (_request, response) => {
    await prisma.$queryRaw`SELECT 1`;
    response.json(ok({ status: "ready", database: "up" }));
  });
  app.get("/api/v1/openapi.json", (_request, response) => {
    response.json(openApiDocument);
  });

  app.use("/api/v1", apiRouter);
  app.use(errorHandler);

  logger.info("app created");

  return app;
}

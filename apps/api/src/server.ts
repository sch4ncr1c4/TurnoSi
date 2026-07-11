import { prisma } from "./database/prisma.js";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info("api listening", { port: env.PORT });
});

function shutdown(signal: string) {
  logger.info("shutdown initiated", { signal });
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("shutdown complete");
    process.exit(0);
  });
  setTimeout(() => {
    logger.error("shutdown forced after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (error) => {
  logger.error("unhandled rejection", { error });
  shutdown("unhandledRejection");
});
process.on("uncaughtException", (error) => {
  logger.error("uncaught exception", { error });
  shutdown("uncaughtException");
});

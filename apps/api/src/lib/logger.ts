type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const minLevel: Level = process.env.NODE_ENV === "production" ? "info" : "debug";

function shouldLog(level: Level) {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function format(level: Level, message: string, meta?: Record<string, unknown>) {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message
  };
  if (meta && Object.keys(meta).length > 0) {
    entry.meta = meta;
  }
  return JSON.stringify(entry);
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("debug")) console.debug(format("debug", message, meta));
  },
  info(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("info")) console.info(format("info", message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("warn")) console.warn(format("warn", message, meta));
  },
  error(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("error")) console.error(format("error", message, meta));
  }
};

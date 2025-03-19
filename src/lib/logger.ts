// biome-ignore lint/correctness/noNodejsModules: <explanation>
import path, { join } from "node:path";
import config from "@/config";
import pino from "pino";
import type { PrettyOptions } from "pino-pretty";

export function deepTrimObject(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (typeof obj[key] === "string") {
      result[key] =
        `${obj[key].slice(0, 50)}${obj[key].length > 50 ? "..." : ""}`;
    } else if (Array.isArray(obj[key])) {
      result[key] = obj[key].slice(0, 3).map((item) => deepTrimObject(item));
    } else if (typeof obj[key] === "object") {
      result[key] = deepTrimObject(obj[key] as Record<string, unknown>);
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

export const baileysLogger = pino({
  level: config.baileys.logLevel,
  transport: {
    targets: [
      {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
        } as PrettyOptions,
      },
      {
        target: "pino-roll",
        options: {
          file: path.join("logs", "baileys"),
          size: "50m",
          limit: { count: 10 },
        },
      },
    ],
  },
});

let logger = pino({
  level: "trace",
  transport: {
    targets: [
      {
        level: config.logLevel,
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
        } as PrettyOptions,
      },
      {
        level: config.logLevel,
        target: "pino-roll",
        options: {
          file: path.join("logs", "log"),
          size: "50m",
          limit: { count: 10 },
        },
      },
    ],
  },
});

if (config.env === "development") {
  logger = require("pino-caller")(logger, {
    relativeTo: join(__dirname, ".."),
  });
}

// biome-ignore lint/style/noDefaultExport: <explanation>
export default logger;

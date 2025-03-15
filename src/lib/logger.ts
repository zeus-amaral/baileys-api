// biome-ignore lint/correctness/noNodejsModules: <explanation>
import path from "node:path";
import config from "@/config";
import pino from "pino";
import type { PrettyOptions } from "pino-pretty";

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
  level: config.logLevel,
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
          file: path.join("logs", "log"),
          size: "50m",
          limit: { count: 10 },
        },
      },
    ],
  },
});

if (config.env === "development") {
  logger = require("pino-caller")(logger, { relativeTo: __dirname });
}

// biome-ignore lint/style/noDefaultExport: <explanation>
export default logger;

// biome-ignore lint/correctness/noNodejsModules: <explanation>
import path, { join } from "node:path";
import config from "@/config";
import pino from "pino";
import type { PrettyOptions } from "pino-pretty";

function omitKeys(obj: Record<string, unknown>, extraOmitKeys: string[]) {
  const keys = ["password", "key", "token", ...extraOmitKeys];
  for (const key in obj) {
    for (const omitKey of keys) {
      if (key.toLowerCase().includes(omitKey.toLowerCase())) {
        obj[key] = "********";
      }
    }
  }
}

export function deepSanitizeObject(
  obj: Record<string, unknown>,
  { extraOmitKeys }: { extraOmitKeys?: string[] } = {},
) {
  const output = structuredClone(obj);
  omitKeys(output, extraOmitKeys ?? []);

  for (const key in output) {
    if (typeof output[key] === "string") {
      output[key] =
        `${output[key].slice(0, 50)}${output[key].length > 50 ? "..." : ""}`;
    } else if (Array.isArray(output[key])) {
      output[key] = output[key]
        .slice(0, 3)
        .map((item) => deepSanitizeObject(item, { extraOmitKeys }));
      if ((output[key] as unknown[]).length > 3) {
        (output[key] as unknown[]).push("...");
      }
    } else if (typeof output[key] === "object") {
      output[key] = deepSanitizeObject(output[key] as Record<string, unknown>, {
        extraOmitKeys,
      });
    }
  }
  return output;
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
  level: "debug",
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

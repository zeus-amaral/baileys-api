import packageInfo from "@/../package.json";
import type { LevelWithSilentOrString } from "pino";

const { NODE_ENV, PORT, LOG_LEVEL } = process.env;

if (!NODE_ENV) {
  throw new Error("NODE_ENV is required");
}
if (!PORT) {
  throw new Error("PORT is required");
}
if (!LOG_LEVEL) {
  throw new Error("LOG_LEVEL is required");
}

const { BAILEYS_LOG_LEVEL, BAILEYS_PRINT_QR } = process.env;

if (!BAILEYS_LOG_LEVEL) {
  throw new Error("BAILEYS_LOG_LEVEL is required");
}
if (!BAILEYS_PRINT_QR) {
  throw new Error("BAILEYS_PRINT_QR is required");
}

const { REDIS_URL, REDIS_PASSWORD } = process.env;

if (!REDIS_URL) {
  throw new Error("REDIS_URL is required");
}
if (!REDIS_PASSWORD) {
  throw new Error("REDIS_PASSWORD is required");
}

const config = {
  packageInfo: { name: packageInfo.name, version: packageInfo.version },
  port: Number(PORT),
  env: (NODE_ENV || "development") as "development" | "production",
  logLevel: (LOG_LEVEL || "info") as LevelWithSilentOrString,
  baileys: {
    logLevel: (BAILEYS_LOG_LEVEL || "warn") as LevelWithSilentOrString,
    printQr: BAILEYS_PRINT_QR === "true",
  },
  redis: {
    url: REDIS_URL,
    password: REDIS_PASSWORD,
  },
};

// biome-ignore lint/style/noDefaultExport: <explanation>
export default config;

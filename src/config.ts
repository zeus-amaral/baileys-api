import type { LevelWithSilentOrString } from "pino";

const { NODE_ENV, LOG_LEVEL, BAILEYS_LOG_LEVEL } = process.env;

const config = {
  env: (NODE_ENV || "development") as "development" | "production",
  logLevel: (LOG_LEVEL || "info") as LevelWithSilentOrString,
  baileys: {
    logLevel: (BAILEYS_LOG_LEVEL || "warn") as LevelWithSilentOrString,
  },
};

// biome-ignore lint/style/noDefaultExport: <explanation>
export default config;

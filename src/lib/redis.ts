import config from "@/config";
import logger from "@/lib/logger";
import { createClient } from "redis";

const redis = createClient(config.redis);

redis.on("error", (err) => {
  logger.error("Redis client error\n%o", err);
});

redis.on("connect", () => {
  logger.info("Connected to Redis");
});

const connectRedis = async () => {
  if (!redis.isOpen) {
    await redis.connect();
  }
};

connectRedis().catch((err) => {
  logger.error("Failed to connect to Redis\n%o", err);
});

// biome-ignore lint/style/noDefaultExport: <explanation>
export default redis;

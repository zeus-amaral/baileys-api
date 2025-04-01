import config from "@/config";
import logger from "@/lib/logger";
import { createClient } from "redis";

const redis = createClient(config.redis);

redis.on("error", (err) => {
  logger.error("Redis client error\n%o", err);
});

redis.on("connect", async () => {
  await redis.clientSetName("baileys-api");
  logger.info("Connected to Redis");
});

export async function initializeRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }

  return redis;
}

// biome-ignore lint/style/noDefaultExport: <explanation>
export default redis;

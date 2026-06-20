import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
});

redis.on("error", (err) => logger.error(`redis error: ${err.message}`));

export async function assertRedisConnection(): Promise<void> {
  await redis.connect();
  await redis.ping();
  logger.info("✅ Redis connected");
}

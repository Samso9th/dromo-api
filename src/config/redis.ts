import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  enableOfflineQueue: false, // fail commands fast when offline instead of queueing
  retryStrategy: (times) => (times > 8 ? null : Math.min(times * 300, 3000)), // give up, don't spam
});

// Log the first error only, then stay quiet (avoids flooding logs when Redis is unreachable).
let redisErrorLogged = false;
redis.on("error", (err) => {
  if (!redisErrorLogged) {
    logger.warn(`Redis unavailable (${err.message}) — magic-links disabled until it reconnects`);
    redisErrorLogged = true;
  }
});
redis.on("ready", () => {
  redisErrorLogged = false;
});

export async function assertRedisConnection(): Promise<void> {
  await redis.connect();
  await redis.ping();
  logger.info("✅ Redis connected");
}

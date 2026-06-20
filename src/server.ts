import "@/models"; // register models + associations
import { createApp } from "@/app";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { assertDbConnection } from "@/config/database";
import { assertRedisConnection } from "@/config/redis";

async function main() {
  // Fail fast if infra is unreachable.
  await assertDbConnection();
  try {
    await assertRedisConnection();
  } catch (err) {
    logger.warn(`Redis unavailable at boot: ${(err as Error).message}`);
  }

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`🚀 dromo-api on http://localhost:${env.PORT}/api/v1`);
  });

  // Refresh model pricing from OpenRouter in the background (non-blocking).
  // A scheduled job will own this later; this keeps prices fresh on boot.
  void import("@/services/pricing").then(({ refreshPricing }) =>
    refreshPricing().catch((err) => logger.warn(`Pricing refresh failed: ${(err as Error).message}`)),
  );
}

main().catch((err) => {
  logger.error(`Fatal boot error: ${(err as Error).message}`);
  process.exit(1);
});

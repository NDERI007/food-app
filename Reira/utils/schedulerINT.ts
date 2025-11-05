import cron from "node-cron";
import { flushAndPublishAtomic } from "@utils/redisBatchScripts";
import { logger } from "@utils/logger";
import supabase from "@config/supabase";
import { DateTime } from "luxon";

const ORDERS_KEY = "admin:order-notifications:orders";
const TOTAL_KEY = "admin:order-notifications:total";
const LAST_KEY = "admin:order-notifications:lastUpdated";

/**
 * Polls Redis every minute and broadcasts batched orders to admins
 * Uses the Lua script to atomically flush and publish
 */
export function startBatchPublisher() {
  // Run every minute
  cron.schedule("*/1 * * * *", async () => {
    try {
      logger?.info("🔄 Running batch publisher...");

      // Atomically flush batch and publish to Redis pub/sub
      const result = await flushAndPublishAtomic({
        ordersKey: ORDERS_KEY,
        totalKey: TOTAL_KEY,
        lastKey: LAST_KEY,
        pubsubChannel: "admin:notifications",
        maxOrdersToSend: 50, // Send up to 50 orders per batch
      });

      if (!result) {
        logger?.info("📭 No orders to publish");
        return;
      }

      const [countStr, totalStr, ordersJson] = result;
      const count = parseInt(countStr, 10);
      const total = parseFloat(totalStr);
      const orders = JSON.parse(ordersJson || "[]");

      if (!orders.length) {
        logger?.info("📭 No valid orders in batch");
        return;
      }

      // Call RPC to insert orders + update daily total
      const today = DateTime.now().toISODate();
      logger?.info({ orders }, "🧾 Orders being sent to RPC");

      const { data, error } = await supabase.rpc("insert_payment_batch", {
        p_day: today,
        p_orders: orders,
      });
      logger?.info({ data, error }, "🧮 RPC result");

      if (error) {
        logger?.error({ error }, "❌ Failed to insert payment batch");
      } else {
        logger?.info(
          {
            count,
            totalRevenue: total,
            inserted: orders.length,
          },
          `✅ Published and saved batch of ${count} orders`
        );
      }
    } catch (error) {
      logger?.error({ error }, "❌ Batch publisher error");
    }
  });

  logger?.info("✅ Batch publisher cron started (every 1 minute)");
}

/**
 * Optional: Daily cleanup to reset tracking and clear old data
 */
export function startDailyCleanup() {
  // Run at midnight every day
  cron.schedule("0 0 * * *", async () => {
    try {
      const Redis = require("ioredis");
      const redis = new Redis(process.env.REDIS_URL!);

      // Clean up keys (the Lua script already deletes batch keys after publishing)
      // This is just for any orphaned keys
      await redis.del(
        "admin:processed-order-ids",
        ORDERS_KEY,
        TOTAL_KEY,
        LAST_KEY
      );

      logger?.info("🔄 Daily cleanup: Cleared notification tracking");
      await redis.quit();
    } catch (error) {
      logger?.error({ error }, "❌ Daily cleanup error");
    }
  });

  logger?.info("✅ Daily cleanup cron started (midnight)");
}

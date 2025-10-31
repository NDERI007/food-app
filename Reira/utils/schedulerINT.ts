import { flushAndPublishAtomic } from "./redisBatchScripts";
import supabase from "@config/supabase";
import { logger } from "./logger";
import { redis } from "@config/redis";

const ORDERS_KEY = "admin:order-notifications:orders";
const TOTAL_KEY = "admin:order-notifications:total";
const LAST_KEY = "admin:order-notifications:lastUpdated";

export const startBatchScheduler = () => {
  console.log("Batch scheduler initialized (1-minute window)");

  setInterval(async () => {
    try {
      const res = await flushAndPublishAtomic({
        ordersKey: ORDERS_KEY,
        totalKey: TOTAL_KEY,
        lastKey: LAST_KEY,
        pubsubChannel: "admin:notifications",
        maxOrdersToSend: 10,
      });

      if (!res) return;

      // Expect [count, total, ordersJson]
      const [countStr, totalStr, ordersJson] = res;
      const count = Number(countStr);
      const total = Number(totalStr);
      const orders = JSON.parse(ordersJson || "[]");

      const batchPayload = {
        type: "batch" as const,
        count,
        totalRevenue: total,
        orders,
        timestamp: new Date().toISOString(),
      };

      logger.info(batchPayload, "Batch flushed & published (atomic)");

      // 🔔 Publish to Redis channel for socket servers to relay
      await redis.publish("admin:notifications", JSON.stringify(batchPayload));

      // Persist aggregate to Postgres (RPC)
      const isoDay = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.rpc("increment_daily_revenue", {
        p_day: isoDay,
        p_amount: total.toString(),
      });

      if (error) throw error;
    } catch (err) {
      logger.error({ err }, "Error flushing/publishing atomic batch");
    }
  }, 60_000);
};

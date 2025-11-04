import { Worker, Job } from "bullmq";
import { connection } from "@config/redis";
import { addOrderAtomic } from "@utils/redisBatchScripts";
import { OrderNotificationJob } from "@utils/queueOrder";
import { logger } from "@utils/logger";

// Worker to process individual order notifications
const ORDERS_KEY = "admin:order-notifications:orders";
const TOTAL_KEY = "admin:order-notifications:total";
const LAST_KEY = "admin:order-notifications:lastUpdated";

export const orderNotificationWorker = new Worker(
  "order-notifications",
  async (job: Job<OrderNotificationJob>) => {
    const orderData = job.data;

    try {
      const res = await addOrderAtomic({
        ordersKey: ORDERS_KEY,
        totalKey: TOTAL_KEY,
        lastKey: LAST_KEY,
        order: orderData,
        amount: Number(orderData.totalAmount),
        expirySeconds: 120,
        maxListLen: 1000, // tune if you want
      });

      // res = [llen_str, total_str]
      if (res) {
        const [llenStr, totalStr] = res;
        logger?.info(
          {
            orderId: orderData.orderID,
            batchSize: Number(llenStr),
            total: Number(totalStr),
          },
          "Order added to atomic batch"
        );
      }

      return { batched: true };
    } catch (err) {
      logger?.error({ err, jobId: job.id }, "Failed to add order atomically");
      throw err; // let BullMQ handle retries according to queue config
    }
  },
  { connection, concurrency: 10 }
);

// Error handling
orderNotificationWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err);
});

orderNotificationWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

async function shutdown() {
  console.log("SIGTERM received. Draining jobs...");

  const timeout = setTimeout(() => {
    console.warn("⏱ Timeout reached. Forcing exit.");
    process.exit(1);
  }, 85_000);

  try {
    await orderNotificationWorker.pause(true);
    await orderNotificationWorker.close();
    clearTimeout(timeout);
    console.log("✅ Graceful shutdown complete.");
    process.exit(0);
  } catch (e) {
    console.error("❌ Shutdown error:", e);
    process.exit(1);
  }
}

export default orderNotificationWorker;

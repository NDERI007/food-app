import { Worker, Job } from "bullmq";
import { connection } from "@config/redis";
import { addOrderAtomic } from "@utils/redisBatchScripts";
import { OrderNotificationJob } from "@utils/queueOrder";
import { logger } from "@utils/logger";

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
        maxListLen: 1000,
      });

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
      throw err;
    }
  },
  { connection, concurrency: 10 }
);

// Event handlers
orderNotificationWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err);
});

orderNotificationWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

orderNotificationWorker.on("error", (err) => {
  console.error("❌ Worker error:", err);
});

export default orderNotificationWorker;

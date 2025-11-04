import supabase from "@config/supabase";
import orderNotificationQueue from "./queueOrder";
import Redis from "ioredis";
import { z } from "zod";
import { DateTime } from "luxon";

const redis = new Redis(process.env.REDIS_URL!);

// Redis keys
const PROCESSED_ORDERS_KEY = "admin:processed-order-ids"; // Track which orders we've queued
const LAST_POLL_KEY = "admin:last-poll-timestamp"; // Persist last checked timestamp

// Schema with automatic conversion of ISO strings → Date objects
const OrderSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  total_amount: z.union([z.number(), z.string().transform(Number)]),
  delivery_type: z.enum(["pickup", "delivery"]),
  payment_reference: z.string().nullable(),
  mpesa_phone: z.string(),
  created_at: z
    .string()
    .refine(
      (value) => DateTime.fromISO(value, { zone: "Africa/Nairobi" }).isValid,
      { message: "Invalid created_at timestamp" }
    )
    .transform((value) =>
      DateTime.fromISO(value, { zone: "Africa/Nairobi" }).toJSDate()
    ),
  updated_at: z
    .string()
    .refine(
      (value) => {
        const dt = DateTime.fromISO(value, { zone: "Africa/Nairobi" });
        return dt.isValid && dt <= DateTime.now();
      },
      { message: "Invalid or future updated_at timestamp" }
    )
    .transform((value) =>
      DateTime.fromISO(value, { zone: "Africa/Nairobi" }).toJSDate()
    ),
});

type ParsedOrder = z.infer<typeof OrderSchema>;

/**
 * Initialize last checked timestamp from Redis or current time
 */
async function initializeLastChecked(): Promise<Date> {
  const stored = await redis.get(LAST_POLL_KEY);
  if (stored) {
    console.log(`📅 Resuming from last poll: ${stored}`);
    return new Date(stored);
  }
  const now = new Date();
  await redis.set(LAST_POLL_KEY, now.toISOString());
  return now;
}

/**
 * Update last checked timestamp in Redis
 */
async function updateLastChecked(timestamp: Date): Promise<void> {
  await redis.set(LAST_POLL_KEY, timestamp.toISOString());
}

/**
 * Check if orders have already been processed (queued)
 * Returns only orders we haven't seen before
 */
async function filterUnprocessedOrders(
  orders: ParsedOrder[]
): Promise<ParsedOrder[]> {
  if (orders.length === 0) return [];

  // Use pipeline to check all order IDs at once
  const pipeline = redis.pipeline();
  orders.forEach((order) => {
    pipeline.sismember(PROCESSED_ORDERS_KEY, order.id);
  });

  const results = await pipeline.exec();
  if (!results) return orders;

  // Filter orders that returned 0 (not in set)
  const newOrders = orders.filter((order, index) => {
    const result = results[index];
    if (!result) return false;

    const [err, exists] = result;
    if (err) {
      console.error(`Error checking order ${order.id}:`, err);
      return false;
    }
    return exists === 0; // 0 = not processed, 1 = already processed
  });

  if (newOrders.length < orders.length) {
    console.log(
      `⏭️ Filtered out ${
        orders.length - newOrders.length
      } already-processed orders`
    );
  }

  return newOrders;
}

/**
 * Mark orders as processed in Redis with 48-hour expiry
 * This prevents re-queuing the same orders
 */
async function markOrdersAsProcessed(orderIds: string[]): Promise<void> {
  if (orderIds.length === 0) return;

  const pipeline = redis.pipeline();

  orderIds.forEach((id) => {
    pipeline.sadd(PROCESSED_ORDERS_KEY, id);
  });

  // Set expiry on the tracking set (48 hours - longer than batch window)
  pipeline.expire(PROCESSED_ORDERS_KEY, 172800);

  await pipeline.exec();

  console.log(`✅ Marked ${orderIds.length} orders as processed`);
}

/**
 * Main polling function
 */
export const startOrderPoller = async () => {
  console.log("🔍 Order poller initializing...");

  let lastCheckedAt = await initializeLastChecked();
  console.log(`✅ Order poller started. Checking every 60 seconds.`);

  setInterval(async () => {
    try {
      console.log(`🔄 Polling for orders since ${lastCheckedAt.toISOString()}`);

      // 1. Fetch new paid orders from Supabase
      const { data: rawOrders, error } = await supabase
        .from("orders")
        .select(
          "id, user_id, total_amount, delivery_type, payment_reference, mpesa_phone, created_at, updated_at"
        )
        .eq("payment_status", "paid")
        .gte("updated_at", lastCheckedAt.toISOString())
        .order("updated_at", { ascending: true });

      if (error) throw error;

      if (!rawOrders?.length) {
        console.log("📭 No new orders");
        return;
      }

      console.log(`📦 Found ${rawOrders.length} paid order(s)`);

      // 2. Validate and parse orders
      const validOrders: ParsedOrder[] = [];

      for (const rawOrder of rawOrders) {
        const parsed = OrderSchema.safeParse(rawOrder);

        if (!parsed.success) {
          console.error(
            "⚠️ Invalid order skipped:",
            rawOrder.id,
            parsed.error.issues
          );
          continue;
        }

        validOrders.push(parsed.data);
      }

      if (validOrders.length === 0) {
        console.log("⚠️ No valid orders after parsing");
        return;
      }

      // 3. Filter out orders we've already processed
      const unprocessedOrders = await filterUnprocessedOrders(validOrders);

      if (unprocessedOrders.length === 0) {
        console.log("⏭️ All orders already processed, skipping queue");

        // Still update timestamp to avoid re-checking same window
        const latestTimestamp = validOrders.at(-1)?.updated_at;
        if (latestTimestamp) {
          lastCheckedAt = latestTimestamp;
          await updateLastChecked(latestTimestamp);
        }
        return;
      }

      console.log(
        `✅ Processing ${unprocessedOrders.length} new orders (filtered ${
          validOrders.length - unprocessedOrders.length
        } duplicates)`
      );

      // 4. Add orders to BullMQ queue (which feeds the worker → Redis batch)
      const queuedIds: string[] = [];

      for (const order of unprocessedOrders) {
        try {
          await orderNotificationQueue.add("new-paid-order", {
            orderID: order.id,
            userID: order.user_id,
            totalAmount: Number(order.total_amount),
            deliveryType: order.delivery_type,
            paymentReference: order.payment_reference || "",
            mpesaPhone: order.mpesa_phone,
            createdAt: order.created_at,
          });

          queuedIds.push(order.id);
        } catch (queueError) {
          console.error(`❌ Failed to queue order ${order.id}:`, queueError);
        }
      }

      // 5. Mark successfully queued orders as processed
      if (queuedIds.length > 0) {
        await markOrdersAsProcessed(queuedIds);
        console.log(`📤 Queued ${queuedIds.length} orders for notification`);
      }

      // 6. Update last checked timestamp
      const latestTimestamp = unprocessedOrders.at(-1)?.updated_at;
      if (latestTimestamp) {
        lastCheckedAt = latestTimestamp;
        await updateLastChecked(latestTimestamp);
      }
    } catch (err) {
      console.error("❌ Order poller error:", err);
    }
  }, 60_000); // every 60 seconds
};

export default startOrderPoller;

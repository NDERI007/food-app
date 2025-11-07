import { redis } from "@config/redis";

/* -----------------------------
   Retry + Circuit Breaker Utils
----------------------------- */

type RetryOpts = {
  attempts?: number;
  initialDelayMs?: number;
  factor?: number;
  maxDelayMs?: number;
  jitter?: boolean;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class CircuitBreaker {
  private failureCount = 0;
  private state: "closed" | "open" | "half-open" = "closed";
  private nextAttempt = Date.now();

  constructor(private threshold = 3, private cooldownMs = 10_000) {}

  canAttempt() {
    if (this.state === "open" && Date.now() < this.nextAttempt) return false;
    if (this.state === "open" && Date.now() >= this.nextAttempt) {
      this.state = "half-open";
      return true;
    }
    return true;
  }

  success() {
    this.failureCount = 0;
    this.state = "closed";
  }

  fail() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = "open";
      this.nextAttempt = Date.now() + this.cooldownMs;
      console.warn(`🚨 Redis circuit opened for ${this.cooldownMs / 1000}s`);
    }
  }
}

const redisBreaker = new CircuitBreaker();

async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOpts = {}
): Promise<T> {
  const {
    attempts = 5,
    initialDelayMs = 200,
    factor = 2,
    maxDelayMs = 10_000,
    jitter = true,
  } = opts;

  if (!redisBreaker.canAttempt()) {
    throw new Error("CircuitBreaker: Redis temporarily disabled");
  }

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    attempt++;
    try {
      const res = await fn();
      redisBreaker.success();
      return res;
    } catch (err) {
      redisBreaker.fail();
      if (attempt >= attempts) throw err;
      const jitterMs = jitter
        ? Math.floor(Math.random() * Math.min(1000, delay))
        : 0;
      const waitMs = Math.min(maxDelayMs, delay) + jitterMs;
      console.warn(
        `Redis op failed (attempt ${attempt}) — retrying in ${waitMs}ms`,
        err
      );
      await sleep(waitMs);
      delay = Math.min(maxDelayMs, delay * factor);
    }
  }
}

/* -----------------------------
   Types
----------------------------- */

export interface OrderNotification {
  type: "ORDER_CONFIRMED";
  data: {
    id: string;
    payment_reference: string;
    amount: number;
    phone_number: string;
  };
  timestamp: string;
}

/* -----------------------------
   Notification Service
----------------------------- */

class NotificationService {
  private readonly hashKey = "admin:active_orders";
  private readonly channel = "admin:notifications";
  private readonly outboxKey = "outbox:notifications";

  /**
   * Add new confirmed order notification.
   * Uses Redis if available, otherwise outbox fallback.
   */
  async notifyConfirmedOrder(data: OrderNotification["data"]): Promise<void> {
    const notification: OrderNotification = {
      type: "ORDER_CONFIRMED",
      data,
      timestamp: new Date().toISOString(),
    };

    try {
      await withRetry(() =>
        redis.hset(this.hashKey, data.id, JSON.stringify(notification))
      );
      await withRetry(() =>
        redis.publish(
          this.channel,
          JSON.stringify({ action: "new", notification })
        )
      );

      console.log(`📢 New order notification saved + published: ${data.id}`);
    } catch (err) {
      console.error("❌ Failed to send notification — queued in outbox", err);
      await redis.rpush(
        this.outboxKey,
        JSON.stringify({
          action: "new",
          payload: notification,
          channel: this.channel,
          ts: Date.now(),
        })
      );
    }
  }

  /**
   * Remove order when admin accepts/declines it.
   */
  async removeOrder(orderId: string): Promise<void> {
    try {
      await withRetry(() => redis.hdel(this.hashKey, orderId));
      await withRetry(() =>
        redis.publish(
          this.channel,
          JSON.stringify({ action: "removed", orderId })
        )
      );
      console.log(`🗑️ Removed order from active list: ${orderId}`);
    } catch (err) {
      console.error("❌ Failed to remove order — queued in outbox", err);
      await redis.rpush(
        this.outboxKey,
        JSON.stringify({
          action: "removed",
          payload: { orderId },
          channel: this.channel,
          ts: Date.now(),
        })
      );
    }
  }

  /**
   * Retrieve all active orders.
   */
  async getActiveOrders(): Promise<OrderNotification[]> {
    const entries = await withRetry(() => redis.hgetall(this.hashKey));
    return Object.values(entries).map((raw) => JSON.parse(raw));
  }

  /**
   * Cleanup stale entries older than X hours.
   */
  async cleanupOldOrders(maxAgeHours = 12): Promise<void> {
    const now = Date.now();
    const entries = await withRetry(() => redis.hgetall(this.hashKey));

    for (const [id, raw] of Object.entries(entries)) {
      try {
        const notif = JSON.parse(raw) as OrderNotification;
        const age = (now - new Date(notif.timestamp).getTime()) / 3600000;
        if (age > maxAgeHours) {
          await redis.hdel(this.hashKey, id);
          console.log(`🧹 Cleaned stale order ${id} (${age.toFixed(1)}h)`);
        }
      } catch {
        await redis.hdel(this.hashKey, id);
      }
    }
  }

  /**
   * Replay queued outbox messages.
   */
  async processOutboxBatch(maxItems = 20): Promise<void> {
    for (let i = 0; i < maxItems; i++) {
      const raw = await redis.lpop(this.outboxKey);
      if (!raw) break;

      try {
        const item = JSON.parse(raw);
        if (item.action === "new") {
          await withRetry(() =>
            redis.hset(
              this.hashKey,
              item.payload.data.id,
              JSON.stringify(item.payload)
            )
          );
        }
        await withRetry(() =>
          redis.publish(
            item.channel,
            JSON.stringify({ action: item.action, ...item.payload })
          )
        );
      } catch (err) {
        console.error("⚠️ Outbox replay failed — requeueing", err);
        await redis.rpush(this.outboxKey, raw); // requeue for later
        break;
      }
    }
  }

  /**
   * Subscribe to Redis pub/sub for live notifications.
   */
  subscribeToRedis(
    onMessage: (msg: {
      action: string;
      notification?: any;
      orderId?: string;
    }) => void
  ) {
    const subscriber = redis.duplicate();

    subscriber.subscribe(this.channel, (err) => {
      if (err) {
        console.error("❌ Redis subscription failed:", err);
      } else {
        console.log(`📡 Listening on ${this.channel} for admin notifications`);
      }
    });

    subscriber.on("message", (channel, message) => {
      if (channel !== this.channel) return;
      try {
        const parsed = JSON.parse(message);
        onMessage(parsed);
      } catch (err) {
        console.error("❌ Invalid pub/sub payload:", err);
      }
    });
  }
}

export const notificationService = new NotificationService();

/* -----------------------------
   Background Outbox Loop
----------------------------- */
(async function backgroundOutboxLoop() {
  while (true) {
    try {
      await notificationService.processOutboxBatch(10);
    } catch (err) {
      console.error("Outbox loop error", err);
    }
    await sleep(3000);
  }
})();

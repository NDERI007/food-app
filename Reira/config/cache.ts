import Redis from "ioredis";
import { LRUCache } from "lru-cache";
import dotenv from "dotenv";
import z from "zod";

dotenv.config();

const envSchema = z.object({
  REDIS_URL: z.url(),
});
const env = envSchema.parse(process.env);
// --- Fallback: in-memory cache ---
const lru = new LRUCache<string, string>({
  max: 1000,
  ttl: 1000 * 60 * 5, // default 5 minutes
});

let redis: InstanceType<typeof Redis> | null = null;

if (env.REDIS_URL) {
  redis = new Redis(env.REDIS_URL, {
    retryStrategy: (times) => Math.min(times * 100, 2000), // reconnect backoff
  });

  redis.on("connect", () => {
    console.log("✅ Connected to Redis");
  });

  redis.on("error", (err) => {
    console.error("❌ Redis error:", err);
  });
} else {
  console.warn("⚠️ REDIS_URL not set — using LRU fallback.");
}

// --- Unified Cache Wrapper ---
export const cache = {
  async get(key: string): Promise<string | null> {
    if (redis) {
      return redis.get(key);
    }
    return lru.get(key) ?? null;
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (redis) {
      if (ttlSeconds !== undefined) {
        await redis.set(key, value, "EX", ttlSeconds);
      } else {
        await redis.set(key, value);
      }
      return;
    }

    if (ttlSeconds !== undefined) {
      lru.set(key, value, { ttl: ttlSeconds * 1000 });
    } else {
      lru.set(key, value);
    }
  },

  async del(key: string): Promise<void> {
    if (redis) {
      await redis.del(key);
      return;
    }
    lru.delete(key);
  },
  /**
   * Increment a numeric key (like Redis INCR)
   * Creates the key if it doesn't exist, starting from 0.
   * Returns the new incremented value.
   */
  async incr(key: string): Promise<number> {
    if (redis) {
      return redis.incr(key);
    }

    // LRU fallback
    const current = parseInt(lru.get(key) ?? "0", 10);
    const next = current + 1;
    lru.set(key, next.toString());
    return next;
  },

  /**
   * Get the remaining TTL (time-to-live) of a key in seconds
   * @returns -2 if key doesn't exist, -1 if key has no expiration, or seconds remaining
   */
  async ttl(key: string): Promise<number> {
    if (redis) {
      return await redis.ttl(key);
    }

    // LRU fallback
    const ttl = lru.getRemainingTTL(key);
    if (ttl === 0) return -2; // Key doesn't exist
    if (ttl === Infinity) return -1; // No expiration
    return Math.floor(ttl / 1000); // Convert ms to seconds
  },

  /**
   * Set an expiration time on an existing key
   * @returns true if expiration was set, false if key doesn't exist
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (redis) {
      const result = await redis.expire(key, seconds);
      return result === 1; // Redis returns 1 on success, 0 if key doesn't exist
    }

    // LRU fallback
    const value = lru.get(key);
    if (value === undefined) return false;

    lru.set(key, value, { ttl: seconds * 1000 });
    return true;
  },
};
export { redis };
export default cache;
//If you stringify everything (even in LRU), you mimic Redis perfectly and avoid mutation issues.

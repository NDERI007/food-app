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
};
export { redis };
export default cache;
//If you stringify everything (even in LRU), you mimic Redis perfectly and avoid mutation issues.

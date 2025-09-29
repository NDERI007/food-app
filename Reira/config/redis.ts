import Redis from "ioredis";
import { createClient as createRedisClient } from "redis";
import { LRUCache } from "lru-cache";

const redis = new Redis(process.env.REDIS_URL!);

export default redis;

const REDIS_URL = process.env.REDIS_URL || "";

let redisReady = false;
let redisClient: ReturnType<typeof createRedisClient> | null = null;

if (REDIS_URL) {
  redisClient = createRedisClient({ url: REDIS_URL });
  redisClient.on("error", (err) => {
    console.error("Redis error:", err);
    redisReady = false;
  });
  redisClient
    .connect()
    .then(() => {
      redisReady = true;
      console.log("✅ Connected to Redis");
    })
    .catch((err) => {
      console.error("Redis connect failed:", err);
      redisReady = false;
    });
} else {
  console.warn("⚠️ REDIS_URL not set — using LRU fallback.");
}

const lru = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export { redisClient, redisReady, lru };

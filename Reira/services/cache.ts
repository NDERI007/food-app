import { redisClient, redisReady, lru } from "../config/redis";

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    if (redisReady && redisClient) {
      const raw = await redisClient.get(key);
      return raw ? JSON.parse(raw) : null;
    }
  } catch (err) {
    console.warn("Redis GET failed, using LRU:", err);
  }
  return lru.get(key) ?? null;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = 600) {
  const raw = JSON.stringify(value);
  try {
    if (redisReady && redisClient) {
      await redisClient.set(key, raw, { EX: ttlSeconds });
      return;
    }
  } catch (err) {
    console.warn("Redis SET failed, using LRU:", err);
  }
  lru.set(key, value, { ttl: ttlSeconds * 1000 });
}

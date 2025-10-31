import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("❌ REDIS_URL is not set in environment variables");
}

export const redis = new Redis(redisUrl, {
  // If the URL starts with `rediss://` (Upstash), enable TLS.
  // Retry strategy: waits longer between retries up to 2 seconds
  retryStrategy: (attempt) => Math.min(attempt * 200, 2000),

  // Prevents ioredis from rejecting when commands take too long
  maxRetriesPerRequest: null,

  ...(redisUrl.startsWith("rediss://")
    ? { tls: { rejectUnauthorized: false } }
    : {}),
});

export const connection = new Redis(redisUrl, {
  retryStrategy: (times) => Math.min(times * 200, 2000),
  maxRetriesPerRequest: null,
  ...(redisUrl.startsWith("rediss://")
    ? {
        tls: {
          rejectUnauthorized: false, // upstash requires this
        },
      }
    : {}),
});

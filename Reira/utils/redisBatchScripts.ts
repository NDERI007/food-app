// redisBatchScripts.ts
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

export const connection = new Redis(process.env.REDIS_URL!, {
  retryStrategy: (times) => Math.min(times * 100, 2000),
  maxRetriesPerRequest: null,
});

/**
 * Lua: add order atomically (RPUSH + INCRBYFLOAT + EXPIRE + LTRIM)
 * KEYS: 1=orders_list_key, 2=total_key, 3=last_key
 * ARGV: 1=order_json, 2=order_amount, 3=expiry_seconds, 4=last_iso, 5=max_list_length
 */
const ADD_ORDER_LUA = `
local orders_key = KEYS[1]
local total_key  = KEYS[2]
local last_key   = KEYS[3]

local order_json = ARGV[1]
local order_amount = ARGV[2]
local expiry = tonumber(ARGV[3]) or 120
local last_iso = ARGV[4] or ""
local max_len = tonumber(ARGV[5]) or 1000

redis.call('RPUSH', orders_key, order_json)
-- keep last max_len entries
redis.call('LTRIM', orders_key, -max_len, -1)

local total = redis.call('INCRBYFLOAT', total_key, order_amount)
redis.call('SET', last_key, last_iso)
redis.call('EXPIRE', orders_key, expiry)
redis.call('EXPIRE', total_key, expiry)
redis.call('EXPIRE', last_key, expiry)

local llen = redis.call('LLEN', orders_key)
return { tostring(llen), tostring(total) }
`;

/**
 * Lua: flush & publish atomically
 * KEYS: 1=orders_list_key, 2=total_key, 3=last_key
 * ARGV: 1=pubsub_channel, 2=max_orders_to_send
 * Returns nil when nothing to publish, else {len_str, total_str}
 * It publishes JSON message: { type:'batch', count:len, totalRevenue:total, orders:[...], timestamp:lastUpdated }
 */
const FLUSH_PUBLISH_LUA = `
local orders_key = KEYS[1]
local total_key  = KEYS[2]
local last_key   = KEYS[3]

local channel = ARGV[1] or "admin:notifications"
local n = tonumber(ARGV[2]) or 10

local len = redis.call('LLEN', orders_key)
if not len or tonumber(len) == 0 then
  return nil
end

local start_idx = -n
local orders = redis.call('LRANGE', orders_key, start_idx, -1)

local total = redis.call('GET', total_key) or "0"
local lastUpdated = redis.call('GET', last_key) or ""

local orders_json = ""
if #orders > 0 then
  orders_json = table.concat(orders, ",")
end

local message = '{"type":"batch","count":' .. tostring(len)
message = message .. ',"totalRevenue":' .. tostring(total)
message = message .. ',"orders":[' .. orders_json .. ']'
message = message .. ',"timestamp":"' .. tostring(lastUpdated) .. '"}'
redis.call('PUBLISH', channel, message)

-- clear keys
redis.call('DEL', orders_key, total_key, last_key)

return { tostring(len), tostring(total), orders_json }
`;

// Register commands via defineCommand (better than EVAL on each call)
connection.defineCommand("redisAddOrder", {
  numberOfKeys: 3,
  lua: ADD_ORDER_LUA,
});

connection.defineCommand("redisFlushPublish", {
  numberOfKeys: 3,
  lua: FLUSH_PUBLISH_LUA,
});

// Typings for defined commands (ioredis doesn't have these by default)
type RedisAddOrderResult =
  | [string /* list length as string */, string /* total as string */]
  | null;
type RedisFlushResult =
  | [string /* count */, string /* total */, string /* orders */]
  | null;

export async function addOrderAtomic(opts: {
  ordersKey: string;
  totalKey: string;
  lastKey: string;
  order: any; // serializable
  amount: number;
  expirySeconds?: number;
  maxListLen?: number;
}) {
  const {
    ordersKey,
    totalKey,
    lastKey,
    order,
    amount,
    expirySeconds = 120,
    maxListLen = 1000,
  } = opts;

  const orderJson = JSON.stringify(order);

  // @ts-ignore - calling custom defineCommand
  const res: RedisAddOrderResult = await (connection as any).redisAddOrder(
    ordersKey,
    totalKey,
    lastKey,
    orderJson,
    String(amount),
    String(expirySeconds),
    String(maxListLen)
  );

  return res; // either [llen, total] or null (should not be null for add)
}

export async function flushAndPublishAtomic(opts: {
  ordersKey: string;
  totalKey: string;
  lastKey: string;
  pubsubChannel?: string;
  maxOrdersToSend?: number;
}) {
  const {
    ordersKey,
    totalKey,
    lastKey,
    pubsubChannel = "admin:notifications",
    maxOrdersToSend = 10,
  } = opts;

  // @ts-ignore - calling custom defineCommand
  const res: RedisFlushResult = await (connection as any).redisFlushPublish(
    ordersKey,
    totalKey,
    lastKey,
    pubsubChannel,
    String(maxOrdersToSend)
  );

  return res; // null or [countStr, totalStr]
}

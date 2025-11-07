import { connection } from "@config/redis";

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
local expiry = tonumber(ARGV[3]) or 300
local last_iso = ARGV[4]
local max_len = tonumber(ARGV[5]) or 1000

redis.call('RPUSH', orders_key, order_json)
-- keep last max_len entries
redis.call('LTRIM', orders_key, -max_len, -1)

local total = redis.call('INCRBYFLOAT', total_key, order_amount)
redis.call('SET', last_key, last_iso)

-- Set expiry on all keys (5 minutes to be safe)
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
 * Returns nil when nothing to publish, else {len_str, total_str, orders_json}
 */
const FLUSH_PUBLISH_LUA = `
local orders_key = KEYS[1]
local total_key  = KEYS[2]
local last_key   = KEYS[3]

local channel = ARGV[1] or "admin:notifications"
local max_orders = tonumber(ARGV[2]) or 50

-- Check if key exists first
local exists = redis.call('EXISTS', orders_key)
if exists == 0 then
  return nil
end

local len = redis.call('LLEN', orders_key)
if not len or tonumber(len) == 0 then
  return nil
end

-- Get ALL orders (not just last N)
local orders = redis.call('LRANGE', orders_key, 0, -1)

-- If we have more than max_orders, only send the most recent ones
if #orders > max_orders then
  local start_idx = #orders - max_orders + 1
  local recent_orders = {}
  for i = start_idx, #orders do
    table.insert(recent_orders, orders[i])
  end
  orders = recent_orders
end

local total = redis.call('GET', total_key) or "0"
local lastUpdated = redis.call('GET', last_key) or ""

-- Build orders array
local orders_json = "[]"
if #orders > 0 then
  orders_json = "[" .. table.concat(orders, ",") .. "]"
end

-- Build complete message
local message = string.format(
  '{"type":"batch","count":%d,"totalRevenue":%s,"orders":%s,"timestamp":"%s"}',
  tonumber(len),
  tostring(total),
  orders_json,
  tostring(lastUpdated)
)

-- Publish to channel
redis.call('PUBLISH', channel, message)

-- Clear keys after successful publish
redis.call('DEL', orders_key, total_key, last_key)

-- Return summary
return { tostring(len), tostring(total), orders_json }
`;

// Register commands
connection.defineCommand("redisAddOrder", {
  numberOfKeys: 3,
  lua: ADD_ORDER_LUA,
});

connection.defineCommand("redisFlushPublish", {
  numberOfKeys: 3,
  lua: FLUSH_PUBLISH_LUA,
});

// Typings
type RedisAddOrderResult =
  | [string /* list length */, string /* total */]
  | null;

type RedisFlushResult =
  | [string /* count */, string /* total */, string /* orders JSON */]
  | null;

export async function addOrderAtomic(opts: {
  ordersKey: string;
  totalKey: string;
  lastKey: string;
  order: any;
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
    expirySeconds = 300, // Increased to 5 minutes
    maxListLen = 1000,
  } = opts;

  const orderJson = JSON.stringify(order);
  const timestamp = new Date().toISOString();

  // @ts-ignore
  const res: RedisAddOrderResult = await (connection as any).redisAddOrder(
    ordersKey,
    totalKey,
    lastKey,
    orderJson,
    String(amount),
    String(expirySeconds),
    timestamp,
    String(maxListLen)
  );

  return res;
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
    maxOrdersToSend = 50, // Increased default
  } = opts;

  // @ts-ignore
  const res: RedisFlushResult = await (connection as any).redisFlushPublish(
    ordersKey,
    totalKey,
    lastKey,
    pubsubChannel,
    String(maxOrdersToSend)
  );

  return res;
}

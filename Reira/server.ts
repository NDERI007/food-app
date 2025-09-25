import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import fetch from "node-fetch";
import rateLimit from "express-rate-limit";
import { createClient as createRedisClient } from "redis";
import { LRUCache } from "lru-cache";
import { createClient } from "@supabase/supabase-js";
import validateQuery, { PlacesQuerySchema } from "./utils/placeQuery";

dotenv.config();

/* ---------------- env ---------------- */
const PORT = parseInt(process.env.PORT || "8787", 10);
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const GOOGLE_KEY = process.env.GOOGLE_CLOUD_KEY || "";
const COUNTRY = process.env.COUNTRY || "";
const REDIS_URL = process.env.REDIS_URL || "";
const CORS_ORIGINS = process.env.CORS_ORIGINS || "";

// Campus bias (required for autocomplete bias)
const TOWN_LAT = process.env.TOWN_LAT || "";
const TOWN_LNG = process.env.TOWN_LNG || "";
const TOWN_RADIUS_METERS = process.env.TOWN_RADIUS_METERS || ""; // meters, e.g. "1500"

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

/* ---------------- Redis client ---------------- */
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
      console.log("Connected to Redis");
    })
    .catch((err) => {
      console.error("Redis connect failed:", err);
      redisReady = false;
    });
} else {
  console.warn(
    "REDIS_URL not set — Redis caching disabled, using LRU fallback."
  );
}

/* ---------------- LRU fallback cache ---------------- */
const FALLBACK_TTL_MS = 1000 * 60 * 5; // 5 min default
const LRU_MAX_ITEMS = 1000; // tune for memory budget

const lru = new LRUCache<string, any>({
  max: LRU_MAX_ITEMS,
  ttl: FALLBACK_TTL_MS,
});

/* cacheGet / cacheSet use Redis when available; fallback to LRU */
async function cacheGet(key: string) {
  try {
    if (redisReady && redisClient) {
      const raw = await redisClient.get(key);
      if (!raw) return null;
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Redis GET failed, using LRU fallback:", err);
  }
  return lru.get(key) ?? null;
}

async function cacheSet(key: string, value: any, ttlSeconds = 600) {
  const raw = JSON.stringify(value);
  try {
    if (redisReady && redisClient) {
      await redisClient.set(key, raw, { EX: ttlSeconds });
      return;
    }
  } catch (err) {
    console.warn("Redis SET failed, falling back to LRU:", err);
  }
  lru.set(key, value, { ttl: ttlSeconds * 1000 });
}

/* ---------------- helpers ---------------- */
function safeQ(q?: string) {
  if (!q) return "";
  return String(q).trim().slice(0, 200);
}

/* ---------------- DB search ----------------
   - short queries use the view 'places_with_latlng' (lat/lng returned by DB)
   - fuzzy RPC (places_search_rpc) is used for >=3 chars and returns lat/lng
*/
async function dbSearch(q: string, limit = 10) {
  q = (q || "").trim();
  if (!q) return [];

  const cacheKey = `db:${q.toLowerCase()}|${limit}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  if (q.length < 3) {
    const qLower = q.toLowerCase();
    const { data, error } = await supabase
      .from("places_with_latlng")
      .select("id, name, display_addr, lat, lng")
      .ilike("name_norm", `${qLower}%`)
      .limit(limit);

    if (error) {
      console.error("Supabase short-query error:", error);
      return [];
    }

    const mapped = (data || []).map((r: any) => ({
      source: "db",
      id: r.id,
      main_text: r.name,
      secondary_text: r.display_addr ?? null,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      sim: null,
    }));

    await cacheSet(cacheKey, mapped, 60 * 5);
    return mapped;
  }

  const { data, error } = await supabase.rpc("places_search_rpc", {
    p_q: q,
    p_limit: limit,
    p_sim_threshold: 0.15,
  });

  if (error) {
    console.error("RPC error:", error);
    return [];
  }

  const mapped = (data || []).map((r: any) => ({
    source: "db",
    id: r.id,
    main_text: r.name,
    secondary_text: r.display_addr ?? null,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    sim: r.sim ?? null,
  }));

  await cacheSet(cacheKey, mapped, 60 * 10);
  return mapped;
}

/* ---------------- Google autocomplete (always campus-biased) ---------------- */

interface GoogleOpts {
  sessionToken?: string;
}

async function googleAutocomplete(input: string, opts: GoogleOpts = {}) {
  if (!GOOGLE_KEY) return [];

  // Build a cache key so repeated queries are faster
  const biasPart =
    TOWN_LAT && TOWN_LNG && TOWN_RADIUS_METERS
      ? `|campus:${TOWN_LAT},${TOWN_LNG},${TOWN_RADIUS_METERS}`
      : "|campus:none";
  const cacheKey = `google:${input.toLowerCase()}${biasPart}`;

  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const url = "https://places.googleapis.com/v1/places:autocomplete";

  // Build request body for new API
  const body: any = {
    input,
    sessionToken: opts.sessionToken,
    languageCode: "en-KE", // optional but good for Kenya
  };

  if (COUNTRY) {
    body.includedRegionCodes = [COUNTRY]; // e.g. ["KE"]
  }

  // Restrict strictly to campus radius if defined
  if (TOWN_LAT && TOWN_LNG && TOWN_RADIUS_METERS) {
    body.locationRestriction = {
      circle: {
        center: {
          latitude: Number(TOWN_LAT),
          longitude: Number(TOWN_LNG),
        },
        radius: Number(TOWN_RADIUS_METERS),
      },
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as any;

    if (json.error) {
      console.error("Google Autocomplete error", json.error);
      return [];
    }

    // Map new API response predictions
    const preds = (json.suggestions || [])
      .map((s: any) => {
        if (s.placePrediction) {
          // ✅ Exact place with a valid placeId
          return {
            source: "google",
            place_id: s.placePrediction.placeId,
            name: s.placePrediction.text?.text || "",
            type: "place", // you can tag this to distinguish later
          };
        } else if (s.queryPrediction) {
          // ⚠️ No placeId → fallback, let frontend handle details
          return {
            source: "google",
            place_id: null,
            name: s.queryPrediction.text?.text || "",
            type: "query", // tag as query
          };
        }
        return null;
      })
      .filter(Boolean);

    await cacheSet(cacheKey, preds, 60 * 30); // 30 min TTL
    return preds;
  } catch (err) {
    console.error("Google Autocomplete fetch failed", err);
    return [];
  }
}

/* ---------------- Express app ---------------- */
const app = express();

app.use(helmet());

if (CORS_ORIGINS) {
  const allowed = CORS_ORIGINS.split(",").map((s) => s.trim());
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // allow server-to-server or CURL
        if (allowed.includes(origin)) return cb(null, true);
        return cb(new Error("Not allowed by CORS"));
      },
    })
  );
} else {
  app.use(cors());
}

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);
app.use(express.json());

/* GET /api/places?q=...&limit=...&sessiontoken=... */
app.get("/api/places", validateQuery(PlacesQuerySchema), async (req, res) => {
  try {
    const parsed = req.parsedQuery!;
    if (!parsed || !parsed.q) return res.json([]);

    const q = parsed.q;
    // parsed.limit is already a number and defaulted to 10 by the schema
    // keep the previous upper cap of 20 for exact backwards-compatibility
    const useLimit = Math.min(parsed.limit ?? 10, 20);
    const sessionToken = parsed.sessiontoken;

    // build opts only when we actually have a string
    const opts = sessionToken ? { sessionToken } : {};
    // 1. DB-first
    const dbResults = await dbSearch(q, useLimit);
    if (dbResults && dbResults.length > 0) {
      return res.json(dbResults.slice(0, useLimit));
    }

    // 2. fallback to Google (biased to campus)
    const googleResults = await googleAutocomplete(q, opts);
    return res.json(googleResults.slice(0, useLimit));
  } catch (err) {
    console.error("API error", err);
    return res.status(500).json({ error: "server_error" });
  }
});

app.listen(PORT, () => {
  console.log(`Autocomplete API listening on http://localhost:${PORT}`);
});

/* safety: unhandled rejections */
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

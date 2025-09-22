import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const PORT = parseInt(process.env.PORT || "8787", 10);
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const GOOGLE_KEY = process.env.GOOGLE_CLOUD_KEY! || "";
const COUNTRY = process.env.COUNTRY! || ""; // optional component filter like "ke"

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
interface GooglePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

interface GoogleAutocompleteResponse {
  status: string;
  error_message?: string;
  predictions?: GooglePrediction[];
}
const app = express();
app.use(cors());
app.use(express.json());

// sanitize/trim input
function safeQ(q?: string) {
  if (!q) return "";
  return String(q).trim().slice(0, 200);
}

/**
 * dbSearch - call the places_search_rpc (DB-only fuzzy search)
 * - p_q: query (required)
 * - limit: how many rows to return
 * Behavior:
 * - for very short queries (<3) do a prefix ILIKE on name_norm for less noise
 * - otherwise call the RPC which expects name_norm to exist and indexed
 */
async function dbSearch(q: string, limit = 10) {
  q = (q || "").trim();
  if (!q) return [];

  // Short-query prefix fallback (avoid noisy trigrams)
  if (q.length < 3) {
    const qLower = q.toLowerCase();
    const { data, error } = await supabase
      .from("places")
      .select("id, name, display_addr, geom_geog")
      .ilike("name_norm", `${qLower}%`)
      .limit(limit);

    if (error) {
      console.error("Supabase short-query error:", error);
      return [];
    }

    return (data || []).map((r: any) => ({
      source: "db",
      id: r.id,
      main_text: r.name,
      secondary_text: r.display_addr ?? null,
      lat: r.geom_geog?.coordinates ? r.geom_geog.coordinates[1] : null,
      lng: r.geom_geog?.coordinates ? r.geom_geog.coordinates[0] : null,
      sim: null,
    }));
  }

  // Normal fuzzy RPC call
  const { data, error } = await supabase.rpc("places_search_rpc", {
    p_q: q,
    p_limit: limit,
    p_sim_threshold: 0.15,
  });

  if (error) {
    console.error("RPC error:", error);
    return [];
  }

  // normalize RPC rows
  return (data || []).map((r: any) => ({
    source: "db",
    id: r.id,
    main_text: r.name,
    secondary_text: r.display_addr ?? null,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    sim: r.sim ?? null,
  }));
}

/**
 * googleAutocomplete - falls back to Google Places Autocomplete
 * returns predictions shaped similarly (no lat/lng here; Place Details needed)
 */
async function googleAutocomplete(input: string) {
  if (!GOOGLE_KEY) return [];

  const base = "https://maps.googleapis.com/maps/api/place/autocomplete/json";
  const params = new URLSearchParams({
    key: GOOGLE_KEY,
    input,
  });
  if (COUNTRY) params.set("components", `country:${COUNTRY}`);
  const url = `${base}?${params.toString()}`;

  try {
    const res = await fetch(url);
    const json = (await res.json()) as GoogleAutocompleteResponse;
    if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
      console.error(
        "Google Autocomplete error",
        json.status,
        json.error_message
      );
      return [];
    }

    const preds = (json.predictions || []).map((p: any) => ({
      source: "google",
      place_id: p.place_id,
      main_text: p.structured_formatting?.main_text || p.description,
      secondary_text: p.structured_formatting?.secondary_text || null,
      description: p.description,
    }));
    return preds;
  } catch (err) {
    console.error("Google Autocomplete fetch failed", err);
    return [];
  }
}

/**
 * GET /api/places?q=&limit=
 * - q required-ish
 */
app.get("/api/places", async (req, res) => {
  try {
    const rawQ = safeQ(req.query.q as string);
    if (!rawQ || rawQ.length === 0) return res.json([]);

    const q = rawQ;
    const limit = Number(req.query.limit || 10);

    // 1) DB-first (fuzzy)
    const dbResults = await dbSearch(q, limit);
    if (dbResults && dbResults.length > 0) {
      return res.json(dbResults.slice(0, limit));
    }

    // 2) fallback to Google Places Autocomplete
    const googleResults = await googleAutocomplete(q);
    return res.json(googleResults.slice(0, limit));
  } catch (err) {
    console.error("API error", err);
    res.status(500).json({ error: "server_error" });
  }
});

app.listen(PORT, () => {
  console.log(`Autocomplete API listening on http://localhost:${PORT}`);
});

import supabase from "@config/supabase";
import cache from "@config/cache";
import { z } from "zod";

// ✅ Zod schema for what Supabase RPC returns
const PlaceSearchRowSchema = z.object({
  id: z.number(),
  name: z.string(),
  display_addr: z.string(),
  lat: z.number(),
  lng: z.number(),
  sim: z.number().optional(), // optional, since not always needed
});

// ✅ Schema for an array of results
const PlaceSearchResultsSchema = z.array(PlaceSearchRowSchema);

// ✅ Type inference from schema
type PlaceSearchRow = z.infer<typeof PlaceSearchRowSchema>;

// ✅ Your existing interface for frontend mapping
export interface PlaceResult {
  source: "db";
  id: number;
  main_text: string;
  secondary_text: string | null;
  lat: number | null;
  lng: number | null;
}

export async function dbSearch(q: string, limit = 10): Promise<PlaceResult[]> {
  q = q.trim();
  if (!q) return [];

  const cacheKey = `db:${q.toLowerCase()}|${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  let data: PlaceSearchRow[] = [];
  let error: any;

  if (q.length < 3) {
    // Simple prefix search
    const { data: resData, error: resError } = await supabase
      .from("places_with_latlng")
      .select("id, name, display_addr, lat, lng")
      .ilike("name_norm", `${q.toLowerCase()}%`)
      .limit(limit);

    error = resError;
    const parsed = PlaceSearchResultsSchema.safeParse(resData ?? []);
    if (!parsed.success) {
      console.error("Invalid table data shape", z.treeifyError(parsed.error));
      data = [];
    } else {
      data = parsed.data;
    }
  } else {
    // RPC full-text search
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "places_search_rpc",
      {
        p_q: q,
        p_limit: limit,
        p_sim_threshold: 0.15,
      }
    );

    error = rpcError;

    // ✅ Validate shape at runtime
    const parsed = PlaceSearchResultsSchema.safeParse(rpcData ?? []);
    if (!parsed.success) {
      console.error("Invalid RPC data shape", z.treeifyError(parsed.error));
      data = [];
    } else {
      data = parsed.data;
    }
  }

  if (error) {
    console.error("Supabase search error:", error);
    return [];
  }

  // ✅ Map safely to your frontend-friendly format
  const mapped: PlaceResult[] = data.map((r) => ({
    source: "db",
    id: r.id,
    main_text: r.name,
    secondary_text: r.display_addr ?? null,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
  }));

  await cache.set(
    cacheKey,
    JSON.stringify(mapped),
    q.length < 3 ? 60 * 5 : 60 * 10
  );

  return mapped;
}

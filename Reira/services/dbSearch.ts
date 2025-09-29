import supabase from "../config/supabase";
import { cacheGet, cacheSet } from "./cache";

export async function dbSearch(q: string, limit = 10) {
  q = q.trim();
  if (!q) return [];

  const cacheKey = `db:${q.toLowerCase()}|${limit}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  if (q.length < 3) {
    const { data, error } = await supabase
      .from("places_with_latlng")
      .select("id, name, display_addr, lat, lng")
      .ilike("name_norm", `${q.toLowerCase()}%`)
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

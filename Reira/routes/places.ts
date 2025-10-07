import express from "express";
import validateQuery, { PlacesQuerySchema } from "@utils/placeQuery";
import { dbSearch } from "@services/dbSearch";
import { googleAutocomplete } from "@services/PlaceAuto";
import { getPlaceDetails } from "@services/PlaceDetails";
import cache from "@config/cache";
import supabase from "@config/supabase";

const router = express.Router();

router.get("/places", validateQuery(PlacesQuerySchema), async (req, res) => {
  try {
    const parsed = req.parsedQuery!;
    if (!parsed.q) return res.json([]);

    const q = parsed.q;
    const limit = Math.min(parsed.limit ?? 10, 20);
    const sessionToken = parsed.sessionToken;

    const dbResults = await dbSearch(q, limit);
    if (dbResults.length > 0) {
      return res.json(dbResults.slice(0, limit));
    }

    const googleResults = await googleAutocomplete(q, sessionToken);
    return res.json(googleResults.slice(0, limit));
  } catch (err) {
    console.error("API error", err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.get("/place-details/", async (req, res) => {
  const { placeId, sessionToken, label, description } = req.body;
  const sessionId = req.cookies.sessionId; // 🍪 comes from client cooki

  // Basic validation
  if (!placeId) {
    return res.status(400).json({ error: "Missing placeId parameter" });
  }

  if (!sessionToken || typeof sessionToken !== "string") {
    return res
      .status(400)
      .json({ error: "Missing or invalid sessionToken query parameter" });
  }

  if (!sessionId)
    return res.status(401).json({ error: "Missing session cookie" });

  try {
    // Lookup session in Redis
    const email = await cache.get(`session:${sessionId}`);
    const location = await getPlaceDetails(placeId, sessionToken);
    if (!location) return res.status(404).json({ error: "Place not found" });
    const { formatted_address, lat, lng } = location;
    const { data, error } = await supabase.rpc("upsert_address", {
      user_email: email,
      address_label: label,
      address_description: description,
      address_text: formatted_address,
      address_place_id: placeId,
      address_lat: lat,
      address_lng: lng,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error in /places/:placeId endpoint:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

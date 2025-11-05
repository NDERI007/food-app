import express from "express";
import validateQuery, { PlacesQuerySchema } from "@utils/placeQuery";
import { dbSearch } from "@services/dbSearch";
import { googleAutocomplete } from "@services/PlaceAuto";
import { getPlaceDetails } from "@services/PlaceDetails";
import supabase from "@config/supabase";
import { withAuth } from "middleware/auth";

const router = express.Router();

router.get("/auto-comp", validateQuery(PlacesQuerySchema), async (req, res) => {
  try {
    const parsed = req.parsedQuery!;
    if (!parsed.q) return res.json([]);

    const q = parsed.q;
    const limit = Math.min(parsed.limit ?? 10, 20);
    const sessionToken = parsed.sessionToken;

    // Fetch both simultaneously
    const [dbResults, googleResults] = await Promise.all([
      dbSearch(q, limit),
      googleAutocomplete(q, sessionToken),
    ]);

    // Deduplicate by place_id - DB results take priority
    const seen = new Set<string>();
    const combined = [];

    // Add DB results first
    for (const place of dbResults) {
      if (place.place_id) {
        seen.add(place.place_id);
      }
      combined.push(place);
    }

    // Add Google results only if not already in DB
    for (const place of googleResults) {
      if (!place.place_id || !seen.has(place.place_id)) {
        if (place.place_id) {
          seen.add(place.place_id);
        }
        combined.push(place);
      }
    }

    return res.json(combined.slice(0, limit));
  } catch (err) {
    console.error("API error", err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/place-details", withAuth(), async (req, res) => {
  const { placeId, sessionToken, label, main_text, secondary_text } = req.body;

  // Basic validation
  if (!placeId) {
    return res.status(400).json({ error: "Missing placeId" });
  }

  if (!sessionToken) {
    return res.status(400).json({ error: "Missing sessionToken" });
  }

  try {
    const userID = req.user?.userID;

    if (!userID) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Fetch from Google Place Details API
    const location = await getPlaceDetails(placeId, sessionToken);
    if (!location) {
      return res.status(404).json({ error: "Place not found" });
    }

    console.log("Place details fetched:", location);

    const lat = location.lat;
    const lng = location.lng;

    // Validate coordinates
    if (lat == null || lng == null) {
      return res.status(400).json({ error: "Missing coordinates from Google" });
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const { data, error } = await supabase
      .from("addresses")
      .upsert(
        {
          user_id: userID,
          label: label,
          place_name: main_text,
          address: secondary_text,
          place_id: placeId,
          lat: lat,
          lng: lng,
        },
        {
          onConflict: "user_id,place_id",
        }
      )
      .select("id");

    const id = data?.[0]?.id ?? null;

    console.log("Supabase response:", { data, error });
    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    // Return the complete address data
    return res.json({
      success: true,
      address: {
        id,
        label,
        main_text: main_text,
        secondary_text: secondary_text,
        lat: lat,
        lng: lng,
        place_id: placeId,
      },
      message: "Address fetched from Google and saved",
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

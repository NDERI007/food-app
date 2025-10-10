import express from "express";
import validateQuery, { PlacesQuerySchema } from "@utils/placeQuery";
import { dbSearch } from "@services/dbSearch";
import { googleAutocomplete } from "@services/PlaceAuto";
import { getPlaceDetails } from "@services/PlaceDetails";
import cache from "@config/cache";
import supabase from "@config/supabase";
import { requireAuth } from "middleware/auth";

const router = express.Router();

router.get("/auto-comp", validateQuery(PlacesQuerySchema), async (req, res) => {
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

router.post("/place-details", requireAuth, async (req, res) => {
  const {
    source, // "db" or "google"
    placeId, // For Google results
    id, // For DB results
    sessionToken, // Only needed for Google
    label,
    main_text,
    secondary_text,
    lat, // Present in DB results
    lng, // Present in DB results
  } = req.body;

  // Basic validation
  // Basic validation
  if (!source) {
    return res.status(400).json({ error: "Missing source parameter" });
  }

  if (source === "google" && !placeId) {
    return res.status(400).json({ error: "Missing placeId for Google result" });
  }

  if (source === "db" && !id) {
    return res.status(400).json({ error: "Missing id for DB result" });
  }

  try {
    // Lookup session in Redis
    const userID = req.user?.userID;

    if (!userID) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    let locationData;
    let finalPlaceId;
    let responseMainText;
    let responseSecondaryText;

    // If result is from DB, use existing coordinates (skip Google API)
    if (source === "db") {
      if (!lat || !lng) {
        return res.status(400).json({ error: "DB result missing coordinates" });
      }

      // DB structure: main_text is name, secondary_text is address
      const placeName = main_text || "Unknown";
      const placeAddress = secondary_text || "";
      locationData = {
        main_text: placeName,
        secondary_text: placeAddress,
        lat,
        lng,
      };

      // Use DB id as place identifier (or generate one)
      finalPlaceId = `db_${id}`;
      responseMainText = placeName;
      responseSecondaryText = placeAddress;
    } else if (source === "google") {
      // Fetch from Google Place Details API
      if (!sessionToken || typeof sessionToken !== "string") {
        return res
          .status(400)
          .json({ error: "Missing or invalid sessionToken for Google API" });
      }

      const location = await getPlaceDetails(placeId, sessionToken);
      if (!location) {
        return res.status(404).json({ error: "Place not found" });
      }

      locationData = location;
      finalPlaceId = placeId;
      responseMainText = location.main_text;
      responseSecondaryText = location.secondary_text;
    } else {
      return res.status(400).json({ error: "Invalid source type" });
    }
    const { error } = await supabase.rpc("upsert_address", {
      p_user_id: userID, // comes from your auth middleware
      p_label: label,
      p_place_name: responseMainText,
      p_address: responseSecondaryText,
      p_place_id: finalPlaceId,
      p_lat: locationData.lat,
      p_lng: locationData.lng,
    });

    if (error) throw error;
    // Return the data we already have from dbSearch or getPlaceDetails
    return res.json({
      success: true,
      address: {
        label,
        main_text: responseMainText,
        secondary_text: responseSecondaryText,
        lat: locationData.lat,
        lng: locationData.lng,
        placeId: finalPlaceId,
        source,
      },
      message:
        source === "db"
          ? "Address saved from database cache"
          : "Address fetched from Google and saved",
    });
  } catch (error) {
    console.error("Error in /places/:placeId endpoint:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

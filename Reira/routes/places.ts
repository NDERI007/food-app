import express from "express";
import validateQuery, { PlacesQuerySchema } from "@utils/placeQuery";
import { dbSearch } from "@services/dbSearch";
import { googleAutocomplete } from "@services/googlePlaces";

const router = express.Router();

router.get("/places", validateQuery(PlacesQuerySchema), async (req, res) => {
  try {
    const parsed = req.parsedQuery!;
    if (!parsed.q) return res.json([]);

    const q = parsed.q;
    const limit = Math.min(parsed.limit ?? 10, 20);
    const sessionToken = parsed.sessiontoken;

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

export default router;

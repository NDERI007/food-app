import fetch from "node-fetch";
import cache from "@config/cache";

const GOOGLE_KEY = process.env.GOOGLE_CLOUD_KEY || "";
const COUNTRY = "KE";
const CAMPUS_LAT = -0.565981;
const CAMPUS_LNG = 37.320272;
const CAMPUS_RADIUS_METERS = 5000;

export async function googleAutocomplete(input: string, sessionToken?: string) {
  if (!GOOGLE_KEY) return [];

  const biasPart = `|campus:${CAMPUS_LAT},${CAMPUS_LNG},${CAMPUS_RADIUS_METERS}`;
  const cacheKey = `google:${input.toLowerCase()}${biasPart}`;

  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const body: any = {
    input,
    sessionToken,
    languageCode: "en-KE",
    includedRegionCodes: [COUNTRY],
    locationBias: {
      circle: {
        center: { latitude: CAMPUS_LAT, longitude: CAMPUS_LNG },
        radius: CAMPUS_RADIUS_METERS,
      },
    },
  };

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_KEY,
        },
        body: JSON.stringify(body),
      }
    );

    const json = (await res.json()) as any;

    if (json.error) {
      console.error("Google error:", json.error);
      return [];
    }

    const preds = (json.suggestions || [])
      .map((s: any) => {
        if (s.placePrediction) {
          return {
            source: "google",
            place_id: s.placePrediction.placeId,
            name: s.placePrediction.text?.text || "",
            type: "place",
          };
        } else if (s.queryPrediction) {
          return {
            source: "google",
            place_id: null,
            name: s.queryPrediction.text?.text || "",
            type: "query",
          };
        }
        return null;
      })
      .filter(Boolean);

    await cache.set(cacheKey, preds, 60 * 30);
    return preds;
  } catch (err) {
    console.error("Google fetch failed:", err);
    return [];
  }
}

import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const GOOGLE_KEY = process.env.GOOGLE_CLOUD_KEY;
const COUNTRY = "KE";
const CAMPUS_LAT = -0.565981;
const CAMPUS_LNG = 37.320272;
const CAMPUS_RADIUS_METERS = 5000;

interface PlacePrediction {
  source: "google";
  place_id: string;
  name: string; // Full combined text (main + secondary)
  main_text: string;
  secondary_text: string | null;
  type: "place";
}

interface QueryPrediction {
  source: "google";
  place_id: null;
  name: string;
  type: "query";
}

type AutocompletePrediction = PlacePrediction | QueryPrediction;

/**
 * Google Places Autocomplete
 * - Calls Google API directly, no caching (sessionToken handles billing optimization)
 * - Extracts main_text & secondary_text for display
 */
export async function googleAutocomplete(
  input: string,
  sessionToken: string
): Promise<AutocompletePrediction[]> {
  if (!GOOGLE_KEY) {
    console.warn("GOOGLE_CLOUD_KEY not configured");
    return [];
  }

  const body = {
    input,
    sessionToken,
    languageCode: "en-KE",
    includedRegionCodes: [COUNTRY],
    locationRestriction: {
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
      console.error("Google Places API error:", json.error);
      return [];
    }

    const predictions = (json.suggestions || [])
      .map((s: any) => {
        const place = s.placePrediction;
        const query = s.queryPrediction;

        if (place) {
          const main = place.structuredFormat?.mainText?.text || "";
          const secondary = place.structuredFormat?.secondaryText?.text || null;

          return {
            source: "google",
            place_id: place.placeId,
            name:
              place.text?.text || `${main}${secondary ? `, ${secondary}` : ""}`,
            main_text: main,
            secondary_text: secondary,
            type: "place",
          } as PlacePrediction;
        }

        if (query) {
          return {
            source: "google",
            place_id: null,
            name: query.text?.text || "",
            type: "query",
          } as QueryPrediction;
        }

        return null;
      })
      .filter(Boolean) as AutocompletePrediction[];

    return predictions;
  } catch (err) {
    console.error("Google autocomplete fetch failed:", err);
    return [];
  }
}

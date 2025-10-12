import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();
const GOOGLE_KEY = process.env.GOOGLE_CLOUD_KEY;

/**
 * Fetches place details (specifically lat/lng) from Google Places API.
 * @param placeId - The unique identifier for the place.
 * @param sessionToken - The session token from the autocomplete session for billing.
 * @returns A promise that resolves to a PlaceLocation object or null if not found or an error occurs.
 */
export async function getPlaceDetails(placeId: string, sessionToken: string) {
  if (!GOOGLE_KEY) {
    console.warn("GOOGLE_CLOUD_KEY not configured");
    return null;
  }

  // Append fields directly in the URL
  const url = new URL(`https://places.googleapis.com/v1/places/${placeId}`);
  url.searchParams.set("fields", "location");
  url.searchParams.set("regionCode", "KE");
  url.searchParams.set("key", GOOGLE_KEY);

  // sessionToken is optional but can be used for billing optimization
  if (sessionToken) {
    url.searchParams.set("sessionToken", sessionToken);
  }

  try {
    const res = await fetch(url.toString(), { method: "GET" });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Places API error: ${res.status} - ${text}`);
    }

    const data = (await res.json()) as any;

    if (!data.location) {
      console.warn("⚠️ No location found for this place_id:", placeId);
      return null;
    }
    // ✅ Explicitly coerce and validate numeric types
    const lat = Number(data.location?.latitude);
    const lng = Number(data.location?.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      console.error("❌ Invalid coordinates received:", data.location);
      return null;
    }

    return { lat, lng };
  } catch (err) {
    console.error("Google Place Details fetch failed:", err);
    return null;
  }
}

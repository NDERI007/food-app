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

  if (!sessionToken) {
    console.warn("Session token not provided for Place Details call");
  }

  // The 'fields' parameter is crucial. It specifies that we ONLY want the 'location' data.
  // This makes the request cheaper and more efficient.
  const fieldMask = "location,formattedAddress";
  const url = `https://places.googleapis.com/v1/places/${placeId}?&sessionToken=${sessionToken}&regionCode=KE`;

  try {
    const res = await fetch(url, {
      method: "GET", // Place Details uses a GET request
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY, // The API Key is sent as a header
        "X-Goog-FieldMask": fieldMask, // 👈 required for v1
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Places API error: ${res.status} - ${text}`);
    }

    const data = (await res.json()) as any;
    return {
      id: data.id,
      formatted_address: data.formattedAddress,
      lat: data.location?.latitude,
      lng: data.location?.longitude,
    };
  } catch (err) {
    console.error("Google Place Details fetch failed:", err);
    return null;
  }
}

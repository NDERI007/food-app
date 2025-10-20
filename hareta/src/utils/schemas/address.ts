export interface SavedAddress {
  id?: string; // From DB (optional)
  label?: string; // "Home", "Work" etc.
  place_name?: string | null;
  address?: string | null;
  main_text?: string; // Google / structured data
  secondary_text?: string;
  lat?: number | null;
  lng?: number | null;
  place_id?: string | null; // Google-specific
}

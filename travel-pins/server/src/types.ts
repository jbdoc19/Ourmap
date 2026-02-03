export type TripRow = {
  id: number;
  place_name: string;
  provider: string;
  provider_place_id: string | null;
  lat: number;
  lon: number;
  category_key: string;
  category_emoji: string;
  date_start: string; // YYYY-MM-DD
  date_end: string | null; // YYYY-MM-DD
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
};

export type SearchResult = {
  provider: "nominatim";
  providerPlaceId: string; // e.g. place_id
  displayName: string;
  lat: number;
  lon: number;
  nominatimClass?: string;
  nominatimType?: string;
  categoryKey: string;
  categoryEmoji: string;
};

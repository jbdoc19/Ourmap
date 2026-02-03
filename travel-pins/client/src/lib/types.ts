export type Trip = {
  id: number;
  place_name: string;
  provider: string;
  provider_place_id: string | null;
  lat: number;
  lon: number;
  category_key: string;
  category_emoji: string;
  date_start: string;
  date_end: string | null;
  created_at: string;
  updated_at: string;
};

export type SearchResult = {
  provider: "nominatim";
  providerPlaceId: string;
  displayName: string;
  lat: number;
  lon: number;
  nominatimClass?: string;
  nominatimType?: string;
  categoryKey: string;
  categoryEmoji: string;
};

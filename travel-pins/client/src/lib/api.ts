import type { SearchResult, Trip } from "./types";

export async function searchPlaces(q: string): Promise<SearchResult[]> {
  const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error("Search failed");
  return r.json();
}

export async function listTrips(): Promise<Trip[]> {
  const r = await fetch("/api/trips");
  if (!r.ok) throw new Error("List failed");
  return r.json();
}

export async function createTrip(payload: {
  placeName: string;
  provider: "nominatim";
  providerPlaceId?: string;
  lat: number;
  lon: number;
  categoryKey: string;
  categoryEmoji: string;
  dateStart: string;
  dateEnd: string | null;
}): Promise<Trip> {
  const r = await fetch("/api/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error("Create failed");
  return r.json();
}

export async function deleteTrip(id: number): Promise<void> {
  const r = await fetch(`/api/trips/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Delete failed");
}

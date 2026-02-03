const DEFAULT = { key: "poi", emoji: "📍" };

export function suggestEmoji(nominatimClass?: string, nominatimType?: string) {
  const c = (nominatimClass || "").toLowerCase();
  const t = (nominatimType || "").toLowerCase();

  // Cities / administrative places
  if (c === "place" && ["city", "town", "village", "hamlet"].includes(t)) {
    return { key: "city", emoji: "🏙️" };
  }

  // Food
  if (c === "amenity" && ["restaurant", "cafe", "bar", "fast_food"].includes(t)) {
    return { key: "food", emoji: "🍜" };
  }

  // Stay
  if (c === "tourism" && ["hotel", "motel", "hostel", "guest_house"].includes(t)) {
    return { key: "stay", emoji: "🛏️" };
  }
  if (c === "amenity" && ["hotel"].includes(t)) {
    return { key: "stay", emoji: "🛏️" };
  }

  // Landmark / tourism / historic / leisure
  if (["tourism", "historic", "leisure"].includes(c)) {
    return { key: "landmark", emoji: "🏛️" };
  }

  // Nature / trail / peak-ish
  if (["natural", "waterway"].includes(c)) {
    return { key: "nature", emoji: "🏞️" };
  }
  if (c === "route" && t === "hiking") return { key: "trail", emoji: "🥾" };
  if (c === "natural" && ["peak", "mountain"].includes(t)) return { key: "trail", emoji: "🥾" };

  // Beach / water / coast (best-effort)
  if (c === "natural" && ["beach", "coastline"].includes(t)) return { key: "beach", emoji: "🏖️" };

  return DEFAULT;
}

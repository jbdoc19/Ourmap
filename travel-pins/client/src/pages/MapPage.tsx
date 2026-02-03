import React, { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map } from "maplibre-gl";
import SlideOver from "../components/SlideOver";
import { createTrip, listTrips, searchPlaces, deleteTrip } from "../lib/api";
import type { SearchResult, Trip } from "../lib/types";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty"; // OpenFreeMap example style 6

type PanelMode = "list" | "add";

function fmtRange(start: string, end: string | null) {
  if (!end || end === start) return start;
  return `${start} → ${end}`;
}

export default function MapPage() {
  const mapRef = useRef<Map | null>(null);
  const mapEl = useRef<HTMLDivElement | null>(null);

  const [panelOpen, setPanelOpen] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>("list");

  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) || null,
    [trips, selectedTripId]
  );

  // add form state
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState<string | null>(null);
  const [emoji, setEmoji] = useState("📍");
  const [emojiKey, setEmojiKey] = useState("poi");

  async function refreshTrips() {
    const data = await listTrips();
    setTrips(data);
  }

  // init map
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapEl.current,
      style: STYLE_URL,
      center: [0, 20],
      zoom: 1.4
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      map.addSource("trips", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: []
        }
      });

      map.addLayer({
        id: "trip-emoji",
        type: "symbol",
        source: "trips",
        layout: {
          "text-field": ["get", "category_emoji"],
          "text-size": 18,
          "text-allow-overlap": true
        }
      });

      map.on("click", "trip-emoji", (e) => {
        const f = e.features?.[0];
        if (!f) return;

        const id = Number((f.properties as any)?.id);
        setSelectedTripId(id);
        setPanelOpen(true);
        setPanelMode("list");

        const coords = (f.geometry as any).coordinates as [number, number];
        const place = (f.properties as any)?.place_name;
        const ds = (f.properties as any)?.date_start;
        const de = (f.properties as any)?.date_end;
        const em = (f.properties as any)?.category_emoji;

        new maplibregl.Popup()
          .setLngLat(coords)
          .setHTML(`<div style="font-size:14px"><div style="font-weight:700">${em ?? "📍"} ${place}</div><div>${fmtRange(ds, de)}</div></div>`)
          .addTo(map);
      });

      map.on("mouseenter", "trip-emoji", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "trip-emoji", () => (map.getCanvas().style.cursor = ""));
    });

    mapRef.current = map;
    refreshTrips();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // update map source when trips change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("trips") as any;
    if (!src) return;

    const features = trips.map((t) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [t.lon, t.lat] },
      properties: {
        id: t.id,
        place_name: t.place_name,
        date_start: t.date_start,
        date_end: t.date_end,
        category_emoji: t.category_emoji
      }
    }));

    src.setData({ type: "FeatureCollection", features });
  }, [trips]);

  // autocomplete (debounced)
  useEffect(() => {
    let alive = true;
    const run = async () => {
      const query = q.trim();
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const r = await searchPlaces(query);
        if (!alive) return;
        setResults(r);
      } catch {
        if (!alive) return;
        setResults([]);
      } finally {
        if (alive) setSearching(false);
      }
    };

    const t = setTimeout(run, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  function onPick(r: SearchResult) {
    setPicked(r);
    setEmoji(r.categoryEmoji);
    setEmojiKey(r.categoryKey);
    setResults([]);
    setQ(r.displayName);
    setPanelOpen(true);
    setPanelMode("add");

    // fly to location
    mapRef.current?.flyTo({ center: [r.lon, r.lat], zoom: Math.max(mapRef.current.getZoom(), 8) });
  }

  async function onSave() {
    if (!picked) return;
    if (!dateStart) return;

    await createTrip({
      placeName: picked.displayName,
      provider: "nominatim",
      providerPlaceId: picked.providerPlaceId,
      lat: picked.lat,
      lon: picked.lon,
      categoryKey: emojiKey,
      categoryEmoji: emoji,
      dateStart,
      dateEnd: dateEnd || null
    });

    // reset form
    setPicked(null);
    setDateStart("");
    setDateEnd(null);

    await refreshTrips();
    setPanelMode("list");
  }

  async function onDelete(id: number) {
    await deleteTrip(id);
    if (selectedTripId === id) setSelectedTripId(null);
    await refreshTrips();
  }

  return (
    <div className="mapRoot">
      <div className="mapContainer" ref={mapEl} />

      <div className="floatingTop">
        <div style={{ position: "relative", flex: 1 }}>
          <input
            className="searchBox"
            placeholder="Search places + POIs (e.g., Eiffel Tower, a cafe, a trailhead)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setPanelOpen(true)}
          />
          {results.length > 0 && (
            <div className="dropdown">
              {results.map((r) => (
                <div key={r.providerPlaceId} className="dropdownItem" onClick={() => onPick(r)}>
                  <div style={{ fontWeight: 700 }}>
                    {r.categoryEmoji} {r.displayName.split(",")[0]}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{r.displayName}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="primary" onClick={() => setPanelOpen((v) => !v)}>
          {panelOpen ? "Hide" : "Show"} Panel
        </button>
      </div>

      <div className="attrib">© OpenStreetMap contributors</div>

      <SlideOver
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={panelMode === "add" ? "Add trip" : "Your trips"}
      >
        {panelMode === "add" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontWeight: 700 }}>{picked ? `${picked.categoryEmoji} ${picked.displayName}` : "Pick a place"}</div>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Start date</span>
              <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>End date (optional)</span>
              <input type="date" value={dateEnd ?? ""} onChange={(e) => setDateEnd(e.target.value || null)} />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Emoji pin</span>
              <input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="📍" />
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Tip: paste an emoji (🏙️ 🍜 🥾 🏛️ 🏖️)
              </div>
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="primary" disabled={!picked || !dateStart} onClick={onSave}>
                Save trip
              </button>
              <button onClick={() => setPanelMode("list")} style={{ border: "1px solid rgba(0,0,0,0.15)", borderRadius: 12, padding: "10px 12px", background: "white", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="primary" onClick={() => setPanelMode("add")}>
                + Add a trip
              </button>
              <a href="/api/trips/export.json" style={{ alignSelf: "center", fontSize: 13 }}>
                Export JSON
              </a>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {trips.length === 0 && <div style={{ opacity: 0.8 }}>No trips yet — search a place above!</div>}

              {trips.map((t) => {
                const active = t.id === selectedTripId;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTripId(t.id);
                      mapRef.current?.flyTo({ center: [t.lon, t.lat], zoom: Math.max(mapRef.current?.getZoom() ?? 2, 6) });
                    }}
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: active ? "2px solid black" : "1px solid rgba(0,0,0,0.12)",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontWeight: 800 }}>
                        {t.category_emoji} {t.place_name.split(",")[0]}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(t.id);
                        }}
                        style={{ border: "none", background: "transparent", cursor: "pointer" }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{fmtRange(t.date_start, t.date_end)}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{t.place_name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}

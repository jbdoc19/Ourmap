import express from "express";
import cors from "cors";
import { z } from "zod";
import { openDb, listTrips } from "./db.js";
import { suggestEmoji } from "./emoji.js";
import type { SearchResult, TripRow } from "./types.js";

const app = express();
app.use(cors());
app.use(express.json());

const db = openDb();

// --- very small cache + 1 req/sec limiter for /api/search (policy-friendly) ---
const memoryCache = new Map<string, { expiresAt: number; payload: SearchResult[] }>();
let lastSearchAt = 0;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isoNow() {
  return new Date().toISOString();
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/trips", (_req, res) => {
  res.json(listTrips(db));
});

const TripCreate = z.object({
  placeName: z.string().min(1),
  provider: z.literal("nominatim").default("nominatim"),
  providerPlaceId: z.string().min(1).optional(),
  lat: z.number(),
  lon: z.number(),
  categoryKey: z.string().min(1).default("poi"),
  categoryEmoji: z.string().min(1).default("📍"),
  dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
});

app.post("/api/trips", (req, res) => {
  const parsed = TripCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const t = parsed.data;
  const now = isoNow();

  const stmt = db.prepare(`
    INSERT INTO trips
    (place_name, provider, provider_place_id, lat, lon, category_key, category_emoji, date_start, date_end, created_at, updated_at)
    VALUES
    (@place_name, @provider, @provider_place_id, @lat, @lon, @category_key, @category_emoji, @date_start, @date_end, @created_at, @updated_at)
  `);

  const info = stmt.run({
    place_name: t.placeName,
    provider: t.provider,
    provider_place_id: t.providerPlaceId ?? null,
    lat: t.lat,
    lon: t.lon,
    category_key: t.categoryKey,
    category_emoji: t.categoryEmoji,
    date_start: t.dateStart,
    date_end: t.dateEnd ?? null,
    created_at: now,
    updated_at: now
  });

  const created = db.prepare(`SELECT * FROM trips WHERE id = ?`).get(info.lastInsertRowid) as TripRow;
  res.status(201).json(created);
});

const TripUpdate = TripCreate.partial().extend({
  placeName: z.string().min(1).optional(),
  dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

app.put("/api/trips/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = TripUpdate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = db.prepare(`SELECT * FROM trips WHERE id = ?`).get(id) as TripRow | undefined;
  if (!existing) return res.status(404).json({ error: "Not found" });

  const patch = parsed.data;
  const updated: TripRow = {
    ...existing,
    place_name: patch.placeName ?? existing.place_name,
    provider: patch.provider ?? existing.provider,
    provider_place_id: patch.providerPlaceId ?? existing.provider_place_id,
    lat: patch.lat ?? existing.lat,
    lon: patch.lon ?? existing.lon,
    category_key: patch.categoryKey ?? existing.category_key,
    category_emoji: patch.categoryEmoji ?? existing.category_emoji,
    date_start: patch.dateStart ?? existing.date_start,
    date_end: patch.dateEnd === undefined ? existing.date_end : patch.dateEnd,
    updated_at: isoNow(),
    created_at: existing.created_at
  };

  db.prepare(`
    UPDATE trips SET
      place_name=@place_name,
      provider=@provider,
      provider_place_id=@provider_place_id,
      lat=@lat,
      lon=@lon,
      category_key=@category_key,
      category_emoji=@category_emoji,
      date_start=@date_start,
      date_end=@date_end,
      updated_at=@updated_at
    WHERE id=@id
  `).run({
    id,
    ...updated
  });

  const row = db.prepare(`SELECT * FROM trips WHERE id = ?`).get(id) as TripRow;
  res.json(row);
});

app.delete("/api/trips/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  db.prepare(`DELETE FROM trips WHERE id = ?`).run(id);
  res.json({ ok: true });
});

app.get("/api/trips/export.json", (_req, res) => {
  const trips = listTrips(db);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", "attachment; filename=\"trips-export.json\"");
  res.send(JSON.stringify({ exportedAt: isoNow(), trips }, null, 2));
});

app.get("/api/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.json([]);

  // memory cache (15 min)
  const key = q.toLowerCase();
  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return res.json(cached.payload);

  // 1 req/sec rate limit (absolute max recommended by policy) 4
  const now = Date.now();
  const wait = Math.max(0, 1000 - (now - lastSearchAt));
  if (wait > 0) await sleep(wait);
  lastSearchAt = Date.now();

  const userAgent =
    process.env.GEOCODER_USER_AGENT ||
    "TravelPinsMap/1.0 (private couple app; contact: you@example.com)";

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");

  const resp = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      "Accept-Language": "en"
    }
  });

  if (!resp.ok) {
    return res.status(502).json({ error: "Geocoder error", status: resp.status });
  }

  const raw = (await resp.json()) as any[];
  const results: SearchResult[] = raw.map((r) => {
    const nomClass = r.class as string | undefined;
    const nomType = r.type as string | undefined;
    const sug = suggestEmoji(nomClass, nomType);

    return {
      provider: "nominatim",
      providerPlaceId: String(r.place_id),
      displayName: String(r.display_name),
      lat: Number(r.lat),
      lon: Number(r.lon),
      nominatimClass: nomClass,
      nominatimType: nomType,
      categoryKey: sug.key,
      categoryEmoji: sug.emoji
    };
  });

  memoryCache.set(key, { payload: results, expiresAt: Date.now() + 15 * 60 * 1000 });
  res.json(results);
});

// --- serve client build in production (optional) ---
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));

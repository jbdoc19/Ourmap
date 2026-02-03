import Database from "better-sqlite3";
import type { TripRow } from "./types.js";

export function openDb() {
  const db = new Database("data.sqlite");
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_name TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'nominatim',
      provider_place_id TEXT NULL,
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      category_key TEXT NOT NULL DEFAULT 'poi',
      category_emoji TEXT NOT NULL DEFAULT '📍',
      date_start TEXT NOT NULL,
      date_end TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_trips_date_start ON trips(date_start);
    CREATE INDEX IF NOT EXISTS idx_trips_place ON trips(place_name);

    CREATE TABLE IF NOT EXISTS search_cache (
      query TEXT PRIMARY KEY,
      response_json TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );
  `);

  // Simple constraint check (SQLite doesn't enforce CHECK reliably across older patterns)
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_trips_date_check_ins
    BEFORE INSERT ON trips
    FOR EACH ROW
    WHEN NEW.date_end IS NOT NULL AND NEW.date_end < NEW.date_start
    BEGIN
      SELECT RAISE(ABORT, 'date_end must be >= date_start');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_trips_date_check_upd
    BEFORE UPDATE ON trips
    FOR EACH ROW
    WHEN NEW.date_end IS NOT NULL AND NEW.date_end < NEW.date_start
    BEGIN
      SELECT RAISE(ABORT, 'date_end must be >= date_start');
    END;
  `);

  return db;
}

export function listTrips(db: Database.Database): TripRow[] {
  return db.prepare(`SELECT * FROM trips ORDER BY date_start DESC, id DESC`).all() as TripRow[];
}

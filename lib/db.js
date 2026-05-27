import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const DB_PATH = process.env.SALARY_DB_PATH || path.join(DATA_DIR, "salary-report.db");

let _db = null;

export function getDb() {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("busy_timeout = 5000");

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      phone         TEXT NOT NULL UNIQUE,
      created_at    INTEGER NOT NULL,
      last_login_at INTEGER
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL,
      user_phone   TEXT    NOT NULL,
      created_at   INTEGER NOT NULL,
      position     TEXT    NOT NULL,
      company      TEXT    NOT NULL,
      rank         TEXT    NOT NULL,
      rank_label   TEXT,
      education    TEXT    NOT NULL,
      city         TEXT    NOT NULL,
      report_json  TEXT    NOT NULL,
      duration_ms  INTEGER,
      ip           TEXT,
      user_agent   TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_user      ON reports(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_phone     ON reports(user_phone, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_query_cache
      ON reports(position, company, rank, education, city, created_at DESC);
  `);

  return _db;
}

export function upsertUserByPhone(phone) {
  const db = getDb();
  const now = Date.now();
  const existing = db.prepare("SELECT id FROM users WHERE phone = ?").get(phone);
  if (existing) {
    db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(now, existing.id);
    return existing.id;
  }
  const info = db
    .prepare("INSERT INTO users(phone, created_at, last_login_at) VALUES (?, ?, ?)")
    .run(phone, now, now);
  return Number(info.lastInsertRowid);
}

export function findCachedReport({ position, company, rank, education, city }, withinMs) {
  const db = getDb();
  const sinceTs = Date.now() - withinMs;
  return db
    .prepare(
      `SELECT id, user_id, user_phone, created_at, rank_label, report_json
         FROM reports
        WHERE position = ? AND company = ? AND rank = ? AND education = ? AND city = ?
          AND created_at >= ?
        ORDER BY created_at DESC
        LIMIT 1`
    )
    .get(position, company, rank, education, city, sinceTs);
}

export function insertReport(payload) {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO reports(
        user_id, user_phone, created_at,
        position, company, rank, rank_label, education, city,
        report_json, duration_ms, ip, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      payload.userId,
      payload.userPhone,
      payload.createdAt,
      payload.position,
      payload.company,
      payload.rank,
      payload.rankLabel || null,
      payload.education,
      payload.city,
      JSON.stringify(payload.report),
      payload.durationMs ?? null,
      payload.ip ?? null,
      payload.userAgent ?? null,
    );
  return Number(info.lastInsertRowid);
}

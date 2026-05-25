import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "..", "data", "salary-report.db");
const db = new Database(dbPath, { readonly: true });

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .all();
console.log("Tables:", tables.map((t) => t.name).join(", "));

const users = db.prepare("PRAGMA table_info(users)").all();
console.log("users cols:", users.map((c) => c.name).join(", "));

const reports = db.prepare("PRAGMA table_info(reports)").all();
console.log("reports cols:", reports.map((c) => c.name).join(", "));

const userRows = db.prepare("SELECT * FROM users").all();
console.log("users rows:", userRows.length);
console.log(JSON.stringify(userRows, null, 2));

const reportRows = db.prepare("SELECT id, user_phone, position, company, rank, education, city, created_at FROM reports ORDER BY id DESC LIMIT 5").all();
console.log("reports rows:", reportRows.length);
console.log(JSON.stringify(reportRows, null, 2));

db.close();

// The local SQLite database (Node's built-in node:sqlite) and its migrations.
// migrations/NNN_name.up.sql runs once, in order; NNN_name.down.sql undoes it (see migrate.js).
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "migrations");

const migrationList = () => readdirSync(MIGRATIONS).filter((f) => /^\d+_.+\.up\.sql$/.test(f)).sort()
  .map((f) => ({ version: Number(f.split("_")[0]), up: join(MIGRATIONS, f), down: join(MIGRATIONS, f.replace(/\.up\.sql$/, ".down.sql")) }));

const applied = (db) => {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)");
  return new Set(db.prepare("SELECT version FROM schema_migrations").all().map((r) => r.version));
};

export function migrateUp(db) {
  const done = applied(db);
  const ran = [];
  migrationList().filter((m) => !done.has(m.version)).forEach((m) => tx(db, () => {
    db.exec(readFileSync(m.up, "utf8"));
    db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(m.version, Date.now());
    ran.push(m.version);
  }));
  return ran;
}

// Undoes the newest migration
export function migrateDown(db) {
  const done = [...applied(db)].sort((a, b) => b - a);
  if (!done.length) return null;
  const m = migrationList().find((x) => x.version === done[0]);
  tx(db, () => {
    db.exec(readFileSync(m.down, "utf8"));
    db.prepare("DELETE FROM schema_migrations WHERE version = ?").run(m.version);
  });
  return m.version;
}

export function openDb(file = ":memory:") {
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000;");
  migrateUp(db);
  return db;
}

// Runs fn in one transaction: all of it is saved, or (on any error) none of it
export function tx(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

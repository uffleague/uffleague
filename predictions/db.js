// The local SQLite database (Node's built-in node:sqlite) and its migrations.
// migrations/NNN_name.up.sql runs once, in order; NNN_name.down.sql undoes it (see migrate.js).
// The transaction and migration logic itself is in txn.js, shared with the Cloudflare Worker.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tx, runMigrationsUp, runMigrationDown } from "./txn.js";

export { tx };

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export const migrationList = () => readdirSync(MIGRATIONS).filter((f) => /^\d+_.+\.up\.sql$/.test(f)).sort()
  .map((f) => ({ version: Number(f.split("_")[0]), up: readFileSync(join(MIGRATIONS, f), "utf8"),
    down: readFileSync(join(MIGRATIONS, f.replace(/\.up\.sql$/, ".down.sql")), "utf8") }));

export const migrateUp = (db) => runMigrationsUp(db, migrationList());
export const migrateDown = (db) => runMigrationDown(db, migrationList());

export function openDb(file = ":memory:") {
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000;");
  migrateUp(db);
  return db;
}

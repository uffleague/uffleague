// node predictions/migrate.js up|down|status [--demo]   (local database only)
import { DatabaseSync } from "node:sqlite";
import { migrateDown, openDb } from "./db.js";
import { dbPath } from "./config.js";

const [cmd = "status"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const file = dbPath(process.argv.includes("--demo"));
if (cmd === "up") {
  const db = openDb(file);
  console.log(`Up to date: ${file}`);
  db.close();
} else if (cmd === "down") {
  const db = new DatabaseSync(file);
  const v = migrateDown(db);
  console.log(v ? `Undid migration ${v} in ${file}` : "Nothing to undo.");
  db.close();
} else {
  const db = new DatabaseSync(file);
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)");
  console.log(file, db.prepare("SELECT version, applied_at FROM schema_migrations ORDER BY version").all());
  db.close();
}

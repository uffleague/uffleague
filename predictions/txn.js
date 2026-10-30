// Transactions and migrations that work on any database this code runs on: Node's node:sqlite on this computer,
// or a Cloudflare Durable Object's SQLite (worker/src/predictions.js). Nothing here imports Node-only modules.

// Runs fn in one transaction: all of it is saved, or (on any error) none of it.
// A database that brings its own transaction (a Durable Object: db.transaction) uses that; node:sqlite uses BEGIN.
export function tx(db, fn) {
  if (typeof db.transaction === "function") return db.transaction(fn);
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

// migrations: [{ version, up: "SQL", down: "SQL" }], oldest first. Each runs once, in its own transaction.
const applied = (db) => {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)");
  return new Set(db.prepare("SELECT version FROM schema_migrations").all().map((r) => r.version));
};

export function runMigrationsUp(db, migrations) {
  const done = applied(db);
  const ran = [];
  migrations.filter((m) => !done.has(m.version)).forEach((m) => tx(db, () => {
    db.exec(m.up);
    db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(m.version, Date.now());
    ran.push(m.version);
  }));
  return ran;
}

// Undoes the newest migration
export function runMigrationDown(db, migrations) {
  const done = [...applied(db)].sort((a, b) => b - a);
  if (!done.length) return null;
  const m = migrations.find((x) => x.version === done[0]);
  tx(db, () => {
    db.exec(m.down);
    db.prepare("DELETE FROM schema_migrations WHERE version = ?").run(m.version);
  });
  return m.version;
}

// Splits SQL into single statements for databases that run one at a time (a Durable Object). Semicolons inside
// quotes, comments, or a trigger's BEGIN ... END don't split.
export function splitStatements(sql) {
  const out = [];
  let cur = "", depth = 0, i = 0, quote = null;
  const word = (w) => sql.slice(i, i + w.length).toUpperCase() === w && !/[A-Za-z0-9_]/.test(sql[i - 1] || " ") && !/[A-Za-z0-9_]/.test(sql[i + w.length] || " ");
  while (i < sql.length) {
    const c = sql[i];
    if (quote) { cur += c; if (c === quote) quote = null; i++; continue; }
    if (c === "'" || c === '"') { quote = c; cur += c; i++; continue; }
    if (c === "-" && sql[i + 1] === "-") { while (i < sql.length && sql[i] !== "\n") i++; continue; }
    if (c === "/" && sql[i + 1] === "*") { const end = sql.indexOf("*/", i + 2); i = end < 0 ? sql.length : end + 2; continue; }
    if (word("BEGIN")) { depth++; cur += sql.slice(i, i + 5); i += 5; continue; }
    if (word("END") && depth > 0) { depth--; cur += sql.slice(i, i + 3); i += 3; continue; }
    if (c === ";" && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ""; i++; continue; }
    cur += c; i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

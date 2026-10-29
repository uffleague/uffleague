// The audit log: who did what to which record, with before/after values. Append-only (the database refuses edits
// and deletes) and readable only with audit.view. Anything that looks like a secret is never written.
const SECRET = /pin|password|secret|token|hash|pepper|session|cookie/i;
const scrub = (v) => {
  if (Array.isArray(v)) return v.map(scrub);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET.test(k) ? "[not recorded]" : scrub(x)]));
  return v;
};

export function createAudit({ db, now = Date.now }) {
  function log({ actorId = null, action, targetType = null, targetId = null, marketId = null, detail = {} }) {
    db.prepare("INSERT INTO audit (at, user_id, action, market_id, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(now(), actorId, action, marketId, targetType || (marketId ? "market" : null), targetId != null ? String(targetId) : marketId != null ? String(marketId) : null,
        JSON.stringify(scrub(detail)));
  }

  function list({ action = "", actor = "", targetType = "", targetId = "", beforeId = null, limit = 50 } = {}) {
    const where = [], args = [];
    if (action) { where.push("a.action LIKE ? ESCAPE '\\'"); args.push(`${String(action).replace(/[\\%_]/g, "\\$&")}%`); }
    if (actor) { where.push("u.username = ?"); args.push(String(actor)); }
    if (targetType) { where.push("a.target_type = ?"); args.push(String(targetType)); }
    if (targetId) { where.push("a.target_id = ?"); args.push(String(targetId)); }
    if (beforeId) { where.push("a.id < ?"); args.push(Number(beforeId)); }
    const n = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const rows = db.prepare(`SELECT a.*, u.username FROM audit a LEFT JOIN users u ON u.id = a.user_id ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY a.id DESC LIMIT ?`).all(...args, n);
    return {
      rows: rows.map((r) => ({ id: r.id, at: r.at, by: r.username || (r.user_id ? `#${r.user_id}` : "system"), action: r.action,
        targetType: r.target_type, targetId: r.target_id, marketId: r.market_id, detail: JSON.parse(r.detail || "{}") })),
      nextBefore: rows.length === n ? rows[rows.length - 1].id : null
    };
  }

  return { log, list };
}

// The one place points change. Every change is a ledger row (append-only: the database refuses edits and deletes)
// written together with the new balance, so users.balance always equals the sum of that user's rows.
// Call post() inside a transaction (db.js tx) with whatever else the change belongs to.
import { randomUUID } from "node:crypto";
import { HttpError } from "./errors.js";

export function createLedger({ db, now = Date.now }) {
  const get = (sql, ...a) => db.prepare(sql).get(...a);
  const all = (sql, ...a) => db.prepare(sql).all(...a);

  // idempotencyKey: a retried request with the same key gets the first result back and changes nothing
  function post({ userId, delta, kind, actorId = null, note = null, marketId = null, predictionId = null, challengeId = null,
    redemptionId = null, round = 0, idempotencyKey = null, allowNegative = false }) {
    if (!Number.isInteger(delta)) throw new Error("Ledger amounts are whole numbers.");
    if (idempotencyKey) {
      const done = get("SELECT * FROM ledger WHERE idempotency_key = ?", idempotencyKey);
      if (done) return { ...done, repeated: true };
    }
    const u = get("SELECT balance FROM users WHERE id = ?", userId);
    if (!u) throw new HttpError(404, "That account doesn't exist.");
    const after = u.balance + delta;
    // Only a reversal of a disputed payout may leave someone below 0 (they had spent the points already)
    if (after < 0 && !allowNegative) throw new HttpError(400, `That would leave a balance of ${after}. Balances can't go below 0.`);
    db.prepare("UPDATE users SET balance = ? WHERE id = ?").run(after, userId);
    const txId = randomUUID();
    db.prepare(`INSERT INTO ledger (tx_id, user_id, at, kind, delta, balance_before, balance_after, market_id, prediction_id, challenge_id,
      redemption_id, round, note, actor_id, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(txId, userId, now(), kind, delta, u.balance, after, marketId, predictionId, challengeId, redemptionId, round, note, actorId, idempotencyKey);
    return get("SELECT * FROM ledger WHERE tx_id = ?", txId);
  }

  // Accounts whose balance doesn't match their ledger (should always be none)
  const mismatches = () => all(`SELECT u.id, u.username, u.balance, COALESCE(SUM(l.delta), 0) AS ledger FROM users u
    LEFT JOIN ledger l ON l.user_id = u.id GROUP BY u.id HAVING u.balance <> COALESCE(SUM(l.delta), 0)`);

  const view = (r, names) => ({ txId: r.tx_id, at: r.at, kind: r.kind, delta: r.delta, before: r.balance_before, after: r.balance_after,
    note: r.note, marketId: r.market_id, challengeId: r.challenge_id, redemptionId: r.redemption_id,
    actor: r.actor_id ? (names && names.get(r.actor_id)) || `#${r.actor_id}` : null });

  function history(userId, { limit = 25, beforeId = null } = {}) {
    const rows = beforeId
      ? all("SELECT * FROM ledger WHERE user_id = ? AND id < ? ORDER BY id DESC LIMIT ?", userId, beforeId, limit)
      : all("SELECT * FROM ledger WHERE user_id = ? ORDER BY id DESC LIMIT ?", userId, limit);
    const names = new Map(all("SELECT id, username FROM users").map((u) => [u.id, u.username]));
    return { rows: rows.map((r) => view(r, names)), nextBefore: rows.length === limit ? rows[rows.length - 1].id : null };
  }

  return { post, mismatches, history };
}

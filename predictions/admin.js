// UFF Admin: looking people up, adjusting their virtual points, roles and account status, and the audit log.
// Every function checks the caller's permission itself (roles.js need), so no route can skip it.
import { tx } from "./txn.js";
import { HttpError } from "./errors.js";
import { need, can, rank, ROLES, ROLE_LABEL } from "./roles.js";

const fail = (status, message) => { throw new HttpError(status, message); };
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const IDEMPOTENCY = /^[A-Za-z0-9_-]{8,64}$/;
export const CREDIT_REASONS = { event: "League event participation", award: "Approved community award", correction: "Correction of an earlier admin error",
  reimbursement: "Reward reimbursement", test: "Test adjustment (local development)", other: "Other" };
const MAX_ADJUST = 100000, MAX_BALANCE = 10000000;

export function createAdminTools({ db, ledger, audit, limiter, now = Date.now }) {
  const get = (sql, ...a) => db.prepare(sql).get(...a);
  const all = (sql, ...a) => db.prepare(sql).all(...a);
  const run = (sql, ...a) => db.prepare(sql).run(...a);

  const person = (u) => u && { accountId: u.account_id, username: u.username, role: u.role, roleLabel: ROLE_LABEL[u.role], status: u.status,
    balance: u.balance, createdAt: u.created_at, lastSignInAt: u.last_sign_in_at, roleGrantedAt: u.role_granted_at,
    roleGrantedBy: u.role_granted_by ? (get("SELECT username FROM users WHERE id = ?", u.role_granted_by) || {}).username : null,
    verified: u.credential === "pin" && !!u.last_sign_in_at };
  // Found by the permanent account id, and the username has to match too, so a renamed or mistyped account is never hit
  function target(accountId, username) {
    const u = get("SELECT * FROM users WHERE account_id = ?", String(accountId || ""));
    if (!u) fail(404, "That account doesn't exist.");
    if (username != null && String(username).trim().toLowerCase() !== u.username.toLowerCase()) fail(409, "That username doesn't match the account. Search again.");
    return u;
  }
  const anyOf = (user, perms) => {
    if (!perms.some((p) => can(user, p))) need(user, perms[0]); // throws the right error
    need(user, perms.find((p) => can(user, p)));
  };

  function overview(user) {
    need(user, "admin.view");
    const count = (sql, ...a) => get(sql, ...a).n;
    return {
      you: { username: user.username, role: user.role, roleLabel: ROLE_LABEL[user.role], perms: user.perms },
      users: { total: count("SELECT COUNT(*) AS n FROM users"), suspended: count("SELECT COUNT(*) AS n FROM users WHERE status = 'suspended'"),
        staff: count("SELECT COUNT(*) AS n FROM users WHERE role <> 'user'") },
      challenges: Object.fromEntries(all("SELECT status, COUNT(*) AS n FROM challenges GROUP BY status").map((r) => [r.status, r.n])),
      markets: Object.fromEntries(all("SELECT status, COUNT(*) AS n FROM markets GROUP BY status").map((r) => [r.status, r.n])),
      redemptions: Object.fromEntries(all("SELECT status, COUNT(*) AS n FROM redemptions GROUP BY status").map((r) => [r.status, r.n])),
      rewards: { enabled: count("SELECT COUNT(*) AS n FROM rewards WHERE enabled = 1"), total: count("SELECT COUNT(*) AS n FROM rewards") },
      points: can(user, "credits.manage") ? { held: get("SELECT COALESCE(SUM(balance), 0) AS n FROM users WHERE role = 'user'").n,
        ledgerRows: count("SELECT COUNT(*) AS n FROM ledger"), mismatches: ledger.mismatches().length } : null
    };
  }

  // Usernames starting with what was typed (exact match first)
  function search(user, q) {
    anyOf(user, ["users.view", "credits.manage", "roles.manage"]);
    const s = text(q, 20);
    if (!s) return [];
    if (!/^[A-Za-z0-9_]+$/.test(s)) fail(400, "Usernames are letters, numbers and underscores.");
    return all(`SELECT * FROM users WHERE username LIKE ? ESCAPE '\\' ORDER BY (lower(username) = lower(?)) DESC, username LIMIT 25`,
      `${s.replace(/_/g, "\\_")}%`, s).map(person);
  }

  function detail(user, accountId) {
    anyOf(user, ["users.view", "credits.manage", "roles.manage"]);
    const u = target(accountId);
    return {
      user: person(u),
      ledger: can(user, "credits.manage") || can(user, "users.view") ? ledger.history(u.id, { limit: 20 }).rows : [],
      challenges: all(`SELECT e.*, c.title FROM challenge_entries e JOIN challenges c ON c.id = e.challenge_id WHERE e.user_id = ? ORDER BY e.id DESC LIMIT 10`, u.id)
        .map((e) => ({ challengeId: e.challenge_id, title: e.title, result: e.result, correct: e.correct, wrong: e.wrong, award: e.award, at: e.updated_at })),
      redemptions: all(`SELECT * FROM redemptions WHERE user_id = ? AND status IN ('pending', 'approved') ORDER BY id DESC`, u.id)
        .map((r) => ({ id: r.id, rewardName: r.reward_name, cost: r.cost, status: r.status, createdAt: r.created_at })),
      picks: get(`SELECT COUNT(*) AS n, COALESCE(SUM(result = 'won'), 0) AS won, COALESCE(SUM(result = 'lost'), 0) AS lost FROM predictions WHERE user_id = ?`, u.id)
    };
  }

  function history(user, accountId, beforeId) {
    anyOf(user, ["credits.manage", "users.view"]);
    const u = target(accountId);
    return ledger.history(u.id, { limit: 50, beforeId: beforeId ? Number(beforeId) : null });
  }

  /* ---------- Credits ---------- */

  // add | remove | set. The request id makes a retried or double-submitted adjustment happen once.
  function adjust(user, input = {}) {
    need(user, "credits.manage");
    limiter(`credits:${user.id}`, 30, 60000);
    const key = String(input.idempotencyKey || "");
    if (!IDEMPOTENCY.test(key)) fail(400, "Missing request id. Reload the page and try again.");
    const type = input.type;
    if (!["add", "remove", "set"].includes(type)) fail(400, "Pick add, remove or set.");
    const reasonCode = CREDIT_REASONS[input.reasonCode] ? input.reasonCode : null;
    if (!reasonCode) fail(400, "Pick a reason.");
    const note = text(input.note, 300);
    if (note.length < 5) fail(400, "Describe the reason (at least 5 characters).");
    const amount = Number(type === "set" ? input.target : input.amount);
    if (!Number.isInteger(amount)) fail(400, "Enter a whole number of points.");
    if (type !== "set" && (amount <= 0 || amount > MAX_ADJUST)) fail(400, `Add or remove 1 to ${MAX_ADJUST.toLocaleString("en-US")} points at a time.`);
    if (type === "set" && (amount < 0 || amount > MAX_BALANCE)) fail(400, `A balance is 0 to ${MAX_BALANCE.toLocaleString("en-US")}.`);
    if (type === "set" && input.confirmSet !== true) fail(400, "Setting an exact balance has to be confirmed.");
    return tx(db, () => {
      const idem = `admin:${user.id}:${key}`;
      const done = get("SELECT * FROM ledger WHERE idempotency_key = ?", idem);
      if (done) return { repeated: true, tx: { txId: done.tx_id, before: done.balance_before, after: done.balance_after, delta: done.delta } };
      const u = target(input.accountId, input.username);
      if (u.status !== "active") fail(409, "That account is suspended. Reactivate it first.");
      const delta = type === "add" ? amount : type === "remove" ? -amount : amount - u.balance;
      if (type === "remove" && amount > u.balance) fail(400, `${u.username} has ${u.balance.toLocaleString("en-US")} points, so at most that can be removed.`);
      if (delta === 0) fail(409, `${u.username} already has ${u.balance.toLocaleString("en-US")} points.`);
      if (u.balance + delta > MAX_BALANCE) fail(400, `A balance can't go over ${MAX_BALANCE.toLocaleString("en-US")}.`);
      const reason = `${CREDIT_REASONS[reasonCode]}: ${note}`;
      const row = ledger.post({ userId: u.id, delta, kind: type === "add" ? "admin_credit" : type === "remove" ? "admin_debit" : "admin_set",
        actorId: user.id, note: reason, idempotencyKey: idem });
      audit.log({ actorId: user.id, action: `credits.${type}`, targetType: "user", targetId: u.account_id,
        detail: { username: u.username, before: { balance: row.balance_before }, after: { balance: row.balance_after }, delta, reason, txId: row.tx_id } });
      return { tx: { txId: row.tx_id, before: row.balance_before, after: row.balance_after, delta } };
    });
  }

  /* ---------- Roles ---------- */

  function setRole(user, input = {}) {
    need(user, "roles.manage");
    limiter(`admin:${user.id}`, 60, 60000);
    const role = input.role;
    if (!ROLES.includes(role)) fail(400, "Pick a role.");
    const reason = text(input.reason, 300);
    if (reason.length < 3) fail(400, "Say why (it goes in the audit log).");
    return tx(db, () => {
      const u = target(input.accountId, input.username);
      if (u.id === user.id) fail(403, "You can't change your own role. Another Super Admin has to.");
      if (u.role === role) fail(409, `${u.username} is already ${ROLE_LABEL[role]}.`);
      // Only accounts made and signed into through the site (never a made-up name)
      if (u.credential !== "pin" || !u.last_sign_in_at) fail(409, "That account hasn't been set up through the site's sign-up and sign-in.");
      if (u.status !== "active") fail(409, "That account is suspended. Reactivate it first.");
      const up = rank(role) > rank(u.role);
      run("UPDATE users SET role = ?, role_granted_at = ?, role_granted_by = ? WHERE id = ?", role, now(), user.id, u.id);
      audit.log({ actorId: user.id, action: up ? "role.grant" : "role.revoke", targetType: "user", targetId: u.account_id,
        detail: { username: u.username, before: { role: u.role }, after: { role }, reason } });
      return { user: person(get("SELECT * FROM users WHERE id = ?", u.id)) };
    });
  }

  function setStatus(user, input = {}) {
    need(user, "users.suspend");
    limiter(`admin:${user.id}`, 60, 60000);
    const status = input.status;
    if (!["active", "suspended"].includes(status)) fail(400, "Pick active or suspended.");
    const reason = text(input.reason, 300);
    if (reason.length < 3) fail(400, "Say why (it goes in the audit log).");
    return tx(db, () => {
      const u = target(input.accountId, input.username);
      if (u.id === user.id) fail(403, "You can't suspend your own account.");
      if (rank(u.role) >= rank(user.role)) fail(403, "You can only suspend accounts with less access than yours.");
      if (u.status === status) fail(409, `${u.username} is already ${status}.`);
      run("UPDATE users SET status = ? WHERE id = ?", status, u.id);
      if (status === "suspended") run("DELETE FROM sessions WHERE user_id = ?", u.id); // signed out everywhere
      audit.log({ actorId: user.id, action: status === "suspended" ? "user.suspend" : "user.reactivate", targetType: "user", targetId: u.account_id,
        detail: { username: u.username, before: { status: u.status }, after: { status }, reason } });
      return { user: person(get("SELECT * FROM users WHERE id = ?", u.id)) };
    });
  }

  // Everyone with a role (Admin Permissions page)
  function staffList(user) {
    need(user, "roles.manage");
    return all("SELECT * FROM users WHERE role <> 'user' ORDER BY CASE role WHEN 'super_admin' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, username").map(person);
  }

  function auditLog(user, filters = {}) {
    need(user, "audit.view");
    return audit.list(filters);
  }

  return { overview, search, detail, history, adjust, setRole, setStatus, staffList, auditLog, reasons: CREDIT_REASONS };
}

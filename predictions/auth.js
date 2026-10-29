// UFF accounts on the local server: a username and a 5-digit PIN. Staff and admins are the same accounts with a role
// (roles.js); they unlock admin tools on a session by entering their PIN again (elevate below).
// A 5-digit PIN is only 100,000 possibilities, so it's kept from being guessed by the server, not by its length:
//   - PINs are hashed with Argon2id plus a pepper (a secret key kept outside the database, see server.js), so a
//     copied database alone can't be used to try PINs
//   - every failed sign-in counts against that username (locks that name for 1 min after 5 misses, doubling each
//     miss after that, up to an hour) and against the address it came from (50 misses in 15 min locks it 15 min)
//   - a username that doesn't exist gets the same answer, the same delay and the same lockouts as one that does
// Nothing here ever logs or returns a PIN.
import { argon2Sync, randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { tx } from "./db.js";
import { HttpError } from "./errors.js";
import { createLedger } from "./ledger.js";
import { createAudit } from "./audit.js";
import { PERMISSIONS } from "./roles.js";

const fail = (status, message) => { throw new HttpError(status, message); };
const sha = (s) => createHash("sha256").update(s).digest("hex");

export const USERNAME = /^[A-Za-z0-9_]{3,20}$/;
// Names that would look official
const RESERVED = new Set(["admin", "administrator", "localadmin", "uff", "unitedflagfootball", "official", "commissioner",
  "moderator", "mod", "staff", "support", "system", "root", "owner"]);
const ARGON = { parallelism: 1, tagLength: 32, memory: 19456, passes: 2 }; // OWASP's Argon2id baseline

export const DEFAULT_LIMITS = {
  userFree: 5, userBaseMs: 60 * 1000, userMaxMs: 60 * 60 * 1000, userForgetMs: 24 * 3600 * 1000,
  ipWindowMs: 15 * 60 * 1000, ipMax: 50, ipLockMs: 15 * 60 * 1000,
  signupWindowMs: 60 * 60 * 1000, signupMax: 10
};

export function usernameProblem(name) {
  if (!name) return "Enter your username.";
  if (!USERNAME.test(name)) return "Usernames are 3-20 letters, numbers or underscores.";
  return null;
}
// Always a string: a number would lose its leading zeroes ("00731" is not 731)
export function pinProblem(pin) {
  if (typeof pin !== "string" || !pin) return "Enter your 5-digit PIN.";
  if (!/^\d{5}$/.test(pin)) return "Your PIN is exactly 5 digits (0-9).";
  return null;
}
// The first PINs anyone would try
export const easyPin = (pin) => /^(\d)\1{4}$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin);

export function hashSecret(secret, pepper) {
  const nonce = randomBytes(16);
  const hash = argon2Sync("argon2id", { message: secret, nonce, secret: pepper, ...ARGON });
  return `argon2id$m=${ARGON.memory},t=${ARGON.passes},p=${ARGON.parallelism}$${nonce.toString("base64")}$${hash.toString("base64")}`;
}
function verifySecret(secret, stored, salt, pepper) {
  if (stored.startsWith("argon2id$")) {
    const [, params, nonce, hash] = stored.split("$");
    const p = Object.fromEntries(params.split(",").map((kv) => kv.split("=")));
    const want = Buffer.from(hash, "base64");
    const got = argon2Sync("argon2id", { message: secret, nonce: Buffer.from(nonce, "base64"), secret: pepper,
      parallelism: Number(p.p), tagLength: want.length, memory: Number(p.m), passes: Number(p.t) });
    return timingSafeEqual(got, want);
  }
  // Admin passwords saved before migration 002 (scrypt)
  const want = Buffer.from(stored, "hex");
  const got = scryptSync(secret, salt, 32);
  return got.length === want.length && timingSafeEqual(got, want);
}

export function createAuth({ db, config, now = Date.now }) {
  if (!Buffer.isBuffer(config.pepper) || config.pepper.length < 16) throw new Error("Accounts need a pepper (16+ random bytes).");
  const pepper = config.pepper;
  const L = { ...DEFAULT_LIMITS, ...(config.limits || {}) };
  const st = (sql) => db.prepare(sql);
  const get = (sql, ...a) => st(sql).get(...a);
  const run = (sql, ...a) => st(sql).run(...a);
  const ledger = createLedger({ db, now });
  const audit = createAudit({ db, now });
  let dummy = null; // a hash to check against when the username doesn't exist, so it takes just as long
  const dummyHash = () => (dummy = dummy || hashSecret("00000", pepper));
  const elevateMs = (config.elevateMinutes || 30) * 60000;

  const publicUser = (u, s = null) => u && { id: u.id, accountId: u.account_id, username: u.username, role: u.role, status: u.status,
    isAdmin: u.role === "admin" || u.role === "super_admin", isStaff: u.role !== "user", perms: PERMISSIONS[u.role] || [],
    balance: u.balance, createdAt: u.created_at,
    elevated: !!(s && u.role !== "user" && s.elevated_until > now()), elevatedUntil: s && s.elevated_until > now() ? s.elevated_until : null };

  /* ---------- Throttling ---------- */

  const row = (key) => get("SELECT * FROM auth_throttle WHERE key = ?", key) || { key, failures: 0, window_start: 0, last_failure: 0, locked_until: 0 };
  const put = (r) => run(`INSERT INTO auth_throttle (key, failures, window_start, last_failure, locked_until) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET failures = excluded.failures, window_start = excluded.window_start, last_failure = excluded.last_failure, locked_until = excluded.locked_until`,
    r.key, r.failures, r.window_start, r.last_failure, r.locked_until);
  const waitFor = (keys) => Math.max(0, ...keys.map((k) => row(k).locked_until - now()));
  const tooMany = (ms) => fail(429, `Too many tries. Try again in ${Math.ceil(ms / 60000)} minute${ms > 60000 ? "s" : ""}.`);

  function countMiss(userKey, ipKey) {
    const u = row(userKey);
    if (now() - u.last_failure > L.userForgetMs) u.failures = 0;
    u.failures++;
    u.last_failure = now();
    if (u.failures >= L.userFree) u.locked_until = now() + Math.min(L.userMaxMs, L.userBaseMs * 2 ** (u.failures - L.userFree));
    put(u);
    const ip = row(ipKey);
    if (now() - ip.window_start > L.ipWindowMs) { ip.failures = 0; ip.window_start = now(); }
    ip.failures++;
    ip.last_failure = now();
    if (ip.failures >= L.ipMax) ip.locked_until = now() + L.ipLockMs;
    put(ip);
  }
  function undoMiss(userKey, ipKey) {
    run("DELETE FROM auth_throttle WHERE key = ?", userKey);
    run("UPDATE auth_throttle SET failures = MAX(0, failures - 1) WHERE key = ?", ipKey);
  }

  /* ---------- Sessions ---------- */

  function startSession(userId) {
    const token = randomBytes(32).toString("hex");
    run("DELETE FROM sessions WHERE expires_at <= ? OR last_seen <= ?", now(), now() - config.sessionIdleHours * 3600000);
    run("INSERT INTO sessions (token_hash, user_id, expires_at, created_at, last_seen) VALUES (?, ?, ?, ?, ?)",
      sha(token), userId, now() + config.sessionDays * 86400000, now(), now());
    run("UPDATE users SET last_sign_in_at = ? WHERE id = ?", now(), userId);
    return token;
  }
  // A session ends at its expiry, once it goes unused for sessionIdleHours, or when the account is suspended
  function sessionUser(token) {
    if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) return null;
    const s = get("SELECT * FROM sessions WHERE token_hash = ?", sha(token));
    if (!s) return null;
    const u = get("SELECT * FROM users WHERE id = ?", s.user_id);
    if (!u || u.status !== "active" || s.expires_at <= now() || now() - s.last_seen > config.sessionIdleHours * 3600000) {
      run("DELETE FROM sessions WHERE token_hash = ?", s.token_hash);
      return null;
    }
    if (now() - s.last_seen > 60000) run("UPDATE sessions SET last_seen = ? WHERE token_hash = ?", now(), s.token_hash);
    return publicUser(u, s);
  }
  const logout = (token) => { if (typeof token === "string" && token) run("DELETE FROM sessions WHERE token_hash = ?", sha(token)); };

  /* ---------- Signing in (PIN) ---------- */

  // One answer for every wrong guess, whether or not the username exists
  function signIn({ username, pin, ip }) {
    const name = String(username ?? "").trim();
    const problem = usernameProblem(name) || pinProblem(pin);
    if (problem) fail(400, problem);
    const userKey = `user:pin:${name.toLowerCase()}`, ipKey = `ip:${ip || "?"}`;
    const wait = waitFor([userKey, ipKey]);
    if (wait > 0) tooMany(wait);
    countMiss(userKey, ipKey); // counted before checking, so requests sent all at once can't skip the limit
    const u = get("SELECT * FROM users WHERE username = ?", name);
    const right = u && u.credential === "pin";
    const ok = verifySecret(pin, right ? u.pass_hash : dummyHash(), right ? u.pass_salt : "", pepper) && right;
    if (!ok) fail(401, "That username and PIN don't match an account.");
    undoMiss(userKey, ipKey);
    // Only someone with the right PIN learns an account is suspended
    if (u.status !== "active") fail(403, "This account is suspended. Contact a league admin.");
    return { token: startSession(u.id), user: publicUser(u) };
  }

  /* ---------- Unlocking admin tools (staff and above) ---------- */

  // A role alone doesn't open admin tools: the person enters their PIN again, which unlocks them on this one
  // session for elevateMinutes (so a browser left signed in can't be used for admin changes). Only accounts a
  // Super Admin gave a role can do it, and wrong PINs here lock out just like at sign-in.
  function elevate({ token, user, pin, ip }) {
    if (!user) fail(401, "Sign in first.");
    if (user.role === "user") fail(403, "Your account doesn't have admin access.");
    const problem = pinProblem(pin);
    if (problem) fail(400, problem);
    const u = get("SELECT * FROM users WHERE id = ?", user.id);
    const userKey = `elevate:${u.id}`, ipKey = `ip:${ip || "?"}`;
    const wait = waitFor([userKey, ipKey]);
    if (wait > 0) tooMany(wait);
    countMiss(userKey, ipKey);
    if (u.credential !== "pin" || !verifySecret(pin, u.pass_hash, u.pass_salt, pepper)) fail(401, "That PIN isn't right.");
    undoMiss(userKey, ipKey);
    const until = now() + elevateMs;
    run("UPDATE sessions SET elevated_until = ? WHERE token_hash = ?", until, sha(token));
    audit.log({ actorId: u.id, action: "admin.unlock", targetType: "user", targetId: u.account_id, detail: { until } });
    return { elevatedUntil: until };
  }
  const lockAdmin = (token) => { if (typeof token === "string" && token) run("UPDATE sessions SET elevated_until = 0 WHERE token_hash = ?", sha(token)); };

  /* ---------- New accounts ---------- */

  function createAccount({ username, pin, confirmPin, ip }) {
    const name = String(username ?? "").trim();
    const problem = usernameProblem(name) || pinProblem(pin);
    if (problem) fail(400, problem);
    if (RESERVED.has(name.toLowerCase())) fail(409, "That username isn't available.");
    if (easyPin(pin)) fail(400, "That PIN is too easy to guess (like 11111 or 12345). Pick another.");
    if (confirmPin !== pin) fail(400, "The two PINs don't match.");
    // A few new accounts per address per hour, so names can't be checked in bulk or made by the hundred
    const key = `signup:${ip || "?"}`;
    const r = row(key);
    if (now() - r.window_start > L.signupWindowMs) { r.failures = 0; r.window_start = now(); }
    if (r.failures >= L.signupMax) tooMany(r.window_start + L.signupWindowMs - now());
    r.failures++;
    put(r);
    const hash = hashSecret(pin, pepper);
    const u = tx(db, () => {
      if (get("SELECT id FROM users WHERE username = ?", name)) fail(409, "That username is taken.");
      // Every new account is a plain user; roles are only ever given afterwards by a Super Admin (or the local bootstrap)
      const { lastInsertRowid } = run(`INSERT INTO users (username, pass_hash, pass_salt, balance, created_at, account_id, credential, role, status)
        VALUES (?, ?, '', 0, ?, ?, 'pin', 'user', 'active')`, name, hash, now(), randomUUID());
      const id = Number(lastInsertRowid);
      // Starting virtual points: once, when the account is made (never on sign-in)
      ledger.post({ userId: id, delta: config.startBalance, kind: "grant", note: "Starting virtual points (no cash value)", idempotencyKey: `grant:${id}` });
      return get("SELECT * FROM users WHERE id = ?", id);
    });
    return { token: startSession(u.id), user: publicUser(u) };
  }

  /* ---------- The accounts tool (this computer only) ---------- */

  // There's no PIN reset by email or text yet, so a local admin sets a new PIN here.
  // Signs the account out everywhere and clears its lockout.
  function setPin(username, pin) {
    const problem = pinProblem(pin);
    if (problem) fail(400, problem);
    if (easyPin(pin)) fail(400, "That PIN is too easy to guess.");
    const u = get("SELECT * FROM users WHERE username = ?", String(username ?? "").trim());
    if (!u) fail(404, "No account has that username.");
    tx(db, () => {
      run("UPDATE users SET pass_hash = ?, pass_salt = '', credential = 'pin' WHERE id = ?", hashSecret(pin, pepper), u.id);
      run("DELETE FROM sessions WHERE user_id = ?", u.id);
      run("DELETE FROM auth_throttle WHERE key = ?", `user:pin:${u.username.toLowerCase()}`);
    });
    return publicUser(get("SELECT * FROM users WHERE id = ?", u.id));
  }

  // The first Super Admin, set up on this computer. Only works while there is no Super Admin, only for an existing
  // PIN account that has really been signed into (made and used through the site), never for a made-up name.
  function bootstrapSuperAdmin(username) {
    if (get("SELECT id FROM users WHERE role = 'super_admin'")) fail(409, "There's already a Super Admin. Give roles on the Admin Permissions page instead.");
    const u = get("SELECT * FROM users WHERE username = ?", String(username ?? "").trim());
    if (!u) fail(404, "No account has that username. Create it on the site first (Create an account), then run this again.");
    if (u.credential !== "pin" || !u.last_sign_in_at) fail(409, "That account hasn't been set up through the site's sign-up and sign-in yet.");
    if (u.status !== "active") fail(409, "That account is suspended.");
    tx(db, () => {
      run("UPDATE users SET role = 'super_admin', role_granted_at = ?, role_granted_by = NULL WHERE id = ?", now(), u.id);
      audit.log({ actorId: null, action: "role.bootstrap", targetType: "user", targetId: u.account_id,
        detail: { username: u.username, before: { role: u.role }, after: { role: "super_admin" }, reason: "First Super Admin, set up with the local accounts tool" } });
    });
    return publicUser(get("SELECT * FROM users WHERE id = ?", u.id));
  }

  // Local recovery: take a role away from the command line (the Admin Permissions page does this normally)
  function revokeRoleLocally(username) {
    const u = get("SELECT * FROM users WHERE username = ?", String(username ?? "").trim());
    if (!u) fail(404, "No account has that username.");
    if (u.role === "user") fail(409, "That account has no role to take away.");
    tx(db, () => {
      run("UPDATE users SET role = 'user', role_granted_at = ?, role_granted_by = NULL WHERE id = ?", now(), u.id);
      run("UPDATE sessions SET elevated_until = 0 WHERE user_id = ?", u.id);
      audit.log({ actorId: null, action: "role.revoke", targetType: "user", targetId: u.account_id,
        detail: { username: u.username, before: { role: u.role }, after: { role: "user" }, reason: "Taken away with the local accounts tool" } });
    });
    return publicUser(get("SELECT * FROM users WHERE id = ?", u.id));
  }

  // The signed-in person's own account page
  function profile(user) {
    if (!user) fail(401, "Sign in to see your account.");
    const u = get("SELECT * FROM users WHERE id = ?", user.id);
    const picks = get(`SELECT COUNT(*) AS n, COALESCE(SUM(result = 'won'), 0) AS won, COALESCE(SUM(result = 'lost'), 0) AS lost,
      COALESCE(SUM(result = 'pending'), 0) AS pending FROM predictions WHERE user_id = ?`, u.id);
    return { user: { ...publicUser(u), elevated: user.elevated, elevatedUntil: user.elevatedUntil },
      roleGrantedAt: u.role_granted_at, picks: { total: picks.n, won: picks.won, lost: picks.lost, pending: picks.pending } };
  }

  return { signIn, createAccount, setPin, bootstrapSuperAdmin, revokeRoleLocally, elevate, lockAdmin, sessionUser, logout, profile };
}

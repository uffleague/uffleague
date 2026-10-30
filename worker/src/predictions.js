// UFF accounts, predictions, parlays, points and rewards on Cloudflare: one SQLite-backed Durable Object ("uff").
// It runs the same code as the local server (predictions/*.js): the same migrations, the same rules, the same
// transactions. A Durable Object handles one request at a time and its SQLite transactions are real, so the
// points ledger keeps the guarantees it has locally (no double payouts, no lost updates).
//
// The rest of the Worker (league admin saves, the Discord bot, the public data the site reads) is untouched:
// only paths starting /api/ come here (see index.js).
import { DurableObject } from "cloudflare:workers";
import { Buffer } from "node:buffer";
import { runMigrationsUp, splitStatements } from "../../predictions/txn.js";
import { buildLeague } from "../../predictions/league-core.js";
import { parseLeague } from "../../predictions/jsliteral.js";
import { createService } from "../../predictions/service.js";
import { createLedger } from "../../predictions/ledger.js";
import { createAudit } from "../../predictions/audit.js";
import { createLimiter } from "../../predictions/limits.js";
import { createChallenges } from "../../predictions/challenges.js";
import { createRewards } from "../../predictions/rewards.js";
import { createAdminTools } from "../../predictions/admin.js";
import { createAuth } from "../../predictions/auth.js";
import { createRoutes } from "../../predictions/routes.js";
import { HttpError } from "../../predictions/errors.js";
import { need } from "../../predictions/roles.js";
import m001up from "../../predictions/migrations/001_init.up.sql";
import m001down from "../../predictions/migrations/001_init.down.sql";
import m002up from "../../predictions/migrations/002_accounts.up.sql";
import m002down from "../../predictions/migrations/002_accounts.down.sql";
import m003up from "../../predictions/migrations/003_admin.up.sql";
import m003down from "../../predictions/migrations/003_admin.down.sql";

export const MIGRATIONS = [
  { version: 1, up: m001up, down: m001down },
  { version: 2, up: m002up, down: m002down },
  { version: 3, up: m003up, down: m003down }
];

const SITE_DATA = "https://uffleague.github.io/uffleague/data.js";
const LEAGUE_CACHE_MS = 60 * 1000;

// The settings the local server keeps in predictions/config.js (the parts that apply here)
export const CONFIG = {
  startBalance: 500,
  defaultStake: 50,
  maxStake: 100,
  minLeaderboard: 3,
  sessionDays: 7,
  sessionIdleHours: 24,
  // Workers have no Argon2: PINs get PBKDF2 keyed with the PIN_PEPPER secret (see predictions/auth.js)
  pinHash: "pbkdf2",
  pinIterations: 10000
};
const BODY_MAX = 64 * 1024;
const LEAGUE_TOKEN_HOURS = 12; // the same as a league login (index.js)

// The Durable Object's SQLite, shaped like node:sqlite's DatabaseSync so the shared code runs unchanged:
// prepare(sql).get/all/run, exec(sql), and transaction(fn) (Durable Objects don't allow BEGIN/COMMIT statements;
// transactionSync is their transaction).
export function sqlDb(ctx) {
  const sql = ctx.storage.sql;
  return {
    prepare: (q) => ({
      get: (...a) => sql.exec(q, ...a).toArray()[0],
      all: (...a) => sql.exec(q, ...a).toArray(),
      run: (...a) => {
        const cur = sql.exec(q, ...a);
        cur.toArray();
        return { changes: cur.rowsWritten, lastInsertRowid: sql.exec("SELECT last_insert_rowid() AS id").one().id };
      }
    }),
    exec: (q) => { splitStatements(q).forEach((s) => sql.exec(s)); },
    transaction: (fn) => ctx.storage.transactionSync(fn)
  };
}

// League data the way the site sees it: data.js (teams, schedule, aliases) plus the saved data in KV
// (the bot's schedule, finals and box scores, team edits, renames). Read again at most once a minute.
export function workerLeague(env, now = Date.now) {
  let cache = null; // { view, at }
  let lastError = null;
  return {
    mode: "live",
    label: "",
    async get() {
      if (!cache || now() - cache.at > LEAGUE_CACHE_MS) {
        try {
          const [res, saved] = await Promise.all([fetch(env.SITE_DATA || SITE_DATA), env.UFF.get("data", { type: "json" })]);
          if (!res.ok) throw new Error(`data.js answered ${res.status}`);
          cache = { view: buildLeague(parseLeague(await res.text()), saved || {}), at: now() };
          lastError = null;
        } catch (e) {
          lastError = e.message || String(e);
        }
      }
      if (!cache) return { ok: false, source: "live", fetchedAt: null, error: lastError, view: buildLeague({ conferences: [], schedule: [] }, {}) };
      return { ok: true, source: "live", fetchedAt: cache.at, error: lastError, view: cache.view };
    }
  };
}

// config.pepper (a Buffer) turns on accounts; without it there's no sign-in
export function buildTools({ db, league, config = CONFIG, now = Date.now }) {
  const ledger = createLedger({ db, now });
  const audit = createAudit({ db, now });
  const limiter = createLimiter({ db, now });
  const service = createService({ db, league, config, now });
  return { service, ledger, audit, limiter, auth: config.pepper ? createAuth({ db, config, now }) : null,
    challenges: createChallenges({ db, service, ledger, audit, limiter, now }),
    rewards: createRewards({ db, ledger, audit, limiter, now }),
    admin: createAdminTools({ db, ledger, audit, limiter, now }) };
}

export class PredictionsDB extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.db = sqlDb(ctx);
    // Migrations run before the first request is handled (blockConcurrencyWhile holds requests until it's done)
    ctx.blockConcurrencyWhile(async () => { this.migrated = runMigrationsUp(this.db, MIGRATIONS); });
    this.league = workerLeague(env);
    const pepper = /^[0-9a-f]{64}$/i.test(env.PIN_PEPPER || "") ? Buffer.from(env.PIN_PEPPER, "hex") : null;
    this.tools = buildTools({ db: this.db, league: this.league, config: { ...CONFIG, pepper } });
    const { auth, audit, limiter } = this.tools;
    this.route = auth && createRoutes({ ...this.tools, league: this.league, config: CONFIG,
      // A staff or admin site account is signed in to the League Admin with a league token made here, the same kind
      // a league login gives (signed with ADMIN_PASSWORD_HASH), so no league password is kept anywhere for it
      async leagueSignIn(user) {
        need(user, "admin.view");
        limiter(`league:${user.id}`, 20, 10 * 60000);
        if (!env.ADMIN_PASSWORD_HASH) throw new HttpError(500, "The League Admin login isn't set up.");
        const exp = Date.now() + LEAGUE_TOKEN_HOURS * 3600 * 1000;
        audit.log({ actorId: user.id, action: "league.login", targetType: "user", targetId: user.accountId, detail: { username: user.username, as: user.username } });
        return { user: user.username, token: `${exp}.${b64(user.username)}.${await hmac(env.ADMIN_PASSWORD_HASH, `${exp}.${user.username}`)}` };
      } });
  }

  // What's there (used to check a deploy): schema version, row counts, the ledger check, league data
  async health() {
    const count = (t) => this.db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
    const l = await this.league.get();
    return {
      ok: true,
      schema: this.db.prepare("SELECT MAX(version) AS v FROM schema_migrations").get().v,
      accounts: count("users"), markets: count("markets"), challenges: count("challenges"), rewards: count("rewards"),
      superAdmin: !!this.db.prepare("SELECT id FROM users WHERE role = 'super_admin' AND status = 'active'").get(),
      signIn: !!this.route,
      ledgerMismatches: this.tools.ledger.mismatches().length,
      league: { ok: l.ok, error: l.error, teams: l.view.teams.length, games: l.view.games.length, finals: l.view.games.filter((g) => g.final).length }
    };
  }

  // The first Super Admin: an account made on the site, promoted by whoever knows the League Admin password.
  // Only works while there's no Super Admin; after that, roles are given on Admin -> Permissions.
  async bootstrapAdmin(body, ip) {
    this.tools.limiter(`bootstrap:${ip}`, 5, 15 * 60000);
    const hash = this.env.ADMIN_PASSWORD_HASH;
    if (!hash || !same(await sha256hex(String(body.leaguePassword || "")), hash)) throw new HttpError(401, "That isn't the League Admin password.");
    return { user: this.tools.auth.bootstrapSuperAdmin(body.username) };
  }

  async fetch(req) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "");
    try {
      if (req.method === "GET" && path === "/api/health") return json(await this.health());
      if (!this.route) throw new HttpError(503, "Accounts aren't set up on the server yet.");
      const ip = req.headers.get("cf-connecting-ip") || "";
      const body = req.method === "POST" ? await readJson(req) : {};
      if (req.method === "POST" && path === "/api/auth/bootstrap-admin") return json(await this.bootstrapAdmin(body, ip));
      // Signed in = a session token in the Authorization header (the site keeps it; no cookies across sites)
      const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      const user = this.tools.auth.sessionUser(token);
      const out = await this.route({ method: req.method, url, body, user, token, ip });
      return json(out.body);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, ...(e.code ? { code: e.code } : {}) }, e.status);
      console.error(e);
      return json({ error: "Something went wrong on the server." }, 500);
    }
  }
}

async function readJson(req) {
  if (!/^application\/json\b/i.test(req.headers.get("content-type") || "")) throw new HttpError(415, "Send JSON.");
  const text = await req.text();
  if (text.length > BODY_MAX) throw new HttpError(413, "That's too big.");
  try { return text ? JSON.parse(text) : {}; } catch (e) { throw new HttpError(400, "That isn't valid JSON."); }
}

// Sign-in is a bearer token, not a cookie, so any page may call this (like the rest of the Worker)
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-max-age": "86400"
};
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff", ...CORS }
});

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256hex = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(String(msg))));
}
const b64 = (s) => btoa(String.fromCharCode(...enc.encode(s)));
function same(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// index.js sends every /api/ request here: one Durable Object holds all of it
export function predictionsFetch(req, env) {
  const stub = env.PREDICTIONS.get(env.PREDICTIONS.idFromName("uff"));
  return stub.fetch(req);
}

// Local development server for UFF Predictions. It's for this computer only:
//   - listens on 127.0.0.1 and turns away any request whose Host isn't this machine
//   - serves the site's own files (an allow-list, so the database and .git are never served) and /api/predictions/*
//   - keeps everything in a local SQLite file under predictions/.local/ (git-ignored)
//   - never writes to the live site or its Worker; live mode only reads the public league data
// Start:  npm run predictions        (real UFF schedule/results, read-only)
//         npm run predictions:demo   (sample games, works offline)
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import { openDb } from "./db.js";
import { createLeagueSource } from "./league.js";
import { createService, HttpError } from "./service.js";
import { createAuth } from "./auth.js";
import { createLedger } from "./ledger.js";
import { createAudit } from "./audit.js";
import { createLimiter } from "./limits.js";
import { createChallenges } from "./challenges.js";
import { createRewards } from "./rewards.js";
import { createAdminTools } from "./admin.js";
import { CONFIG, SITE_ROOT, dbPath, loadPepper, loadLeagueLogin, saveLeagueLogin } from "./config.js";
import { need } from "./roles.js";
import { createRoutes } from "./routes.js";

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
// The site's files, and nothing else in the folder
const STATIC_OK = /^\/(index\.html|app\.js|data\.js|stats-alltime(-[a-z0-9]+)?\.js|styles\.css|logo(-main)?\.png|(logos|gfx)\/[A-Za-z0-9_\-./ ]+\.(png|jpe?g|webp|svg))$/;
const BODY_MAX = 64 * 1024;
const SESSION = "uffp_session";
const CSRF = "uffp_csrf";

const send = (res, status, body, cookies = []) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff",
    ...(cookies.length ? { "set-cookie": cookies } : {}) });
  res.end(JSON.stringify(body));
};
const cookieOf = (req, name) => (String(req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith(`${name}=`)) || "").slice(name.length + 1);
// SameSite=Strict always; Secure whenever the site is served over HTTPS (or PRED_SECURE_COOKIES=1)
const cookie = (name, value, maxAge, { httpOnly = true, secure = false } = {}) =>
  `${name}=${value}; ${httpOnly ? "HttpOnly; " : ""}${secure ? "Secure; " : ""}SameSite=Strict; Path=/; Max-Age=${maxAge}`;
const sameText = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

async function readJson(req) {
  if (!/^application\/json\b/i.test(req.headers["content-type"] || "")) throw new HttpError(415, "Send JSON.");
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > BODY_MAX) throw new HttpError(413, "That's too big.");
    chunks.push(c);
  }
  try { return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}; } catch (e) { throw new HttpError(400, "That isn't valid JSON."); }
}

// The pieces behind the routes, all on one database
export function createTools({ db, league, config, now = Date.now }) {
  const ledger = createLedger({ db, now });
  const audit = createAudit({ db, now });
  const limiter = createLimiter({ db, now });
  const service = createService({ db, league, config, now });
  const auth = createAuth({ db, config, now });
  return { service, auth, ledger, audit, limiter,
    challenges: createChallenges({ db, service, ledger, audit, limiter, now }),
    rewards: createRewards({ db, ledger, audit, limiter, now }),
    admin: createAdminTools({ db, ledger, audit, limiter, now }) };
}

export function createServer({ service, auth, challenges, rewards, admin, audit, limiter, league, config = CONFIG, port,
  leagueLogin = loadLeagueLogin, saveLeague = saveLeagueLogin, leagueFetch = (url, opts) => fetch(url, opts) }) {
  // Logs a staff/admin site account in to the live League Admin with the league login saved on this computer.
  // The league password never reaches the browser; the browser gets the same 12-hour token a normal league login gives.
  async function leagueSignIn(user, given = null) {
    need(user, "admin.view");
    if (limiter) limiter(`league:${user.id}`, 20, 10 * 60000);
    const creds = given || leagueLogin();
    if (!creds) throw new HttpError(409, "It isn't set up on this computer yet. Log in below once with \"Save for automatic sign-in\" ticked (an Admin account has to do it).", "league-not-set");
    let res, data = {};
    try {
      res = await leagueFetch(config.liveUrl, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "login", username: creds.username, password: creds.password, name: user.username }) });
      data = await res.json();
    } catch (e) {
      throw new HttpError(502, "Couldn't reach the live League Admin. Check the internet connection.");
    }
    if (!res.ok || !data.token) throw new HttpError(given ? 400 : 502, given ? `The live League Admin says: ${data.error || "that login didn't work"}`
      : `The live League Admin turned the saved login down (${data.error || res.status}). Log in below once with "Save" ticked to update it.`);
    if (audit) audit.log({ actorId: user.id, action: "league.login", targetType: "user", targetId: user.accountId, detail: { username: user.username, as: data.name || user.username } });
    return { user: data.name || user.username, token: data.token };
  }

  const route = createRoutes({ service, auth, challenges, rewards, admin, league, config, leagueSignIn,
    async saveLeagueLogin(user, body) {
      if (!user || !user.isAdmin) throw new HttpError(user ? 403 : 401, "Only Admin and Super Admin accounts can save the league login.");
      const username = String(body.username || "").trim(), password = String(body.password || "");
      if (!username || !password || username.length > 60 || password.length > 200) throw new HttpError(400, "Enter the league username and password.");
      const signed = await leagueSignIn(user, { username, password });
      saveLeague({ username, password });
      if (audit) audit.log({ actorId: user.id, action: "league.login_saved", targetType: "user", targetId: user.accountId, detail: { leagueUsername: username } });
      return signed;
    } });

  const hostOk = (h) => {
    const p = String(port());
    return [`127.0.0.1:${p}`, `localhost:${p}`].includes(String(h || "").toLowerCase());
  };

  async function api(req, res, url) {
    const method = req.method;
    const secure = !!(config.secureCookies || req.socket.encrypted);
    const cookies = [];
    // CSRF: the page copies a random value from a readable cookie into an X-CSRF-Token header on every POST.
    // Another site can't read the cookie, so it can't send the header. (Also: SameSite=Strict, JSON only, Origin checked.)
    const csrf = cookieOf(req, CSRF);
    if (!/^[0-9a-f]{32}$/.test(csrf)) cookies.push(cookie(CSRF, randomBytes(16).toString("hex"), 30 * 86400, { httpOnly: false, secure }));
    if (method !== "GET") {
      const origin = req.headers.origin;
      if (origin && !hostOk(origin.replace(/^https?:\/\//i, ""))) throw new HttpError(403, "Requests from other sites aren't allowed.");
      const sent = String(req.headers["x-csrf-token"] || "");
      if (!/^[0-9a-f]{32}$/.test(csrf) || !sameText(sent, csrf)) throw new HttpError(403, "This page's security check expired. Reload the page and try again.");
    }
    const token = cookieOf(req, SESSION);
    const user = auth.sessionUser(token);
    const body = method === "POST" ? await readJson(req) : {};
    const out = await route({ method, url, body, user, token, ip: req.socket.remoteAddress || "" });
    if (out.session === undefined) return send(res, 200, out.body, cookies);
    // The session travels in an HttpOnly cookie here, never in the page
    const { token: _t, ...shown } = out.body;
    return send(res, 200, shown, [...cookies, cookie(SESSION, out.session, out.session ? config.sessionDays * 86400 : 0, { secure })]);
  }

  async function staticFile(req, res, url) {
    let p;
    try { p = decodeURIComponent(url.pathname); } catch (e) { p = ""; }
    if (p === "/") p = "/index.html";
    if (!STATIC_OK.test(p) || p.includes("..")) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("Not found"); }
    const file = normalize(join(SITE_ROOT, p));
    if (!file.startsWith(SITE_ROOT + sep)) { res.writeHead(404); return res.end(); }
    try {
      if (!(await stat(file)).isFile()) throw new Error();
      const data = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-cache", "x-content-type-options": "nosniff" });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch (e) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
    }
  }

  return http.createServer(async (req, res) => {
    // Only this computer, by name: stops other machines and DNS-rebinding pages from reaching it
    if (!hostOk(req.headers.host)) { res.writeHead(421, { "content-type": "text/plain" }); return res.end("This server only answers on 127.0.0.1 / localhost."); }
    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
      if (/^\/api\/(predictions|auth|account|challenges|rewards|admin)(\/|$)/.test(url.pathname)) return await api(req, res, url);
      if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "Method not allowed" });
      return await staticFile(req, res, url);
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message, ...(e.code ? { code: e.code } : {}) });
      console.error(e);
      return send(res, 500, { error: "Something went wrong on the local server." });
    }
  });
}

async function main() {
  const demo = process.argv.includes("--demo");
  const file = dbPath(demo);
  const db = openDb(file);
  const league = createLeagueSource({ mode: demo ? "demo" : "live", db, startedAt: Date.now() });
  const config = { ...CONFIG, pepper: loadPepper() };
  const tools = createTools({ db, league, config });
  // Demo mode gets a few clearly labeled sample rewards so the shop can be tried; live mode starts with none
  if (demo) tools.rewards.seedDemo();
  const superAdmin = db.prepare("SELECT username FROM users WHERE role = 'super_admin' AND status = 'active' LIMIT 1").get();
  const server = createServer({ ...tools, league, config, port: () => server.address().port });
  server.listen(CONFIG.port, CONFIG.host, async () => {
    const url = `http://127.0.0.1:${server.address().port}/`;
    const l = await league.get();
    console.log(`\nUFF Predictions (local only) - ${demo ? "DEMO mode: sample games" : "live league data, read-only"}`);
    console.log(`  Open:      ${url}`);
    console.log(`  Sign in:   ${url}#/sign-in   (accounts: node predictions/accounts.js)`);
    console.log(`  Database:  ${file}`);
    console.log(`  League:    ${l.ok ? "loaded" : `NOT available (${l.error})`}`);
    console.log(superAdmin ? `  Admin:     ${superAdmin.username} is a Super Admin (UFF Admin: ${url}#/uff-admin)`
      : `  Admin:     no Super Admin yet. Make an account on the site, then: node predictions/accounts.js bootstrap-admin <username>${demo ? " --demo" : ""}`);
    console.log("  Stop with Ctrl+C.\n");
  });
  server.on("error", (e) => {
    console.error(e.code === "EADDRINUSE" ? `Port ${CONFIG.port} is in use. Set PRED_PORT to another port.` : e);
    process.exit(1);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main();

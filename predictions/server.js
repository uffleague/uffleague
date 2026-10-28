// Local development server for UFF Predictions. It's for this computer only:
//   - listens on 127.0.0.1 and turns away any request whose Host isn't this machine
//   - serves the site's own files (an allow-list, so the database and .git are never served) and /api/predictions/*
//   - keeps everything in a local SQLite file under predictions/.local/ (git-ignored)
//   - never writes to the live site or its Worker; live mode only reads the public league data
// Start:  npm run predictions        (real UFF schedule/results, read-only)
//         npm run predictions:demo   (sample games, works offline)
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { openDb } from "./db.js";
import { createLeagueSource } from "./league.js";
import { createService, HttpError } from "./service.js";
import { CONFIG, SITE_ROOT, LOCAL_DIR, dbPath } from "./config.js";

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
// The site's files, and nothing else in the folder
const STATIC_OK = /^\/(index\.html|app\.js|data\.js|stats-alltime(-[a-z0-9]+)?\.js|styles\.css|logo(-main)?\.png|(logos|gfx)\/[A-Za-z0-9_\-./ ]+\.(png|jpe?g|webp|svg))$/;
const BODY_MAX = 64 * 1024;
const COOKIE = "uffp_session";

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...headers });
  res.end(JSON.stringify(body));
};
const cookieOf = (req) => (String(req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`)) || "").slice(COOKIE.length + 1);
const sessionCookie = (token, maxAge) => `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}`;

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

export function createServer({ service, league, config = CONFIG, port }) {
  const hostOk = (h) => {
    const p = String(port());
    return [`127.0.0.1:${p}`, `localhost:${p}`].includes(String(h || "").toLowerCase());
  };

  async function api(req, res, url) {
    const path = url.pathname.replace(/^\/api\/predictions/, "").replace(/\/+$/, "") || "/";
    const method = req.method;
    // A page on another site can't post here: the session cookie is SameSite=Strict, the body must be JSON,
    // and a cross-site Origin is turned away
    if (method !== "GET") {
      const origin = req.headers.origin;
      if (origin && !hostOk(origin.replace(/^https?:\/\//i, ""))) throw new HttpError(403, "Requests from other sites aren't allowed.");
    }
    const token = cookieOf(req);
    const user = service.sessionUser(token);
    const body = method === "POST" ? await readJson(req) : {};
    let m;

    if (method === "GET" && path === "/config") {
      const l = await league.get();
      return send(res, 200, { mode: league.mode, label: league.label || "", league: { ok: l.ok, error: l.error, fetchedAt: l.fetchedAt },
        startBalance: config.startBalance, minLeaderboard: config.minLeaderboard, user });
    }
    if (method === "POST" && path === "/auth/signup") {
      service.createUser({ username: body.username, password: body.password });
      const s = service.login({ username: body.username, password: body.password });
      return send(res, 200, { user: s.user }, { "set-cookie": sessionCookie(s.token, config.sessionDays * 86400) });
    }
    if (method === "POST" && path === "/auth/login") {
      const s = service.login({ username: body.username, password: body.password });
      return send(res, 200, { user: s.user }, { "set-cookie": sessionCookie(s.token, config.sessionDays * 86400) });
    }
    if (method === "POST" && path === "/auth/logout") {
      service.logout(token);
      return send(res, 200, { ok: true }, { "set-cookie": sessionCookie("", 0) });
    }
    if (method === "GET" && path === "/markets") {
      const q = url.searchParams;
      return send(res, 200, await service.listMarkets({ userId: user && user.id, kind: q.get("kind") || "", status: q.get("status") || "", q: q.get("q") || "", sort: q.get("sort") || "closing" }));
    }
    if (method === "GET" && (m = path.match(/^\/markets\/(\d+)$/))) return send(res, 200, await service.getMarket(m[1], user && user.id));
    if (method === "POST" && (m = path.match(/^\/markets\/(\d+)\/predict$/))) {
      const out = service.predict(user, m[1], String(body.selection || ""));
      return send(res, 200, { ...out, ...(await service.getMarket(m[1], user.id)) });
    }
    if (method === "GET" && path === "/me") return send(res, 200, await service.dashboard(user));
    if (method === "GET" && path === "/leaderboard") return send(res, 200, service.leaderboard());

    // Admin only (service checks too)
    if (!path.startsWith("/admin/")) throw new HttpError(404, "Not found.");
    if (!user) throw new HttpError(401, "Sign in first.");
    if (!user.isAdmin) throw new HttpError(403, "Only admins can do that.");
    if (method === "GET" && path === "/admin/games") return send(res, 200, await service.games(user));
    if (method === "GET" && path === "/admin/audit") return send(res, 200, { audit: service.auditLog(user, { marketId: url.searchParams.get("market") }) });
    if (method === "POST" && path === "/admin/markets") return send(res, 200, await service.createMarket(user, body));
    if (method === "POST" && path === "/admin/demo-result") return send(res, 200, await service.postDemoResult(user, body));
    if (method === "GET" && (m = path.match(/^\/admin\/markets\/(\d+)\/preview$/))) return send(res, 200, await service.preview(user, m[1]));
    if (method === "POST" && (m = path.match(/^\/admin\/markets\/(\d+)$/))) {
      const id = m[1], a = body.action;
      const out = a === "edit" ? service.editMarket(user, id, body.changes || {})
        : a === "resolve" ? await service.resolve(user, id, body)
        : a === "void" ? service.voidMarket(user, id, body.note)
        : service.setState(user, id, a, body.note);
      return send(res, 200, out);
    }
    throw new HttpError(404, "Not found.");
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
      if (url.pathname.startsWith("/api/predictions")) return await api(req, res, url);
      if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "Method not allowed" });
      return await staticFile(req, res, url);
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      console.error(e);
      return send(res, 500, { error: "Something went wrong on the local server." });
    }
  });
}

// The first time, a local admin account is made. Its password comes from PRED_ADMIN_PASSWORD, or is made up and
// written to predictions/.local/admin-login.txt (git-ignored). It only exists in this computer's database.
function ensureAdmin(db, service, demo) {
  if (db.prepare("SELECT id FROM users WHERE is_admin = 1").get()) return null;
  const username = process.env.PRED_ADMIN_USERNAME || "localadmin";
  const password = process.env.PRED_ADMIN_PASSWORD || randomBytes(9).toString("base64url");
  service.createUser({ username, password, isAdmin: true });
  mkdirSync(LOCAL_DIR, { recursive: true });
  const file = join(LOCAL_DIR, demo ? "admin-login-demo.txt" : "admin-login.txt");
  if (!process.env.PRED_ADMIN_PASSWORD) writeFileSync(file, `Local UFF Predictions admin (this computer only)\nusername: ${username}\npassword: ${password}\n`);
  return { username, file: process.env.PRED_ADMIN_PASSWORD ? null : file };
}

async function main() {
  const demo = process.argv.includes("--demo");
  const file = dbPath(demo);
  const db = openDb(file);
  const league = createLeagueSource({ mode: demo ? "demo" : "live", db, startedAt: Date.now() });
  const service = createService({ db, league, config: CONFIG });
  const made = ensureAdmin(db, service, demo);
  const server = createServer({ service, league, port: () => server.address().port });
  server.listen(CONFIG.port, CONFIG.host, async () => {
    const url = `http://127.0.0.1:${server.address().port}/#/uff-predictions`;
    const l = await league.get();
    console.log(`\nUFF Predictions (local only) - ${demo ? "DEMO mode: sample games" : "live league data, read-only"}`);
    console.log(`  Open:      ${url}`);
    console.log(`  Database:  ${file}`);
    console.log(`  League:    ${l.ok ? "loaded" : `NOT available (${l.error})`}`);
    const login = join(LOCAL_DIR, demo ? "admin-login-demo.txt" : "admin-login.txt");
    if (made) console.log(`  Admin:     made "${made.username}"${made.file ? `; password in ${made.file}` : " (password from PRED_ADMIN_PASSWORD)"}`);
    else if (existsSync(login)) console.log(`  Admin:     ${readFileSync(login, "utf8").split("\n")[1]} (password in ${login})`);
    console.log("  Stop with Ctrl+C.\n");
  });
  server.on("error", (e) => {
    console.error(e.code === "EADDRINUSE" ? `Port ${CONFIG.port} is in use. Set PRED_PORT to another port.` : e);
    process.exit(1);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main();

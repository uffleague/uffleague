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
import { CONFIG, SITE_ROOT, dbPath, loadPepper } from "./config.js";

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

export function createServer({ service, auth, challenges, rewards, admin, league, config = CONFIG, port }) {
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
    const ip = req.socket.remoteAddress || "";
    const signedIn = (s) => send(res, 200, { user: s.user }, [...cookies, cookie(SESSION, s.token, config.sessionDays * 86400, { secure })]);
    let m;

    // Accounts: /api/auth/* and /api/account
    if (url.pathname.startsWith("/api/auth/") || url.pathname.replace(/\/+$/, "") === "/api/account") {
      const path = url.pathname.replace(/\/+$/, "");
      if (method === "GET" && path === "/api/auth/session") return send(res, 200, { user }, cookies);
      if (method === "POST" && path === "/api/auth/login") return signedIn(auth.signIn({ username: body.username, pin: body.pin, ip }));
      if (method === "POST" && path === "/api/auth/signup") return signedIn(auth.createAccount({ username: body.username, pin: body.pin, confirmPin: body.confirmPin, ip }));
      // Staff and above unlock admin tools on this session by entering their PIN again
      if (method === "POST" && path === "/api/auth/elevate") return send(res, 200, auth.elevate({ token, user, pin: body.pin, ip }), cookies);
      if (method === "POST" && path === "/api/auth/lock") { auth.lockAdmin(token); return send(res, 200, { ok: true }, cookies); }
      if (method === "POST" && path === "/api/auth/logout") {
        auth.logout(token);
        return send(res, 200, { ok: true }, [...cookies, cookie(SESSION, "", 0, { secure })]);
      }
      if (method === "GET" && path === "/api/account") return send(res, 200, auth.profile(user), cookies);
      throw new HttpError(404, "Not found.");
    }

    const p = url.pathname.replace(/\/+$/, "");
    const q = url.searchParams;

    // Challenges (public; entering needs an account)
    if (p.startsWith("/api/challenges")) {
      if (method === "GET" && p === "/api/challenges") return send(res, 200, { challenges: challenges.list(user) }, cookies);
      if (method === "GET" && p === "/api/challenges/mine") return send(res, 200, { entries: challenges.myEntries(user) }, cookies);
      if (method === "GET" && (m = p.match(/^\/api\/challenges\/(\d+)$/))) return send(res, 200, await challenges.detail(user, m[1]), cookies);
      if (method === "POST" && (m = p.match(/^\/api\/challenges\/(\d+)\/enter$/))) {
        const out = challenges.enter(user, m[1], body.picks || {});
        return send(res, 200, { ...out, ...(await challenges.detail(user, m[1])) }, cookies);
      }
      throw new HttpError(404, "Not found.");
    }
    // Rewards (the catalog is public; redeeming and your history need an account)
    if (p.startsWith("/api/rewards")) {
      if (method === "GET" && p === "/api/rewards") return send(res, 200, rewards.catalog(user), cookies);
      if (method === "GET" && p === "/api/rewards/mine") return send(res, 200, { redemptions: rewards.mine(user) }, cookies);
      if (method === "POST" && p === "/api/rewards/redeem") return send(res, 200, rewards.redeem(user, { rewardId: body.rewardId, idempotencyKey: body.idempotencyKey }), cookies);
      if (method === "POST" && (m = p.match(/^\/api\/rewards\/redemptions\/(\d+)\/cancel$/))) return send(res, 200, rewards.cancelOwn(user, m[1]), cookies);
      throw new HttpError(404, "Not found.");
    }
    // UFF Admin: every function checks the permission (and the unlocked session) itself
    if (p.startsWith("/api/admin")) {
      if (!user) throw new HttpError(401, "Sign in first.");
      if (method === "GET" && p === "/api/admin/overview") return send(res, 200, admin.overview(user), cookies);
      if (method === "GET" && p === "/api/admin/users") return send(res, 200, { users: admin.search(user, q.get("q") || "") }, cookies);
      if (method === "GET" && (m = p.match(/^\/api\/admin\/users\/([0-9a-f-]{36})$/))) return send(res, 200, admin.detail(user, m[1]), cookies);
      if (method === "GET" && (m = p.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/ledger$/))) return send(res, 200, admin.history(user, m[1], q.get("before")), cookies);
      if (method === "POST" && p === "/api/admin/users/status") return send(res, 200, admin.setStatus(user, body), cookies);
      if (method === "POST" && p === "/api/admin/credits") return send(res, 200, admin.adjust(user, body), cookies);
      if (method === "GET" && p === "/api/admin/credit-reasons") return send(res, 200, { reasons: admin.reasons }, cookies);
      if (method === "GET" && p === "/api/admin/staff") return send(res, 200, { staff: admin.staffList(user) }, cookies);
      if (method === "POST" && p === "/api/admin/roles") return send(res, 200, admin.setRole(user, body), cookies);
      if (method === "GET" && p === "/api/admin/audit") {
        return send(res, 200, admin.auditLog(user, { action: q.get("action") || "", actor: q.get("actor") || "", targetType: q.get("targetType") || "",
          targetId: q.get("targetId") || "", beforeId: q.get("before") }), cookies);
      }
      if (method === "GET" && p === "/api/admin/challenges") return send(res, 200, { challenges: challenges.adminList(user) }, cookies);
      if (method === "GET" && p === "/api/admin/challenges/leg-options") return send(res, 200, { markets: await challenges.legOptions(user) }, cookies);
      if (method === "POST" && p === "/api/admin/challenges") return send(res, 200, challenges.create(user, body), cookies);
      if (method === "GET" && (m = p.match(/^\/api\/admin\/challenges\/(\d+)\/settle-preview$/))) return send(res, 200, challenges.settlePreview(user, m[1]), cookies);
      if (method === "POST" && (m = p.match(/^\/api\/admin\/challenges\/(\d+)$/))) {
        const a = body.action;
        const out = a === "update" ? challenges.update(user, m[1], body.challenge || {}) : a === "publish" ? challenges.publish(user, m[1])
          : a === "extend" ? challenges.extend(user, m[1], body.entryDeadline) : a === "cancel" ? challenges.cancel(user, m[1], body.note) : a === "settle" ? challenges.settle(user, m[1]) : null;
        if (!out) throw new HttpError(400, "Unknown action.");
        return send(res, 200, out, cookies);
      }
      if (method === "GET" && p === "/api/admin/rewards") return send(res, 200, rewards.adminCatalog(user), cookies);
      if (method === "POST" && p === "/api/admin/rewards") return send(res, 200, rewards.createReward(user, body), cookies);
      if (method === "POST" && (m = p.match(/^\/api\/admin\/rewards\/(\d+)$/))) return send(res, 200, rewards.updateReward(user, m[1], body), cookies);
      if (method === "GET" && p === "/api/admin/redemptions") return send(res, 200, { redemptions: rewards.requests(user, { status: q.get("status") || "" }) }, cookies);
      if (method === "POST" && (m = p.match(/^\/api\/admin\/redemptions\/(\d+)$/))) return send(res, 200, rewards.act(user, m[1], body), cookies);
      throw new HttpError(404, "Not found.");
    }

    const path = url.pathname.replace(/^\/api\/predictions/, "").replace(/\/+$/, "") || "/";
    if (method === "GET" && path === "/config") {
      const l = await league.get();
      return send(res, 200, { mode: league.mode, label: league.label || "", league: { ok: l.ok, error: l.error, fetchedAt: l.fetchedAt },
        startBalance: config.startBalance, minLeaderboard: config.minLeaderboard, user }, cookies);
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

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createServer } from "../server.js";
import { setup, ouInput, gwInput, HOUR, T0 } from "./helpers.js";

let s, server, base, csrf;
const start = async (cfg) => {
  const srv = createServer({ service: s.service, auth: s.auth, league: s.league, config: cfg, port: () => srv.address().port });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return srv;
};
before(async () => {
  // Every account here signs up from 127.0.0.1; the per-address sign-up limit has its own test in auth.test.js
  s = setup({ config: { limits: { signupMax: 100 } } });
  s.league = { mode: "live", label: "", get: async () => ({ ok: true, source: "live", fetchedAt: 0, error: null, view: null }) };
  server = await start(s.cfg);
  base = `http://127.0.0.1:${server.address().port}`;
  // Like the page: the first answer hands out the CSRF cookie, which then goes back as a header on every POST
  const r = await fetch(base + "/api/auth/session");
  csrf = r.headers.get("set-cookie").match(/uffp_csrf=([0-9a-f]{32})/)[1];
});
after(() => { server.closeAllConnections(); server.close(); });

const call = async (path, { method = "GET", body, session, headers = {}, noCsrf = false } = {}) => {
  const cookie = [noCsrf ? "" : `uffp_csrf=${csrf}`, session || ""].filter(Boolean).join("; ");
  const res = await fetch(base + path, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}),
    ...(method !== "GET" && !noCsrf ? { "x-csrf-token": csrf } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const type = res.headers.get("content-type") || "";
  const setCookie = res.headers.getSetCookie().find((c) => c.startsWith("uffp_session=")) || "";
  return { status: res.status, setCookie, session: setCookie.split(";")[0], data: type.includes("json") ? await res.json() : await res.text(), res };
};
const signup = async (username, pin = "48213") => (await call("/api/auth/signup", { method: "POST", body: { username, pin, confirmPin: pin } })).session;
const adminSession = async () => (await call("/api/auth/admin-login", { method: "POST", body: { username: "boss", password: "adminpass1234" } })).session;

test("guests can read every public thing without an account", async () => {
  await s.service.createMarket(s.admin, gwInput({ gameId: "T-3", closesAt: T0 + 5 * HOUR }));
  for (const p of ["/", "/index.html", "/app.js", "/styles.css", "/api/predictions/config", "/api/predictions/markets", "/api/predictions/markets/1",
    "/api/predictions/leaderboard", "/api/auth/session"]) {
    assert.equal((await call(p)).status, 200, p);
  }
  assert.equal((await call("/api/auth/session")).data.user, null);
});

test("guests are asked to sign in for anything that needs an account", async () => {
  assert.equal((await call("/api/predictions/me")).status, 401);
  assert.equal((await call("/api/account")).status, 401);
  assert.equal((await call("/api/predictions/markets/1/predict", { method: "POST", body: { selection: "a" } })).status, 401);
  assert.equal((await call("/api/predictions/me", { session: "uffp_session=" + "0".repeat(64) })).status, 401);
});

test("sign up: session cookie is HttpOnly + SameSite=Strict, no PIN comes back", async () => {
  const r = await call("/api/auth/signup", { method: "POST", body: { username: "httpuser", pin: "04213", confirmPin: "04213" } });
  assert.equal(r.status, 200);
  assert.match(r.setCookie, /HttpOnly; SameSite=Strict/);
  assert.doesNotMatch(r.setCookie, /Secure/); // plain http on this computer
  assert.equal(r.data.user.balance, 1000);
  assert.ok(!JSON.stringify(r.data).includes("04213"));
  const dup = await call("/api/auth/signup", { method: "POST", body: { username: "HTTPUSER", pin: "04213", confirmPin: "04213" } });
  assert.equal(dup.status, 409);
});

test("sign in, stay signed in across requests (a page reload), sign out ends it on the server", async () => {
  await signup("reloader", "07531");
  const bad = await call("/api/auth/login", { method: "POST", body: { username: "reloader", pin: "07532" } });
  const ghost = await call("/api/auth/login", { method: "POST", body: { username: "nobody_at_all", pin: "07532" } });
  assert.equal(bad.status, 401);
  assert.deepEqual(bad.data, ghost.data); // same answer either way
  const r = await call("/api/auth/login", { method: "POST", body: { username: "reloader", pin: "07531" } });
  assert.equal(r.status, 200);
  for (let i = 0; i < 3; i++) assert.equal((await call("/api/auth/session", { session: r.session })).data.user.username, "reloader");
  assert.equal((await call("/api/account", { session: r.session })).data.user.username, "reloader");
  const out = await call("/api/auth/logout", { method: "POST", body: {}, session: r.session });
  assert.match(out.setCookie, /Max-Age=0/);
  assert.equal((await call("/api/auth/session", { session: r.session })).data.user, null); // the old cookie is dead too
  assert.equal((await call("/api/account", { session: r.session })).status, 401);
});

test("a PIN sent as a number (which would lose leading zeroes) is refused", async () => {
  const r = await call("/api/auth/login", { method: "POST", body: { username: "reloader", pin: 7531 } });
  assert.equal(r.status, 400);
});

test("too many wrong PINs: 429, and the right PIN waits too", async () => {
  await signup("lockme", "27183");
  for (let i = 0; i < 5; i++) assert.equal((await call("/api/auth/login", { method: "POST", body: { username: "lockme", pin: "11223" } })).status, 401);
  const locked = await call("/api/auth/login", { method: "POST", body: { username: "lockme", pin: "27183" } });
  assert.equal(locked.status, 429);
  assert.match(locked.data.error, /Try again in/);
  // sent all at once, they still can't get past the lock
  const burst = await Promise.all(Array.from({ length: 10 }, () => call("/api/auth/login", { method: "POST", body: { username: "lockme", pin: "27183" } })));
  assert.ok(burst.every((b) => b.status === 429));
});

test("a pick goes through the API and your dashboard and account show only yours", async () => {
  const { id } = await s.service.createMarket(s.admin, gwInput({ closesAt: T0 + 5 * HOUR }));
  const alice = await signup("alice_h");
  const bob = await signup("bob_h");
  assert.equal((await call(`/api/predictions/markets/${id}/predict`, { method: "POST", body: { selection: "a" }, session: alice })).status, 200);
  const r = await call(`/api/predictions/markets/${id}/predict`, { method: "POST", body: { selection: "b" }, session: bob });
  assert.deepEqual(r.data.market.options.map((o) => o.pct), [50, 50]);
  assert.equal((await call(`/api/predictions/markets/${id}/predict`, { method: "POST", body: { selection: "b" }, session: alice })).status, 409);
  const me = (await call("/api/predictions/me", { session: bob })).data;
  assert.equal(me.user.username, "bob_h");
  assert.deepEqual(me.active.map((m) => m.mine.selection), ["b"]);
  assert.equal(me.user.balance, 950);
  const acct = (await call("/api/account", { session: bob })).data;
  assert.equal(acct.user.username, "bob_h");
  assert.equal(acct.picks.total, 1);
});

test("the client can't set its own balance, stake, result or role", async () => {
  const { id } = await s.service.createMarket(s.admin, ouInput({ closesAt: T0 + 5 * HOUR }));
  const r0 = await call("/api/auth/signup", { method: "POST", body: { username: "cheater", pin: "48213", confirmPin: "48213", isAdmin: true, balance: 99999 } });
  assert.equal(r0.data.user.isAdmin, false);
  assert.equal(r0.data.user.balance, 1000);
  await call(`/api/predictions/markets/${id}/predict`, { method: "POST", session: r0.session, body: { selection: "over", stake: 1, balance: 999999, result: "won" } });
  const me = (await call("/api/predictions/me", { session: r0.session })).data;
  assert.equal(me.user.balance, 950);
  assert.equal(me.active[0].mine.stake, 50);
  assert.equal(me.active[0].mine.result, "pending");
  assert.equal((await call("/api/predictions/admin/audit", { session: r0.session })).status, 403);
});

test("admin endpoints: 401 signed out, 403 for players, work for the admin; players can't use the admin sign-in", async () => {
  const u = await signup("plainuser");
  for (const [path, method] of [["/api/predictions/admin/audit", "GET"], ["/api/predictions/admin/games", "GET"], ["/api/predictions/admin/markets", "POST"], ["/api/predictions/admin/markets/1", "POST"]]) {
    const body = method === "POST" ? { action: "lock" } : undefined;
    assert.equal((await call(path, { method, body })).status, 401, path);
    assert.equal((await call(path, { method, body, session: u })).status, 403, path);
  }
  assert.equal((await call("/api/predictions/admin/audit", { session: await adminSession() })).status, 200);
  assert.equal((await call("/api/auth/admin-login", { method: "POST", body: { username: "plainuser", password: "48213" } })).status, 401);
});

test("admin can't make picks through the API", async () => {
  const { id } = await s.service.createMarket(s.admin, ouInput({ statKey: "pass_td", line: 3.5, closesAt: T0 + 5 * HOUR }));
  const r = await call(`/api/predictions/markets/${id}/predict`, { method: "POST", body: { selection: "over" }, session: await adminSession() });
  assert.equal(r.status, 403);
});

test("CSRF: a POST without the token, or with the wrong one, is refused", async () => {
  const u = await signup("csrfuser");
  assert.equal((await call("/api/auth/logout", { method: "POST", body: {}, session: u, noCsrf: true })).status, 403);
  assert.equal((await call("/api/auth/login", { method: "POST", body: { username: "csrfuser", pin: "48213" }, noCsrf: true })).status, 403);
  assert.equal((await call("/api/auth/logout", { method: "POST", body: {}, session: u, headers: { "x-csrf-token": "f".repeat(32) } })).status, 403);
  assert.equal((await call("/api/auth/session", { session: u })).data.user.username, "csrfuser"); // still signed in
});

test("requests from another site or another host name are turned away", async () => {
  const u = await signup("origintest");
  const cross = await call("/api/auth/logout", { method: "POST", body: {}, session: u, headers: { origin: "https://evil.example" } });
  assert.equal(cross.status, 403);
  // fetch won't send a made-up Host, so this one goes out by hand
  const rebound = await new Promise((resolve, reject) => http.get({ host: "127.0.0.1", port: server.address().port, path: "/api/auth/session",
    headers: { host: "evil.example" } }, (res) => { res.resume(); resolve(res.statusCode); }).on("error", reject));
  assert.equal(rebound, 421);
  const notJson = await fetch(base + "/api/auth/login", { method: "POST", headers: { "content-type": "text/plain", cookie: `uffp_csrf=${csrf}`, "x-csrf-token": csrf }, body: "{}" });
  assert.equal(notJson.status, 415);
});

test("with PRED_SECURE_COOKIES (HTTPS), session and CSRF cookies are Secure", async () => {
  const srv = await start({ ...s.cfg, secureCookies: true });
  try {
    const b = `http://127.0.0.1:${srv.address().port}`;
    const first = await fetch(b + "/api/auth/session");
    const token = first.headers.get("set-cookie").match(/uffp_csrf=([0-9a-f]{32})/)[1];
    assert.match(first.headers.get("set-cookie"), /Secure; SameSite=Strict/);
    const r = await fetch(b + "/api/auth/signup", { method: "POST", headers: { "content-type": "application/json", cookie: `uffp_csrf=${token}`, "x-csrf-token": token },
      body: JSON.stringify({ username: "secureuser", pin: "48213", confirmPin: "48213" }) });
    assert.equal(r.status, 200);
    assert.match(r.headers.getSetCookie().find((c) => c.startsWith("uffp_session=")), /HttpOnly; Secure; SameSite=Strict/);
  } finally {
    srv.closeAllConnections();
    srv.close();
  }
});

test("only the site's files are served: no database, source, git, pepper or secrets", async () => {
  assert.equal((await call("/logos/olympia-owls.png")).status, 200);
  for (const p of ["/.git/config", "/predictions/.local/predictions.db", "/predictions/.local/pepper.key", "/predictions/server.js", "/worker/src/index.js",
    "/package.json", "/logos/../package.json", "/%2e%2e/package.json", "/.claude/settings.local.json", "/node_modules/"]) {
    assert.equal((await call(p)).status, 404, p);
  }
});

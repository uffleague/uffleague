import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createServer } from "../server.js";
import { setup, ouInput, gwInput, HOUR, T0 } from "./helpers.js";

let s, server, base;
before(async () => {
  s = setup();
  const league = { mode: "live", label: "", get: async () => ({ ok: true, source: "live", fetchedAt: 0, error: null, view: null }) };
  server = createServer({ service: s.service, league, config: s.cfg, port: () => server.address().port });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const call = async (path, { method = "GET", body, cookie, headers = {} } = {}) => {
  const res = await fetch(base + path, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined });
  const type = res.headers.get("content-type") || "";
  return { status: res.status, cookie: (res.headers.get("set-cookie") || "").split(";")[0], data: type.includes("json") ? await res.json() : await res.text(), res };
};
const signup = async (username) => (await call("/api/predictions/auth/signup", { method: "POST", body: { username, password: "password123" } })).cookie;
const adminCookie = async () => (await call("/api/predictions/auth/login", { method: "POST", body: { username: "boss", password: "adminpass1" } })).cookie;

test("sign up sets an HttpOnly, SameSite=Strict session cookie", async () => {
  const r = await call("/api/predictions/auth/signup", { method: "POST", body: { username: "httpuser", password: "password123" } });
  assert.equal(r.status, 200);
  assert.match(r.res.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  assert.equal(r.data.user.balance, 1000);
  assert.ok(!JSON.stringify(r.data).includes("pass"));
});

test("a pick goes through the API and your dashboard shows only yours", async () => {
  const { id } = await s.service.createMarket(s.admin, gwInput({ gameId: "T-3", closesAt: T0 + 5 * HOUR }));
  const alice = await signup("alice_h");
  const bob = await signup("bob_h");
  assert.equal((await call(`/api/predictions/markets/${id}/predict`, { method: "POST", body: { selection: "a" }, cookie: alice })).status, 200);
  const r = await call(`/api/predictions/markets/${id}/predict`, { method: "POST", body: { selection: "b" }, cookie: bob });
  assert.equal(r.data.market.total, 2);
  assert.deepEqual(r.data.market.options.map((o) => o.pct), [50, 50]);
  const dup = await call(`/api/predictions/markets/${id}/predict`, { method: "POST", body: { selection: "b" }, cookie: alice });
  assert.equal(dup.status, 409);
  const me = (await call("/api/predictions/me", { cookie: bob })).data;
  assert.equal(me.user.username, "bob_h");
  assert.deepEqual(me.active.map((m) => m.mine.selection), ["b"]);
  assert.equal(me.user.balance, 950);
});

test("the client can't set its own balance, stake or result", async () => {
  const { id } = await s.service.createMarket(s.admin, ouInput({ closesAt: T0 + 5 * HOUR }));
  const c = await signup("cheater");
  const r = await call(`/api/predictions/markets/${id}/predict`, { method: "POST", cookie: c,
    body: { selection: "over", stake: 1, balance: 999999, result: "won", userId: 1 } });
  assert.equal(r.status, 200);
  const me = (await call("/api/predictions/me", { cookie: c })).data;
  assert.equal(me.user.balance, 950);
  assert.equal(me.active[0].mine.stake, 50);
  assert.equal(me.active[0].mine.result, "pending");
});

test("signed out: no dashboard and no picks", async () => {
  assert.equal((await call("/api/predictions/me")).status, 401);
  assert.equal((await call("/api/predictions/markets/1/predict", { method: "POST", body: { selection: "a" } })).status, 401);
  assert.equal((await call("/api/predictions/me", { cookie: "uffp_session=" + "0".repeat(64) })).status, 401);
});

test("admin endpoints: 401 signed out, 403 for ordinary users, work for admins", async () => {
  const u = await signup("plainuser");
  for (const [path, method] of [["/api/predictions/admin/audit", "GET"], ["/api/predictions/admin/games", "GET"], ["/api/predictions/admin/markets", "POST"], ["/api/predictions/admin/markets/1", "POST"]]) {
    const body = method === "POST" ? { action: "lock" } : undefined;
    assert.equal((await call(path, { method, body })).status, 401, path);
    assert.equal((await call(path, { method, body, cookie: u })).status, 403, path);
  }
  const a = await adminCookie();
  assert.equal((await call("/api/predictions/admin/audit", { cookie: a })).status, 200);
});

test("admin can't make picks through the API", async () => {
  const { id } = await s.service.createMarket(s.admin, ouInput({ statKey: "pass_td", line: 3.5, closesAt: T0 + 5 * HOUR }));
  const r = await call(`/api/predictions/markets/${id}/predict`, { method: "POST", body: { selection: "over" }, cookie: await adminCookie() });
  assert.equal(r.status, 403);
});

test("requests from another site or another host name are turned away", async () => {
  const u = await signup("origintest");
  const cross = await call("/api/predictions/auth/logout", { method: "POST", body: {}, cookie: u, headers: { origin: "https://evil.example" } });
  assert.equal(cross.status, 403);
  // fetch won't send a made-up Host, so this one goes out by hand
  const rebound = await new Promise((resolve, reject) => http.get({ host: "127.0.0.1", port: server.address().port, path: "/api/predictions/config",
    headers: { host: "evil.example" } }, (res) => { res.resume(); resolve(res.statusCode); }).on("error", reject));
  assert.equal(rebound, 421);
  const notJson = await fetch(base + "/api/predictions/auth/login", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" });
  assert.equal(notJson.status, 415);
});

test("only the site's files are served: no database, source, git or secrets", async () => {
  assert.equal((await call("/")).status, 200);
  assert.equal((await call("/app.js")).status, 200);
  assert.equal((await call("/logos/olympia-owls.png")).status, 200);
  for (const p of ["/.git/config", "/predictions/.local/predictions.db", "/predictions/server.js", "/worker/src/index.js", "/package.json",
    "/logos/../package.json", "/%2e%2e/package.json", "/.claude/settings.local.json", "/node_modules/"]) {
    assert.equal((await call(p)).status, 404, p);
  }
});

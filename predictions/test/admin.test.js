import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup } from "./helpers.js";

const status = (fn, code, re) => assert.throws(fn, (e) => e.status === code && (!re || re.test(e.message)));
const acct = (s, name) => s.db.prepare("SELECT account_id FROM users WHERE username = ?").get(name).account_id;
test("lookup: search by username (prefix, exact first), detail with ledger, challenge results and pending redemptions", () => {
  const s = setup();
  const t = s.adminTools;
  ["biglester1", "biglester2", "big_lester", "other"].forEach((n) => s.user(n));
  assert.deepEqual(t.search(s.admin, "biglester1").map((u) => u.username), ["biglester1"]);
  assert.deepEqual(t.search(s.admin, "big").map((u) => u.username), ["big_lester", "biglester1", "biglester2"]);
  assert.deepEqual(t.search(s.admin, "big_").map((u) => u.username), ["big_lester"]); // _ is a letter here, not a wildcard
  assert.deepEqual(t.search(s.admin, "BIGLESTER2").map((u) => u.username), ["biglester2"]);
  status(() => t.search(s.admin, "a%"), 400);
  const d = t.detail(s.admin, acct(s, "biglester1"));
  assert.equal(d.user.username, "biglester1");
  assert.match(d.user.accountId, /^[0-9a-f-]{36}$/);
  assert.equal(d.user.balance, 1000);
  assert.equal(d.ledger[0].kind, "grant");
  assert.deepEqual(d.challenges, []);
  assert.deepEqual(d.redemptions, []);
  status(() => t.detail(s.admin, "00000000-0000-4000-8000-000000000000"), 404);
});

test("credits: add, remove and set, each with a reason, recorded with actor, before and after", () => {
  const s = setup();
  const t = s.adminTools;
  s.user("fan_one");
  const add = t.adjust(s.admin, { accountId: acct(s, "fan_one"), username: "fan_one", type: "add", amount: 250, reasonCode: "event", note: "Watch party", idempotencyKey: randomUUID() });
  assert.deepEqual([add.tx.before, add.tx.after], [1000, 1250]);
  const rem = t.adjust(s.admin, { accountId: acct(s, "fan_one"), username: "fan_one", type: "remove", amount: 50, reasonCode: "correction", note: "Double award fixed", idempotencyKey: randomUUID() });
  assert.equal(rem.tx.after, 1200);
  status(() => t.adjust(s.admin, { accountId: acct(s, "fan_one"), username: "fan_one", type: "set", target: 500, reasonCode: "correction", note: "Reset", idempotencyKey: randomUUID() }), 400, /confirmed/);
  const set = t.adjust(s.admin, { accountId: acct(s, "fan_one"), username: "fan_one", type: "set", target: 500, reasonCode: "correction", note: "Reset to agreed amount", confirmSet: true, idempotencyKey: randomUUID() });
  assert.deepEqual([set.tx.before, set.tx.after, set.tx.delta], [1200, 500, -700]);
  const rows = s.db.prepare("SELECT * FROM ledger WHERE user_id = (SELECT id FROM users WHERE username = 'fan_one') ORDER BY id").all();
  assert.deepEqual(rows.map((r) => r.kind), ["grant", "admin_credit", "admin_debit", "admin_set"]);
  assert.ok(rows.slice(1).every((r) => r.actor_id === s.admin.id && /: /.test(r.note) && r.balance_after === r.balance_before + r.delta));
  const log = s.audit.list({ action: "credits." }).rows;
  assert.deepEqual(log.map((r) => r.action), ["credits.set", "credits.remove", "credits.add"]);
  assert.deepEqual([log[0].detail.before.balance, log[0].detail.after.balance, log[0].by], [1200, 500, "boss"]);
  assert.deepEqual(s.ledger.mismatches(), []);
});

test("credits: bad amounts, below zero, no change, wrong username and reasons are refused", () => {
  const s = setup();
  const t = s.adminTools;
  s.user("fan_two");
  const base = { accountId: acct(s, "fan_two"), username: "fan_two", reasonCode: "event", note: "Some reason" };
  status(() => t.adjust(s.admin, { ...base, type: "add", amount: -5, idempotencyKey: randomUUID() }), 400);
  status(() => t.adjust(s.admin, { ...base, type: "add", amount: 1.5, idempotencyKey: randomUUID() }), 400);
  status(() => t.adjust(s.admin, { ...base, type: "add", amount: 1000000, idempotencyKey: randomUUID() }), 400);
  status(() => t.adjust(s.admin, { ...base, type: "remove", amount: 1001, idempotencyKey: randomUUID() }), 400, /at most/);
  status(() => t.adjust(s.admin, { ...base, type: "set", target: -1, confirmSet: true, idempotencyKey: randomUUID() }), 400);
  status(() => t.adjust(s.admin, { ...base, type: "set", target: 1000, confirmSet: true, idempotencyKey: randomUUID() }), 409, /already has/);
  status(() => t.adjust(s.admin, { ...base, username: "fan_three", type: "add", amount: 5, idempotencyKey: randomUUID() }), 409, /doesn't match/);
  status(() => t.adjust(s.admin, { ...base, note: "", type: "add", amount: 5, idempotencyKey: randomUUID() }), 400);
  status(() => t.adjust(s.admin, { ...base, reasonCode: "because", type: "add", amount: 5, idempotencyKey: randomUUID() }), 400);
  status(() => t.adjust(s.admin, { ...base, type: "add", amount: 5 }), 400, /request id/);
  assert.equal(s.balance(s.db.prepare("SELECT id FROM users WHERE username = 'fan_two'").get().id), 1000);
});

test("credits: a retried request (same id) happens once; many different ones at once all land exactly", async () => {
  const s = setup();
  const t = s.adminTools;
  const u = s.user("fan_four");
  const k = randomUUID();
  const req = { accountId: acct(s, "fan_four"), username: "fan_four", type: "add", amount: 10, reasonCode: "award", note: "Community award", idempotencyKey: k };
  t.adjust(s.admin, req);
  assert.equal(t.adjust(s.admin, req).repeated, true);
  assert.equal(s.balance(u.id), 1010);
  await Promise.all(Array.from({ length: 20 }, (_, i) => Promise.resolve().then(() =>
    t.adjust(s.admin, { ...req, amount: i + 1, idempotencyKey: randomUUID() }))).map((p) => p.catch((e) => e)));
  // 20 adjustments of 1..20 (210) on top, minus any the 30-per-minute limit stopped (none here)
  assert.equal(s.balance(u.id), 1010 + 210);
  assert.deepEqual(s.ledger.mismatches(), []);
});

test("credits: only admins with unlocked tools; staff and players can't", () => {
  const s = setup();
  const t = s.adminTools;
  s.user("fan_five");
  const staff = s.signedIn("helper", "13570", "staff").user;
  const req = { accountId: acct(s, "fan_five"), username: "fan_five", type: "add", amount: 10, reasonCode: "event", note: "Something", idempotencyKey: randomUUID() };
  status(() => t.adjust(staff, req), 403);
  status(() => t.adjust(s.user("sneaky"), req), 403);
  status(() => t.adjust(null, req), 401);
  status(() => t.adjust({ ...s.admin, elevated: false }, req), 401, /Unlock/);
  status(() => t.search(staff, "fan"), 403);
});

test("roles: a Super Admin grants and revokes; recorded with who and when; less access locks admin tools at once", () => {
  const s = setup();
  const t = s.adminTools;
  s.user("rising");
  const r = t.setRole(s.admin, { accountId: acct(s, "rising"), username: "rising", role: "staff", reason: "Helps run challenges" });
  assert.equal(r.user.role, "staff");
  assert.equal(r.user.roleGrantedBy, "boss");
  assert.equal(r.needsAdminPassword, true);
  s.auth.setAdminPassword("rising", "adminpass1234");
  const { token } = s.auth.signIn({ username: "rising", pin: "13579", ip: "x" });
  s.auth.elevate({ token, user: s.auth.sessionUser(token), password: "adminpass1234", ip: "x" });
  assert.equal(s.auth.sessionUser(token).elevated, true);
  t.setRole(s.admin, { accountId: acct(s, "rising"), username: "rising", role: "user", reason: "Season over" });
  assert.equal(s.auth.sessionUser(token).elevated, false);
  assert.equal(s.auth.sessionUser(token).role, "user");
  const log = s.audit.list({ targetId: acct(s, "rising") }).rows.filter((x) => x.action.startsWith("role."));
  assert.deepEqual(log.map((x) => [x.action, x.detail.before.role, x.detail.after.role, x.by]), [["role.revoke", "staff", "user", "boss"], ["role.grant", "user", "staff", "boss"]]);
  assert.deepEqual(t.staffList(s.admin).map((u) => u.username), ["boss"]);
});

test("roles: nobody changes their own role; admins and staff can't grant; only verified, active accounts", () => {
  const s = setup();
  const t = s.adminTools;
  const admin2 = s.signedIn("deputy", "13570", "admin").user;
  const staff = s.signedIn("helper", "13572", "staff").user;
  s.user("someone");
  const target = (name, role) => ({ accountId: acct(s, name), username: name, role, reason: "Because" });
  status(() => t.setRole(s.admin, target("boss", "admin")), 403, /own role/);
  status(() => t.setRole(admin2, target("someone", "staff")), 403);
  status(() => t.setRole(staff, target("helper", "super_admin")), 403); // staff can't promote themselves
  status(() => t.setRole(s.admin, { ...target("someone", "staff"), reason: "" }), 400);
  status(() => t.setRole(s.admin, target("someone", "emperor")), 400);
  s.db.prepare("INSERT INTO users (username, pass_hash, pass_salt, balance, created_at, account_id, credential) VALUES ('ghostly', 'x', '', 0, 0, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'pin')").run();
  status(() => t.setRole(s.admin, target("ghostly", "staff")), 409, /hasn't been set up/);
  t.setStatus(s.admin, { accountId: acct(s, "someone"), username: "someone", status: "suspended", reason: "Spam" });
  status(() => t.setRole(s.admin, target("someone", "staff")), 409, /suspended/);
});

test("suspending: signs them out, blocks sign-in and redemptions; only for accounts with less access; reactivating works", () => {
  const s = setup();
  const t = s.adminTools;
  const admin2 = s.signedIn("deputy", "13570", "admin").user;
  const { token } = s.auth.createAccount({ username: "rowdy", pin: "48213", confirmPin: "48213", ip: "r" });
  t.setStatus(admin2, { accountId: acct(s, "rowdy"), username: "rowdy", status: "suspended", reason: "Abuse" });
  assert.equal(s.auth.sessionUser(token), null);
  status(() => s.auth.signIn({ username: "rowdy", pin: "48213", ip: "r" }), 403);
  status(() => t.setStatus(admin2, { accountId: acct(s, "boss"), username: "boss", status: "suspended", reason: "Coup" }), 403, /less access/);
  status(() => t.setStatus(admin2, { accountId: acct(s, "deputy"), username: "deputy", status: "suspended", reason: "Oops" }), 403);
  t.setStatus(admin2, { accountId: acct(s, "rowdy"), username: "rowdy", status: "active", reason: "Appeal accepted" });
  assert.ok(s.auth.signIn({ username: "rowdy", pin: "48213", ip: "r" }).token);
});

test("audit log: admins read it, filters work, nobody can edit or delete it, and it never holds secrets", () => {
  const s = setup();
  const t = s.adminTools;
  s.user("fan_six");
  t.adjust(s.admin, { accountId: acct(s, "fan_six"), username: "fan_six", type: "add", amount: 5, reasonCode: "test", note: "Local test", idempotencyKey: randomUUID() });
  const all = t.auditLog(s.admin, {});
  assert.ok(all.rows.length >= 3);
  assert.deepEqual(t.auditLog(s.admin, { action: "credits." }).rows.map((r) => r.action), ["credits.add"]);
  assert.ok(t.auditLog(s.admin, { actor: "boss" }).rows.every((r) => r.by === "boss"));
  status(() => t.auditLog(s.user("curious"), {}), 403);
  status(() => t.auditLog(s.signedIn("helper", "13570", "staff").user, {}), 403);
  assert.throws(() => s.db.prepare("UPDATE audit SET action = 'nothing'").run(), /never changed/);
  assert.throws(() => s.db.prepare("DELETE FROM audit").run(), /never deleted/);
  assert.throws(() => s.db.prepare("DELETE FROM ledger").run(), /never deleted/);
  assert.ok(!/adminpass1234|86420|13579/.test(JSON.stringify(t.auditLog(s.admin, { limit: 200 }).rows)));
});

test("overview: counts for staff, point totals and ledger check only for credit admins", () => {
  const s = setup();
  const t = s.adminTools;
  s.user("fan_seven");
  const staff = s.signedIn("helper", "13570", "staff").user;
  const o = t.overview(s.admin);
  assert.equal(o.users.total, 3);
  assert.equal(o.points.mismatches, 0);
  assert.equal(t.overview(staff).points, null);
  status(() => t.overview(s.user("nobody_much")), 403);
});

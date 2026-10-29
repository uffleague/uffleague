import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup } from "./helpers.js";

const status = (fn, code, re) => assert.throws(fn, (e) => e.status === code && (!re || re.test(e.message)));
const reward = (over = {}) => ({ name: "Sharpshooter badge", description: "For sharp predictors.", category: "badge", icon: "awards", cost: 300,
  requiresApproval: true, enabled: true, ...over });
const key = () => randomUUID();

function shop(over = {}) {
  const s = setup();
  const { id } = s.rewards.createReward(s.admin, reward(over));
  return { s, id };
}

test("catalog: public, enabled rewards only, with cost, stock and approval shown", () => {
  const { s, id } = shop({ inventory: 3 });
  s.rewards.createReward(s.admin, reward({ name: "Hidden title", category: "title", enabled: false }));
  const c = s.rewards.catalog(null);
  assert.deepEqual(c.rewards.map((r) => r.id), [id]);
  assert.deepEqual([c.rewards[0].cost, c.rewards[0].left, c.rewards[0].requiresApproval, c.rewards[0].categoryLabel], [300, 3, true, "Profile badge"]);
  assert.match(c.policy.join(" "), /no cash value/);
  assert.equal(s.rewards.adminCatalog(s.admin).rewards.length, 2);
});

test("redeeming takes the points once; the same request again (refresh, double click) changes nothing", () => {
  const { s, id } = shop();
  const a = s.user("alice");
  const k = key();
  const first = s.rewards.redeem(a, { rewardId: id, idempotencyKey: k });
  assert.equal(first.redemption.status, "pending");
  for (let i = 0; i < 5; i++) assert.equal(s.rewards.redeem(a, { rewardId: id, idempotencyKey: k }).repeated, true);
  assert.equal(s.balance(a.id), 700);
  assert.equal(s.db.prepare("SELECT COUNT(*) AS n FROM redemptions").get().n, 1);
  assert.equal(s.db.prepare("SELECT COUNT(*) AS n FROM ledger WHERE kind = 'redeem'").get().n, 1);
  s.rewards.redeem(a, { rewardId: id, idempotencyKey: key() }); // a new request is a second redemption
  assert.equal(s.balance(a.id), 400);
  assert.deepEqual(s.ledger.mismatches(), []);
});

test("redeeming needs enough points, an enabled reward in stock, the per-person limit, an account and a request id", () => {
  const { s, id } = shop({ inventory: 1, perUserLimit: 1, cost: 600 });
  const [a, b] = ["alice", "bob"].map(s.user);
  status(() => s.rewards.redeem(null, { rewardId: id, idempotencyKey: key() }), 401);
  status(() => s.rewards.redeem(a, { rewardId: id }), 400, /request id/);
  status(() => s.rewards.redeem(s.admin, { rewardId: id, idempotencyKey: key() }), 403);
  s.rewards.redeem(a, { rewardId: id, idempotencyKey: key() });
  status(() => s.rewards.redeem(a, { rewardId: id, idempotencyKey: key() }), 409, /out of stock/);
  status(() => s.rewards.redeem(b, { rewardId: id, idempotencyKey: key() }), 409, /out of stock/);
  const pricey = s.rewards.createReward(s.admin, reward({ name: "Gold trim", cost: 5000 })).id;
  status(() => s.rewards.redeem(b, { rewardId: pricey, idempotencyKey: key() }), 409, /needs 5,000 points and you have 1,000/);
  assert.equal(s.balance(b.id), 1000);
  const off = s.rewards.createReward(s.admin, reward({ name: "Disabled", enabled: false })).id;
  status(() => s.rewards.redeem(b, { rewardId: off, idempotencyKey: key() }), 409, /isn't available/);
  const limited = s.rewards.createReward(s.admin, reward({ name: "One each", perUserLimit: 1 })).id;
  s.rewards.redeem(b, { rewardId: limited, idempotencyKey: key() });
  status(() => s.rewards.redeem(b, { rewardId: limited, idempotencyKey: key() }), 409, /at most/);
});

test("staff: approve, then fulfill once; fulfilling again or out of order changes nothing", () => {
  const { s, id } = shop();
  const a = s.user("alice");
  const staff = s.signedIn("helper", "13570", "staff").user;
  const r = s.rewards.redeem(a, { rewardId: id, idempotencyKey: key() }).redemption;
  status(() => s.rewards.act(staff, r.id, { action: "fulfill" }), 409, /Approve the request/);
  s.rewards.act(staff, r.id, { action: "approve", note: "Looks good" });
  assert.equal(s.rewards.act(staff, r.id, { action: "approve" }).already, true);
  s.rewards.act(staff, r.id, { action: "fulfill", note: "Badge added in game" });
  assert.equal(s.rewards.act(staff, r.id, { action: "fulfill", note: "again" }).already, true);
  const mine = s.rewards.mine(a)[0];
  assert.deepEqual([mine.status, mine.decision.by, mine.fulfillment.note], ["fulfilled", "helper", "Badge added in game"]);
  assert.equal(s.balance(a.id), 700);
  status(() => s.rewards.act(staff, r.id, { action: "refund", note: "x" }), 403); // staff can't refund
  status(() => s.rewards.act(s.user("nosy"), r.id, { action: "approve" }), 403);
});

test("rejecting needs a reason and returns the points exactly once", () => {
  const { s, id } = shop();
  const a = s.user("alice");
  const r = s.rewards.redeem(a, { rewardId: id, idempotencyKey: key() }).redemption;
  status(() => s.rewards.act(s.admin, r.id, { action: "reject" }), 400, /why/);
  s.rewards.act(s.admin, r.id, { action: "reject", note: "Not eligible this season" });
  assert.equal(s.rewards.act(s.admin, r.id, { action: "reject", note: "again" }).already, true);
  assert.equal(s.balance(a.id), 1000);
  assert.equal(s.db.prepare("SELECT COUNT(*) AS n FROM ledger WHERE kind = 'redeem_refund'").get().n, 1);
  status(() => s.rewards.act(s.admin, r.id, { action: "approve" }), 409);
  assert.equal(s.rewards.mine(a)[0].decision.note, "Not eligible this season");
});

test("you can cancel your own pending request (points back once), not someone else's", () => {
  const { s, id } = shop();
  const [a, b] = ["alice", "bob"].map(s.user);
  const r = s.rewards.redeem(a, { rewardId: id, idempotencyKey: key() }).redemption;
  status(() => s.rewards.cancelOwn(b, r.id), 404); // not even confirmed to exist
  s.rewards.cancelOwn(a, r.id);
  assert.equal(s.rewards.cancelOwn(a, r.id).already, true);
  assert.equal(s.balance(a.id), 1000);
  const r2 = s.rewards.redeem(a, { rewardId: id, idempotencyKey: key() }).redemption;
  s.rewards.act(s.admin, r2.id, { action: "approve" });
  status(() => s.rewards.cancelOwn(a, r2.id), 409, /pending/);
});

test("admin refunds: approved or fulfilled only, need a reason, once", () => {
  const { s, id } = shop();
  const a = s.user("alice");
  const r = s.rewards.redeem(a, { rewardId: id, idempotencyKey: key() }).redemption;
  status(() => s.rewards.act(s.admin, r.id, { action: "refund", note: "x y z" }), 409, /Reject a pending/);
  s.rewards.act(s.admin, r.id, { action: "approve" });
  s.rewards.act(s.admin, r.id, { action: "fulfill" });
  status(() => s.rewards.act(s.admin, r.id, { action: "refund", note: "" }), 400);
  s.rewards.act(s.admin, r.id, { action: "refund", note: "Item removed from the game" });
  assert.equal(s.rewards.act(s.admin, r.id, { action: "refund", note: "again" }).already, true);
  assert.equal(s.balance(a.id), 1000);
  const actions = s.audit.list({ action: "redemption." }).rows.map((x) => x.action);
  assert.deepEqual(actions, ["redemption.refund", "redemption.fulfill", "redemption.approve", "redemption.request"]);
});

test("rewards without approval go straight to approved (still fulfilled by hand)", () => {
  const { s, id } = shop({ requiresApproval: false });
  const r = s.rewards.redeem(s.user("alice"), { rewardId: id, idempotencyKey: key() }).redemption;
  assert.equal(r.status, "approved");
});

test("staff can't review their own request", () => {
  const { s, id } = shop();
  const r = s.rewards.redeem(s.user("future_staff"), { rewardId: id, idempotencyKey: key() }).redemption;
  s.db.prepare("UPDATE users SET role = 'staff' WHERE username = 'future_staff'").run();
  const { token } = s.auth.signIn({ username: "future_staff", pin: "13579", ip: "x" });
  s.auth.elevate({ token, user: s.auth.sessionUser(token), pin: "13579", ip: "x" });
  status(() => s.rewards.act(s.auth.sessionUser(token), r.id, { action: "approve" }), 403, /own request/);
});

test("reward admin: validated fields, safe pictures only, stock can't drop below what's taken, audited", () => {
  const { s, id } = shop({ inventory: 5 });
  status(() => s.rewards.createReward(s.user("player"), reward()), 403);
  status(() => s.rewards.createReward(s.admin, reward({ cost: 0 })), 400);
  status(() => s.rewards.createReward(s.admin, reward({ category: "cash" })), 400);
  status(() => s.rewards.createReward(s.admin, reward({ image: "javascript:alert(1)" })), 400);
  status(() => s.rewards.createReward(s.admin, reward({ image: "http://insecure.example/x.png" })), 400);
  assert.ok(s.rewards.createReward(s.admin, reward({ name: "Pictured", image: "gfx/badge.png" })).id);
  s.rewards.redeem(s.user("buyer1"), { rewardId: id, idempotencyKey: key() });
  s.rewards.redeem(s.user("buyer2"), { rewardId: id, idempotencyKey: key() });
  status(() => s.rewards.updateReward(s.admin, id, reward({ inventory: 1 })), 400, /can't go below/);
  s.rewards.updateReward(s.admin, id, reward({ cost: 350, inventory: 2 }));
  const edit = s.audit.list({ action: "reward.edit" }).rows[0];
  assert.deepEqual([edit.detail.before.cost, edit.detail.after.cost], [300, 350]);
  // A price change doesn't touch requests already made
  assert.ok(s.db.prepare("SELECT cost FROM redemptions").all().every((r) => r.cost === 300));
});

test("your redemptions are yours: nobody else's show", () => {
  const { s, id } = shop();
  const [a, b] = ["alice", "bob"].map(s.user);
  s.rewards.redeem(a, { rewardId: id, idempotencyKey: key() });
  assert.equal(s.rewards.mine(b).length, 0);
  assert.equal(s.rewards.mine(a).length, 1);
  status(() => s.rewards.mine(null), 401);
  status(() => s.rewards.requests(a), 403);
});

test("demo rewards: only seeded into an empty shop, clearly labeled", () => {
  const s = setup();
  assert.equal(s.rewards.seedDemo(), 4);
  assert.equal(s.rewards.seedDemo(), 0);
  assert.ok(s.rewards.catalog(null).rewards.every((r) => r.demo && /Demo reward/.test(r.description)));
});

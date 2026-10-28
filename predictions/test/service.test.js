import { test } from "node:test";
import assert from "node:assert/strict";
import { setup, ouInput, gwInput, HOUR, T0 } from "./helpers.js";

const rejects = (p, status, re) => assert.rejects(Promise.resolve().then(p), (e) => e.status === status && (!re || re.test(e.message)));
const box = (passYds, who = "biglester1") => [{}, { passing: [{ player: who, yds: passYds, td: 3, int: 1 }] }];

test("new accounts start with the configured virtual points, recorded in the ledger", () => {
  const s = setup({ config: { startBalance: 750 } });
  const u = s.user("alice");
  assert.equal(u.balance, 750);
  assert.equal(s.ledgerSum(u.id), 750);
  assert.equal(s.admin.balance, 0);
});

test("game winner: picks, community percent, settlement from the official final", async () => {
  const s = setup();
  const { id } = await s.service.createMarket(s.admin, gwInput());
  const [a, b, c] = ["alice", "bob", "cara"].map(s.user);
  s.service.predict(a, id, "a");
  s.service.predict(b, id, "a");
  s.service.predict(c, id, "b");
  const { market } = await s.service.getMarket(id, a.id);
  assert.deepEqual(market.options.map((o) => [o.label, o.count, o.pct]), [["Olympia Owls", 2, 67], ["Costa Rica Pumas", 1, 33]]);
  assert.equal(market.total, 3);
  assert.equal(market.history.length, 3);
  assert.equal(market.mine.selection, "a");
  assert.equal(s.balance(a.id), 950);

  s.clock.t = T0 + 9 * HOUR; // closed
  s.post("T-1", [35, 28]);
  const r = await s.service.resolve(s.admin, id);
  assert.equal(r.outcome, "a");
  assert.equal(s.balance(a.id), 1050);
  assert.equal(s.balance(c.id), 950);
  [a, b, c].forEach((u) => assert.equal(s.balance(u.id), s.ledgerSum(u.id)));
  const after = (await s.service.getMarket(id, c.id)).market;
  assert.equal(after.status, "resolved");
  assert.deepEqual(after.resolution.score, [35, 28]);
  assert.equal(after.mine.result, "lost");
});

test("over/under settles from the box score; exactly on the line is a push with points back", async () => {
  const s = setup();
  const { id } = await s.service.createMarket(s.admin, ouInput());
  const [a, b] = ["alice", "bob"].map(s.user);
  s.service.predict(a, id, "over");
  s.service.predict(b, id, "under");
  s.clock.t = T0 + 9 * HOUR;
  s.post("T-2", [30, 24], box(500));
  const r = await s.service.resolve(s.admin, id);
  assert.equal(r.outcome, "push");
  assert.equal(s.balance(a.id), 1000);
  assert.equal(s.balance(b.id), 1000);
  const me = await s.service.dashboard(a);
  assert.equal(me.record.push, 1);
  assert.equal(me.record.accuracy, null); // a push doesn't count
});

test("over/under: over wins above the line, and old names in the box score still count", async () => {
  const s = setup();
  const { id } = await s.service.createMarket(s.admin, ouInput());
  const a = s.user("alice");
  s.service.predict(a, id, "over");
  s.clock.t = T0 + 9 * HOUR;
  s.post("T-2", [30, 24], box(501, "BIGGIECHEESE")); // data.js alias for biglester1
  assert.equal((await s.service.resolve(s.admin, id)).outcome, "over");
  assert.equal(s.balance(a.id), 1050);
});

test("a player missing from the box score voids the market and refunds everyone", async () => {
  const s = setup();
  const { id } = await s.service.createMarket(s.admin, ouInput());
  const a = s.user("alice");
  s.service.predict(a, id, "under");
  s.clock.t = T0 + 9 * HOUR;
  s.post("T-2", [30, 24], box(300, "somebodyelse"));
  assert.equal((await s.service.resolve(s.admin, id)).status, "void");
  assert.equal(s.balance(a.id), 1000);
  assert.equal((await s.service.getMarket(id, a.id)).market.mine.result, "void");
});

test("zero picks: no percents, no division by zero, and settling is fine", async () => {
  const s = setup();
  const { id } = await s.service.createMarket(s.admin, gwInput());
  const { market } = await s.service.getMarket(id);
  assert.equal(market.total, 0);
  assert.deepEqual(market.options.map((o) => o.pct), [null, null]);
  s.clock.t = T0 + 9 * HOUR;
  s.post("T-1", [7, 14]);
  assert.equal((await s.service.resolve(s.admin, id)).outcome, "b");
});

test("picks close at the closing time, when locked, and before opening", async () => {
  const s = setup();
  const a = s.user("alice");
  const { id } = await s.service.createMarket(s.admin, gwInput());
  s.clock.t = T0 + 9 * HOUR;
  await rejects(() => s.service.predict(a, id, "a"), 409, /closed/);

  s.clock.t = T0;
  const m2 = await s.service.createMarket(s.admin, ouInput());
  s.service.setState(s.admin, m2.id, "lock");
  await rejects(() => s.service.predict(a, m2.id, "over"), 409, /closed/);

  const m3 = await s.service.createMarket(s.admin, ouInput({ line: 400.5, opensAt: T0 + HOUR }));
  await rejects(() => s.service.predict(a, m3.id, "over"), 409, /isn't open/);
  s.clock.t = T0 + 2 * HOUR;
  s.service.predict(a, m3.id, "over");
  assert.equal(s.balance(a.id), 950);
});

test("one pick per market: a second or conflicting pick is turned away and costs nothing", async () => {
  const s = setup();
  const a = s.user("alice");
  const { id } = await s.service.createMarket(s.admin, gwInput());
  s.service.predict(a, id, "a");
  await rejects(() => s.service.predict(a, id, "b"), 409, /already/);
  await rejects(() => s.service.predict(a, id, "a"), 409, /already/);
  assert.equal(s.balance(a.id), 950);
  assert.equal((await s.service.getMarket(id)).market.total, 1);
});

test("bad choices, signed-out users and admins can't pick", async () => {
  const s = setup();
  const a = s.user("alice");
  const { id } = await s.service.createMarket(s.admin, gwInput());
  await rejects(() => s.service.predict(a, id, "over"), 400);
  await rejects(() => s.service.predict(null, id, "a"), 401);
  await rejects(() => s.service.predict(s.admin, id, "a"), 403);
  await rejects(() => s.service.predict(a, 9999, "a"), 404);
});

test("not enough virtual points: the pick is refused and the balance never goes below 0", async () => {
  const s = setup({ config: { startBalance: 60 } });
  const a = s.user("alice");
  const m1 = await s.service.createMarket(s.admin, gwInput());
  const m2 = await s.service.createMarket(s.admin, ouInput());
  s.service.predict(a, m1.id, "a");
  await rejects(() => s.service.predict(a, m2.id, "over"), 400, /50 virtual points and you have 10/);
  assert.equal(s.balance(a.id), 10);
});

test("settling is idempotent: a retry pays nothing twice", async () => {
  const s = setup();
  const a = s.user("alice");
  const { id } = await s.service.createMarket(s.admin, gwInput());
  s.service.predict(a, id, "a");
  s.clock.t = T0 + 9 * HOUR;
  s.post("T-1", [21, 14]);
  await s.service.resolve(s.admin, id);
  const again = await s.service.resolve(s.admin, id);
  assert.equal(again.already, true);
  const manual = await s.service.resolve(s.admin, id, { mode: "manual", scoreA: 0, scoreB: 50, note: "retry by hand" });
  assert.equal(manual.already, true);
  assert.equal(s.balance(a.id), 1050);
  assert.equal(s.db.prepare("SELECT COUNT(*) AS n FROM ledger WHERE kind = 'payout'").get().n, 1);
  assert.equal(s.db.prepare("SELECT COUNT(*) AS n FROM resolutions WHERE market_id = ?").get(id).n, 1);
});

test("the ledger refuses a second payout for the same pick and round, even bypassing the service", async () => {
  const s = setup();
  const a = s.user("alice");
  const { id } = await s.service.createMarket(s.admin, gwInput());
  const { predictionId } = s.service.predict(a, id, "a");
  const ins = s.db.prepare("INSERT INTO ledger (user_id, at, delta, balance_after, kind, prediction_id, round) VALUES (?, 0, 100, 0, 'payout', ?, 1)");
  ins.run(a.id, predictionId);
  assert.throws(() => ins.run(a.id, predictionId), /UNIQUE/);
});

test("can't settle while picks are open, or without a final", async () => {
  const s = setup();
  const { id } = await s.service.createMarket(s.admin, gwInput());
  await rejects(() => s.service.resolve(s.admin, id), 409, /still open/);
  s.clock.t = T0 + 9 * HOUR;
  await rejects(() => s.service.resolve(s.admin, id), 409, /No final/);
});

test("void refunds every pick; voiding again changes nothing", async () => {
  const s = setup();
  const [a, b] = ["alice", "bob"].map(s.user);
  const { id } = await s.service.createMarket(s.admin, gwInput());
  s.service.predict(a, id, "a");
  s.service.predict(b, id, "b");
  await rejects(() => s.service.voidMarket(s.admin, id, ""), 400);
  s.service.voidMarket(s.admin, id, "Game canceled");
  assert.equal(s.service.voidMarket(s.admin, id, "Game canceled").already, true);
  assert.equal(s.balance(a.id), 1000);
  assert.equal(s.balance(b.id), 1000);
  const me = await s.service.dashboard(a);
  assert.equal(me.record.void, 1);
  assert.equal(me.completed[0].status, "void");
});

test("postponed: picks stand, no new picks, settles when played; reopening needs a future close", async () => {
  const s = setup();
  const [a, b] = ["alice", "bob"].map(s.user);
  const { id } = await s.service.createMarket(s.admin, gwInput());
  s.service.predict(a, id, "a");
  s.service.setState(s.admin, id, "postpone", "Server issues");
  assert.equal((await s.service.getMarket(id)).market.status, "locked");
  assert.equal((await s.service.getMarket(id)).market.hold, "postponed");
  await rejects(() => s.service.predict(b, id, "b"), 409);
  s.clock.t = T0 + 30 * HOUR;
  s.post("T-1", [10, 3]);
  await s.service.resolve(s.admin, id);
  assert.equal(s.balance(a.id), 1050);

  s.clock.t = T0;
  const m2 = await s.service.createMarket(s.admin, ouInput());
  s.service.setState(s.admin, m2.id, "postpone");
  s.clock.t = T0 + 9 * HOUR;
  await rejects(() => s.service.setState(s.admin, m2.id, "open"), 409, /closing time has passed/);
});

test("dispute reverses a settlement, then a corrected result pays the right people once", async () => {
  const s = setup();
  const [a, b] = ["alice", "bob"].map(s.user);
  const { id } = await s.service.createMarket(s.admin, gwInput());
  s.service.predict(a, id, "a");
  s.service.predict(b, id, "b");
  s.clock.t = T0 + 9 * HOUR;
  s.post("T-1", [28, 21]);
  await s.service.resolve(s.admin, id);
  assert.equal(s.balance(a.id), 1050);
  s.service.setState(s.admin, id, "dispute", "Wrong score was posted");
  assert.equal(s.balance(a.id), 950);
  assert.equal(s.balance(b.id), 950);
  await rejects(() => s.service.predict(s.user("late"), id, "a"), 409);
  await s.service.resolve(s.admin, id, { mode: "manual", scoreA: 21, scoreB: 28, note: "Corrected by league office" });
  assert.equal(s.balance(a.id), 950);
  assert.equal(s.balance(b.id), 1050);
  [a, b].forEach((u) => assert.equal(s.balance(u.id), s.ledgerSum(u.id)));
  const m = (await s.service.getMarket(id, b.id)).market;
  assert.equal(m.resolution.source, "manual");
  assert.deepEqual(m.resolution.score, [21, 28]); // what's shown is what's stored
});

test("manual settling needs a note and a real number", async () => {
  const s = setup();
  const { id } = await s.service.createMarket(s.admin, ouInput());
  s.clock.t = T0 + 9 * HOUR;
  await rejects(() => s.service.resolve(s.admin, id, { mode: "manual", value: 520, note: "" }), 400, /note/);
  await rejects(() => s.service.resolve(s.admin, id, { mode: "manual", value: "", note: "From the VOD" }), 400);
  assert.equal((await s.service.resolve(s.admin, id, { mode: "manual", value: 520, note: "From the VOD" })).outcome, "over");
});

test("markets: only real scheduled games, not final ones, close by kickoff, no duplicates", async () => {
  const s = setup();
  await rejects(() => s.service.createMarket(s.admin, gwInput({ gameId: "NOPE" })), 400, /schedule/);
  await rejects(() => s.service.createMarket(s.admin, gwInput({ closesAt: T0 + 11 * HOUR })), 400, /kickoff/);
  await rejects(() => s.service.createMarket(s.admin, gwInput({ closesAt: T0 - 1 })), 400, /future/);
  await rejects(() => s.service.createMarket(s.admin, ouInput({ statKey: "made_up" })), 400);
  await rejects(() => s.service.createMarket(s.admin, ouInput({ line: 10.25 })), 400);
  await rejects(() => s.service.createMarket(s.admin, ouInput({ playerTeam: "Olympia Owls" })), 400);
  await s.service.createMarket(s.admin, gwInput());
  await rejects(() => s.service.createMarket(s.admin, gwInput()), 409);
  s.post("T-3", [1, 0]);
  await rejects(() => s.service.createMarket(s.admin, gwInput({ gameId: "T-3" })), 400, /final/);
  const t3 = setup(); // a game without a kickoff time can close whenever the admin sets
  assert.ok((await t3.service.createMarket(t3.admin, gwInput({ gameId: "T-3", closesAt: T0 + 100 * HOUR }))).id);
});

test("ordinary users can't run admin actions", async () => {
  const s = setup();
  const a = s.user("alice");
  const { id } = await s.service.createMarket(s.admin, gwInput());
  await rejects(() => s.service.createMarket(a, gwInput({ gameId: "T-3" })), 403);
  await rejects(() => s.service.resolve(a, id), 403);
  await rejects(() => s.service.voidMarket(a, id, "nope"), 403);
  await rejects(() => s.service.setState(a, id, "lock"), 403);
  await rejects(() => s.service.editMarket(a, id, { closesAt: T0 + HOUR }), 403);
  await rejects(() => s.service.auditLog(a), 403);
  await rejects(() => s.service.games(null), 403);
});

test("a market with picks keeps its line; closing time can still move; every change is audited", async () => {
  const s = setup();
  const a = s.user("alice");
  const { id } = await s.service.createMarket(s.admin, ouInput());
  s.service.editMarket(s.admin, id, { line: 450.5 });
  s.service.predict(a, id, "over");
  await rejects(() => s.service.editMarket(s.admin, id, { line: 600 }), 409, /already has picks/);
  s.service.editMarket(s.admin, id, { closesAt: T0 + 5 * HOUR });
  const log = s.service.auditLog(s.admin, { marketId: id });
  assert.deepEqual(log.map((r) => r.action), ["edit", "edit", "create"]);
  assert.deepEqual(log[1].detail.line, { from: 500, to: 450.5 });
});

test("dashboard: only your own picks, accuracy separate from points, streak and balance history", async () => {
  const s = setup();
  const [a, b] = ["alice", "bob"].map(s.user);
  const m1 = await s.service.createMarket(s.admin, gwInput());
  const m2 = await s.service.createMarket(s.admin, ouInput());
  s.service.predict(a, m1.id, "a");
  s.service.predict(a, m2.id, "over");
  s.service.predict(b, m1.id, "b");
  s.clock.t = T0 + 9 * HOUR;
  s.post("T-1", [20, 10]);
  s.post("T-2", [20, 10], box(510));
  await s.service.resolve(s.admin, m1.id);
  await s.service.resolve(s.admin, m2.id);

  const me = await s.service.dashboard(a);
  assert.equal(me.user.username, "alice");
  assert.equal(me.active.length + me.completed.length, 2);
  assert.ok([...me.active, ...me.completed].every((m) => m.mine));
  assert.equal(me.record.accuracy, 1);
  assert.deepEqual(me.record.streak, { type: "W", n: 2 });
  assert.equal(me.user.balance, 1100);
  assert.deepEqual(me.ledger.map((l) => l.balance), [1000, 950, 900, 1000, 1100]);
  assert.deepEqual(me.rank, { rank: 1, of: 1 }); // bob has 1 decided pick, under the minimum of 2

  // bob's view of the same market shows his pick, never alice's
  const bobsView = (await s.service.getMarket(m1.id, b.id)).market;
  assert.equal(bobsView.mine.selection, "b");
  const anon = (await s.service.getMarket(m1.id)).market;
  assert.equal(anon.mine, null);
  await rejects(() => s.service.dashboard(null), 401);
});

test("leaderboard: accuracy and points are separate lists, admins aren't on either", async () => {
  const s = setup({ config: { minLeaderboard: 1 } });
  const [a, b] = ["alice", "bob"].map(s.user);
  const m1 = await s.service.createMarket(s.admin, gwInput());
  s.service.predict(a, m1.id, "a");
  s.service.predict(b, m1.id, "b");
  s.clock.t = T0 + 9 * HOUR;
  s.post("T-1", [0, 7]);
  await s.service.resolve(s.admin, m1.id);
  const lb = s.service.leaderboard();
  assert.deepEqual(lb.accuracy.map((r) => [r.username, r.accuracy]), [["bob", 1], ["alice", 0]]);
  assert.deepEqual(lb.points.map((r) => r.username), ["bob", "alice"]);
  assert.ok(!JSON.stringify(lb).includes("boss"));
  assert.ok(lb.accuracy.every((r) => !("balance" in r)));
});

test("points list counts points riding on open picks, so making a pick doesn't drop you down it", async () => {
  const s = setup();
  const [a] = ["alice", "bob"].map(s.user);
  const { id } = await s.service.createMarket(s.admin, gwInput());
  s.service.predict(a, id, "a");
  const lb = s.service.leaderboard();
  assert.deepEqual(lb.points.map((r) => [r.username, r.total, r.inPlay, r.balance]), [["alice", 1000, 50, 950]]);
});

test("list: filters by category, status and search, and sorts", async () => {
  const s = setup();
  const a = s.user("alice");
  const gw = await s.service.createMarket(s.admin, gwInput());
  const ou = await s.service.createMarket(s.admin, ouInput({ closesAt: T0 + 2 * HOUR }));
  s.service.predict(a, gw.id, "a");
  const ids = async (o) => (await s.service.listMarkets(o)).markets.map((m) => m.id);
  assert.deepEqual(await ids({ kind: "game_winner" }), [gw.id]);
  assert.deepEqual(await ids({ q: "bigLESTER" }), [ou.id]);
  assert.deepEqual(await ids({ q: "costa rica" }), [gw.id]);
  assert.deepEqual(await ids({ sort: "closing" }), [ou.id, gw.id]);
  assert.deepEqual(await ids({ sort: "popular" }), [gw.id, ou.id]);
  s.clock.t = T0 + 3 * HOUR;
  assert.deepEqual(await ids({ status: "locked" }), [ou.id]);
  assert.deepEqual(await ids({ status: "open" }), [gw.id]);
  assert.deepEqual(await ids({ status: "completed" }), []);
});

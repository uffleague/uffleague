import { test } from "node:test";
import assert from "node:assert/strict";
import { setup, ouInput, gwInput, HOUR, T0 } from "./helpers.js";

const rejects = (p, status, re) => assert.rejects(Promise.resolve().then(p), (e) => e.status === status && (!re || re.test(e.message)));
const box = (lines) => [{}, { passing: lines }];

// Three real-shaped legs: Olympia vs Costa Rica, biglester1 passing yards, sec2v passing TDs
async function threeLegs(s) {
  const gw = (await s.service.createMarket(s.admin, gwInput())).id;
  const ou1 = (await s.service.createMarket(s.admin, ouInput())).id;
  const ou2 = (await s.service.createMarket(s.admin, ouInput({ player: "sec2v", playerTeam: "Toronto Maples", statKey: "pass_td", line: 4.5 }))).id;
  return [gw, ou1, ou2];
}
const draft = (legs, over = {}) => ({ title: "UFF Weekly Challenge", description: "Three picks, one entry.", entryDeadline: T0 + 8 * HOUR,
  pointsPerLeg: 25, perfectBonus: 100, legs, ...over });
const answersFor = async (s, id, picks) => {
  const { challenge } = await s.challenges.detail(null, id);
  return Object.fromEntries(challenge.legs.map((l, i) => [l.id, picks[i]]));
};

test("builder: a draft with legs from real markets, edited, reordered and published; every step audited", async () => {
  const s = setup();
  const [gw, ou1, ou2] = await threeLegs(s);
  const { id } = s.challenges.create(s.admin, draft([gw, ou1]));
  s.challenges.update(s.admin, id, draft([ou2, gw, ou1], { title: "Week 1 Challenge" })); // add, reorder
  s.challenges.update(s.admin, id, draft([ou2, gw])); // remove
  await rejects(() => s.challenges.detail(s.user("peeker"), id), 404); // drafts aren't public
  assert.equal(s.challenges.list(null).length, 0);
  s.challenges.publish(s.admin, id);
  const { challenge } = await s.challenges.detail(null, id);
  assert.equal(challenge.title, "UFF Weekly Challenge");
  assert.deepEqual(challenge.legs.map((l) => l.market.id), [ou2, gw]);
  assert.equal(challenge.legs[0].market.player, "sec2v");
  assert.equal(challenge.status, "open");
  assert.equal(challenge.maxAward, 2 * 25 + 100);
  assert.match(challenge.rules.join(" "), /Free to enter/);
  await rejects(() => s.challenges.update(s.admin, id, draft([gw, ou1])), 409, /Only drafts/);
  const log = s.audit.list({ action: "challenge." }).rows;
  assert.deepEqual(log.map((r) => r.action), ["challenge.publish", "challenge.edit", "challenge.edit", "challenge.create"]);
  assert.deepEqual(log[2].detail.before.legs, [gw, ou1]);
  assert.deepEqual(log[2].detail.after.legs, [ou2, gw, ou1]);
});

test("builder rules: two legs to publish, real open markets only, legs open until the deadline, points set", async () => {
  const s = setup();
  const [gw, ou1] = await threeLegs(s);
  const { id } = s.challenges.create(s.admin, draft([gw]));
  await rejects(() => s.challenges.publish(s.admin, id), 400, /at least two legs/);
  assert.throws(() => s.challenges.create(s.admin, draft([gw, 999])), /doesn't exist/);
  assert.throws(() => s.challenges.create(s.admin, draft([gw, gw])), /only be one leg/);
  assert.throws(() => s.challenges.create(s.admin, draft([gw, ou1], { entryDeadline: T0 + 9.5 * HOUR })), /closes before the challenge deadline/);
  assert.throws(() => s.challenges.create(s.admin, draft([gw, ou1], { pointsPerLeg: 0, perfectBonus: 0 })), /points/);
  assert.throws(() => s.challenges.create(s.admin, draft([gw, ou1], { pointsPerLeg: -5 })), /0-1000/);
  assert.throws(() => s.challenges.create(s.admin, draft([gw, ou1], { title: "" })), /title/);
  s.service.voidMarket(s.admin, ou1, "Game canceled");
  assert.throws(() => s.challenges.create(s.admin, draft([gw, ou1])), /already settled or void/);
});

test("who can build: staff manage their own challenges, admins any, players none; admin tools must be unlocked", async () => {
  const s = setup();
  const [gw, ou1] = await threeLegs(s);
  const staffA = s.signedIn("staff_a", "13570", "staff").user;
  const staffB = s.signedIn("staff_b", "13572", "staff").user;
  const { id } = s.challenges.create(staffA, draft([gw, ou1]));
  await rejects(() => s.challenges.update(staffB, id, draft([gw, ou1])), 403, /only manage challenges they made/);
  await rejects(() => s.challenges.publish(staffB, id), 403);
  s.challenges.update(s.admin, id, draft([ou1, gw])); // an admin can
  await rejects(() => s.challenges.create(s.user("player"), draft([gw, ou1])), 403);
  await rejects(() => s.challenges.create({ ...staffA, elevated: false }, draft([gw, ou1])), 401, /Unlock admin tools/);
  assert.deepEqual(s.challenges.adminList(staffB).map((c) => c.id), []); // someone else's draft isn't listed
});

test("entering: free, every leg answered, one entry per account, changeable until the deadline, then locked", async () => {
  const s = setup();
  const legs = await threeLegs(s);
  const { id } = s.challenges.create(s.admin, draft(legs));
  const a = s.user("alice");
  await rejects(() => s.challenges.enter(a, id, {}), 409, /isn't published/);
  s.challenges.publish(s.admin, id);
  const picks = await answersFor(s, id, ["a", "over", "under"]);
  const [firstLeg] = Object.keys(picks);
  await rejects(() => s.challenges.enter(a, id, { [firstLeg]: "a" }), 400, /Answer every leg/);
  await rejects(() => s.challenges.enter(a, id, { ...picks, [firstLeg]: "over" }), 400); // not a choice for that leg
  await rejects(() => s.challenges.enter(null, id, picks), 401);
  await rejects(() => s.challenges.enter(s.admin, id, picks), 403, /can't enter/);
  s.challenges.enter(a, id, picks);
  s.challenges.enter(a, id, { ...picks, [firstLeg]: "b" }); // changed before the deadline
  assert.equal(s.db.prepare("SELECT COUNT(*) AS n FROM challenge_entries WHERE challenge_id = ?").get(id).n, 1);
  const { challenge } = await s.challenges.detail(a, id);
  assert.equal(challenge.legs[0].mine.selection, "b");
  assert.equal(s.balance(a.id), 1000); // nothing taken to enter
  s.clock.t = T0 + 8 * HOUR;
  await rejects(() => s.challenges.enter(a, id, picks), 409, /locked/);
  assert.equal((await s.challenges.detail(a, id)).challenge.status, "locked");
});

test("scoring: points per correct leg, a voided leg doesn't count, perfect bonus, nothing ever taken", async () => {
  const s = setup();
  const [gw, ou1, ou2] = await threeLegs(s);
  const { id } = s.challenges.create(s.admin, draft([gw, ou1, ou2]));
  s.challenges.publish(s.admin, id);
  const [a, b, c] = ["alice", "bob", "cara"].map(s.user);
  s.challenges.enter(a, id, await answersFor(s, id, ["a", "over", "under"])); // all three right
  s.challenges.enter(b, id, await answersFor(s, id, ["a", "under", "over"])); // 1 right, 2 wrong
  s.challenges.enter(c, id, await answersFor(s, id, ["b", "under", "over"])); // all wrong
  s.clock.t = T0 + 8 * HOUR;
  await rejects(() => s.challenges.settle(s.admin, id), 409, /Waiting on/);
  s.clock.t = T0 + 9 * HOUR;
  s.post("T-1", [28, 21]); // Olympia win
  s.post("T-2", [30, 24], box([{ player: "biglester1", yds: 512, td: 3 }, { player: "sec2v", yds: 300, td: 3 }]));
  await s.service.resolve(s.admin, gw);
  await s.service.resolve(s.admin, ou1);
  await s.service.resolve(s.admin, ou2); // sec2v 3 TD: under 4.5
  // alice: all 3 right = 3 x 25 + 100 bonus; bob: 1 right = 25; cara: none right = 0 (and nothing taken)
  const out = s.challenges.settle(s.admin, id);
  assert.equal(out.entries, 3);
  const entry = (u) => s.db.prepare("SELECT * FROM challenge_entries WHERE challenge_id = ? AND user_id = ?").get(id, u.id);
  assert.deepEqual([entry(a).correct, entry(a).wrong, entry(a).award], [3, 0, 175]);
  assert.deepEqual([entry(b).correct, entry(b).wrong, entry(b).award], [1, 2, 25]);
  assert.deepEqual([entry(c).correct, entry(c).wrong, entry(c).award], [0, 3, 0]);
  assert.equal(s.balance(a.id), 1175);
  assert.equal(s.balance(b.id), 1025);
  assert.equal(s.balance(c.id), 1000); // all wrong: nothing taken
  assert.equal(s.db.prepare("SELECT COUNT(*) AS n FROM ledger WHERE kind = 'challenge_award' AND delta <= 0").get().n, 0);
  const view = (await s.challenges.detail(a, id)).challenge;
  assert.equal(view.status, "settled");
  assert.deepEqual(view.legs.map((l) => l.mine.result), ["won", "won", "won"]);
  assert.equal(view.mine.award, 175);
});

test("void legs: a voided market and a push don't count; all-void entries award nothing", async () => {
  const s = setup();
  const [gw, ou1, ou2] = await threeLegs(s);
  const { id } = s.challenges.create(s.admin, draft([gw, ou1, ou2], { pointsPerLeg: 10, perfectBonus: 50 }));
  s.challenges.publish(s.admin, id);
  const a = s.user("alice");
  s.challenges.enter(a, id, await answersFor(s, id, ["a", "over", "under"]));
  s.clock.t = T0 + 9 * HOUR;
  s.post("T-1", [28, 21]);
  s.post("T-2", [30, 24], box([{ player: "biglester1", yds: 500 }, { player: "sec2v", td: 3 }]));
  await s.service.resolve(s.admin, gw);
  await s.service.resolve(s.admin, ou1); // exactly 500: push -> void leg
  s.service.voidMarket(s.admin, ou2, "Stat feed broke");
  s.challenges.settle(s.admin, id);
  const e = s.db.prepare("SELECT * FROM challenge_entries WHERE challenge_id = ?").get(id);
  // 1 counting leg, right: 10 points; perfect bonus needs at least two counting legs
  assert.deepEqual([e.correct, e.wrong, e.voided, e.award, e.result], [1, 0, 2, 10, "scored"]);

  const s2 = setup();
  const legs2 = await threeLegs(s2);
  const c2 = s2.challenges.create(s2.admin, draft(legs2.slice(0, 2))).id;
  s2.challenges.publish(s2.admin, c2);
  const b = s2.user("bob");
  s2.challenges.enter(b, c2, await answersFor(s2, c2, ["a", "over"]));
  s2.clock.t = T0 + 9 * HOUR;
  legs2.slice(0, 2).forEach((m) => s2.service.voidMarket(s2.admin, m, "Game canceled"));
  s2.challenges.settle(s2.admin, c2);
  const e2 = s2.db.prepare("SELECT * FROM challenge_entries WHERE challenge_id = ?").get(c2);
  assert.deepEqual([e2.result, e2.award], ["void", 0]);
  assert.equal(s2.balance(b.id), 1000);
});

test("settling twice (or a retry) never pays twice", async () => {
  const s = setup();
  const [gw, ou1] = await threeLegs(s);
  const { id } = s.challenges.create(s.admin, draft([gw, ou1]));
  s.challenges.publish(s.admin, id);
  const a = s.user("alice");
  s.challenges.enter(a, id, await answersFor(s, id, ["a", "over"]));
  s.clock.t = T0 + 9 * HOUR;
  s.post("T-1", [28, 21]);
  s.post("T-2", [30, 24], box([{ player: "biglester1", yds: 600 }]));
  await s.service.resolve(s.admin, gw);
  await s.service.resolve(s.admin, ou1);
  s.challenges.settle(s.admin, id);
  assert.equal(s.challenges.settle(s.admin, id).already, true);
  assert.equal(s.balance(a.id), 1000 + 2 * 25 + 100);
  assert.equal(s.db.prepare("SELECT COUNT(*) AS n FROM ledger WHERE kind = 'challenge_award'").get().n, 1);
  // even writing the award row again by hand is refused (one idempotency key per entry)
  const entryId = s.db.prepare("SELECT id FROM challenge_entries").get().id;
  assert.throws(() => s.db.prepare(`INSERT INTO ledger (tx_id, user_id, at, kind, delta, balance_before, balance_after, idempotency_key)
    VALUES ('x1', ?, 0, 'challenge_award', 150, 0, 150, ?)`).run(a.id, `challenge:${id}:entry:${entryId}`), /UNIQUE/);
  assert.deepEqual(s.ledger.mismatches(), []);
});

test("cancelling: needs a reason, entries end void, no points move; settled challenges can't be cancelled", async () => {
  const s = setup();
  const [gw, ou1] = await threeLegs(s);
  const { id } = s.challenges.create(s.admin, draft([gw, ou1]));
  s.challenges.publish(s.admin, id);
  const a = s.user("alice");
  s.challenges.enter(a, id, await answersFor(s, id, ["a", "over"]));
  await rejects(() => s.challenges.cancel(s.admin, id, ""), 400);
  s.challenges.cancel(s.admin, id, "Schedule changed");
  assert.equal(s.challenges.cancel(s.admin, id, "Again").already, true);
  assert.equal(s.db.prepare("SELECT result FROM challenge_entries").get().result, "void");
  assert.equal(s.balance(a.id), 1000);
  const again = await answersFor(s, id, ["a", "over"]);
  await rejects(() => s.challenges.enter(a, id, again), 409, /closed/);
});

test("privacy: you see your own answers only; others' entries never show", async () => {
  const s = setup();
  const [gw, ou1] = await threeLegs(s);
  const { id } = s.challenges.create(s.admin, draft([gw, ou1]));
  s.challenges.publish(s.admin, id);
  const [a, b] = ["alice", "bob"].map(s.user);
  s.challenges.enter(a, id, await answersFor(s, id, ["a", "over"]));
  const bobView = (await s.challenges.detail(b, id)).challenge;
  assert.ok(bobView.legs.every((l) => l.mine === null));
  assert.equal(bobView.mine, null);
  assert.ok(!JSON.stringify(bobView).includes("alice"));
  assert.equal(s.challenges.myEntries(b).length, 0);
  assert.equal(s.challenges.myEntries(a).length, 1);
  await rejects(() => s.challenges.myEntries(null), 401);
});

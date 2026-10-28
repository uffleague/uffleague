import { test } from "node:test";
import assert from "node:assert/strict";
import * as core from "../core.js";

test("over/under: strictly above is over, strictly below is under", () => {
  assert.equal(core.overUnderOutcome(501, 500), "over");
  assert.equal(core.overUnderOutcome(499, 500), "under");
  assert.equal(core.overUnderOutcome(0, 0.5), "under");
  assert.equal(core.overUnderOutcome(1, 0.5), "over");
});

test("over/under: exactly on a whole-number line is a push; a .5 line can't push", () => {
  assert.equal(core.overUnderOutcome(500, 500), "push");
  assert.equal(core.lineHasPush(500), true);
  assert.equal(core.lineHasPush(499.5), false);
  const rules = core.rulesFor({ kind: "player_ou", player: "biglester1", stat_key: "pass_yds", line: 500, game_id: "W3-1" }).join(" ");
  assert.match(rules, /Exactly 500 is a push/);
  assert.match(core.rulesFor({ kind: "player_ou", player: "x", stat_key: "pass_yds", line: 499.5, game_id: "W3-1" }).join(" "), /no push/);
});

test("lines: whole numbers or .5, not negative", () => {
  [0, 0.5, 3, 500, 499.5].forEach((n) => assert.equal(core.validLine(n), true, String(n)));
  [-1, 0.25, NaN, Infinity, 10001].forEach((n) => assert.equal(core.validLine(n), false, String(n)));
});

test("game winner from the final score; a tie is a push", () => {
  assert.equal(core.winnerOutcome([28, 21]), "a");
  assert.equal(core.winnerOutcome([0, 21]), "b");
  assert.equal(core.winnerOutcome([14, 14]), "push");
  assert.throws(() => core.winnerOutcome(null));
});

test("community split: 68 of 100 is 68% / 32%, with counts", () => {
  const s = core.communitySplit({ a: 68, b: 32 }, ["a", "b"]);
  assert.deepEqual(s, { total: 100, options: [{ key: "a", count: 68, pct: 68 }, { key: "b", count: 32, pct: 32 }] });
});

test("community split: percents always add to 100", () => {
  const s = core.communitySplit({ over: 1, under: 2 }, ["over", "under"]);
  assert.equal(s.options[0].pct + s.options[1].pct, 100);
  assert.deepEqual(s.options.map((o) => o.pct), [33, 67]);
});

test("community split: no picks gives null percents, never a made-up 50/50", () => {
  const s = core.communitySplit({}, ["a", "b"]);
  assert.equal(s.total, 0);
  assert.deepEqual(s.options.map((o) => o.pct), [null, null]);
  assert.ok(s.options.every((o) => !Number.isNaN(o.pct)));
});

test("community split ignores selections that aren't options", () => {
  assert.equal(core.communitySplit({ a: 1, b: 1, junk: 5 }, ["a", "b"]).total, 2);
});

test("status: picks lock at the closing time whatever is stored", () => {
  const m = { status: "open", closes_at: 1000, opens_at: null, hold: null };
  assert.equal(core.effectiveStatus(m, 999), "open");
  assert.equal(core.effectiveStatus(m, 1000), "locked");
  assert.equal(core.effectiveStatus({ ...m, status: "upcoming", opens_at: 500 }, 400), "upcoming");
  assert.equal(core.effectiveStatus({ ...m, status: "upcoming", opens_at: 500 }, 600), "open");
  assert.equal(core.effectiveStatus({ ...m, hold: "postponed" }, 10), "locked");
  assert.equal(core.effectiveStatus({ ...m, status: "resolved" }, 10), "resolved");
  assert.equal(core.effectiveStatus({ ...m, status: "void" }, 5000), "void");
});

test("box score: stat summed across lines, 0 if played without that line, not played if absent", () => {
  const box = [
    { passing: [{ player: "BigLester1", yds: 300 }], rushing: [{ player: "biglester1", yds: 20 }] },
    { defense: [{ player: "dbguy", tak: 3 }] }
  ];
  const names = new Set(["biglester1"]);
  assert.deepEqual(core.playerStatFromBox(box, names, "pass_yds"), { played: true, value: 300 });
  assert.deepEqual(core.playerStatFromBox(box, names, "rec_yds"), { played: true, value: 0 });
  assert.deepEqual(core.playerStatFromBox(box, new Set(["nobody"]), "pass_yds"), { played: false });
  assert.throws(() => core.playerStatFromBox(box, names, "made_up_stat"));
});

test("record: accuracy leaves out pushes, voids and pending; streaks follow settle order", () => {
  const picks = [
    { id: 1, result: "won", settled_at: 1 }, { id: 2, result: "won", settled_at: 2 }, { id: 3, result: "push", settled_at: 3 },
    { id: 4, result: "won", settled_at: 4 }, { id: 5, result: "lost", settled_at: 5 }, { id: 6, result: "void", settled_at: 6 },
    { id: 7, result: "pending", settled_at: null }
  ];
  const r = core.userRecord(picks);
  assert.equal(r.won, 3); assert.equal(r.lost, 1); assert.equal(r.push, 1); assert.equal(r.void, 1); assert.equal(r.pending, 1);
  assert.equal(r.accuracy, 0.75);
  assert.deepEqual(r.streak, { type: "L", n: 1 });
  assert.equal(r.bestStreak, 3);
  assert.equal(core.userRecord([]).accuracy, null);
});

test("accuracy leaderboard: needs a minimum, ranks by accuracy not points, ties share a rank", () => {
  const rows = [
    { username: "rich", won: 3, lost: 3, balance: 99999 },
    { username: "sharp", won: 4, lost: 1, balance: 900 },
    { username: "also", won: 4, lost: 1, balance: 10 },
    { username: "new", won: 1, lost: 0, balance: 1050 }
  ];
  const ranked = core.rankAccuracy(rows, 3);
  assert.deepEqual(ranked.map((r) => [r.username, r.rank]), [["also", 1], ["sharp", 1], ["rich", 3]]);
});

test("payouts: correct pays back double the stake, push and void give the stake back, wrong pays nothing", () => {
  assert.equal(core.payoutFor("won", 50), 100);
  assert.equal(core.payoutFor("push", 50), 50);
  assert.equal(core.payoutFor("void", 50), 50);
  assert.equal(core.payoutFor("lost", 50), 0);
});

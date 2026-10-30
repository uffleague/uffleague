// Test-only Worker (wrangler.selftest.toml, used with `wrangler dev`, never deployed): runs the shared predictions code
// on a real Durable Object SQLite database, on Cloudflare's runtime, with made-up test games and a clock the test moves.
// GET /selftest runs everything in a brand-new Durable Object and answers with each check's result.
import { DurableObject } from "cloudflare:workers";
import { sqlDb, buildTools, MIGRATIONS, CONFIG } from "../src/predictions.js";
import { runMigrationsUp, tx } from "../../predictions/txn.js";
import { buildLeague } from "../../predictions/league-core.js";
import { parseLeague } from "../../predictions/jsliteral.js";
import { PERMISSIONS } from "../../predictions/roles.js";
import dataJs from "../../data.js";

const HOUR = 3600 * 1000;

export class SelfTestDB extends DurableObject {
  async fetch() {
    const results = [];
    const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, ...(ok ? {} : { detail: String(detail) }) });
    try {
      const db = sqlDb(this.ctx);
      check("migrations run on Durable Object SQLite", JSON.stringify(runMigrationsUp(db, MIGRATIONS)) === "[1,2,3]");
      const clock = { t: Date.UTC(2026, 10, 1, 18) };
      const T0 = clock.t;
      const saved = { schedule: [{ week: 1, series: 1, games: [{ id: "T-1", teams: ["OLY", "CR"], at: T0 + 10 * HOUR }, { id: "T-2", teams: ["NO", "TOR"], at: T0 + 10 * HOUR }] }], results: [] };
      const L = parseLeague(dataJs);
      const league = { mode: "live", label: "", get: async () => ({ ok: true, source: "live", fetchedAt: clock.t, error: null, view: buildLeague(L, saved) }) };
      const t = buildTools({ db, league, config: CONFIG, now: () => clock.t });
      const get = (q, ...a) => db.prepare(q).get(...a);

      // Accounts (sign-in itself moves over in the next step; here they're made the way createAccount makes them)
      const mk = (username, role = "user") => tx(db, () => {
        const id = Number(db.prepare(`INSERT INTO users (username, pass_hash, pass_salt, balance, created_at, account_id, credential, role, status, last_sign_in_at)
          VALUES (?, 'x', '', 0, ?, ?, 'pin', ?, 'active', ?)`).run(username, clock.t, crypto.randomUUID(), role, clock.t).lastInsertRowid);
        t.ledger.post({ userId: id, delta: CONFIG.startBalance, kind: "grant", idempotencyKey: `grant:${id}` });
        const u = get("SELECT * FROM users WHERE id = ?", id);
        return { id, accountId: u.account_id, username, role, status: "active", perms: PERMISSIONS[role], isAdmin: role === "admin" || role === "super_admin", isStaff: role !== "user" };
      });
      const boss = mk("boss", "super_admin"), alice = mk("alice"), bob = mk("bob");
      const bal = (u) => get("SELECT balance FROM users WHERE id = ?", u.id).balance;
      check("new accounts start with 500", bal(alice) === 500 && bal(bob) === 500, bal(alice));

      // Markets and picks
      const gw = (await t.service.createMarket(boss, { kind: "game_winner", gameId: "T-1", closesAt: T0 + 9 * HOUR })).id;
      const ou = (await t.service.createMarket(boss, { kind: "player_ou", gameId: "T-2", player: "biglester1", playerTeam: "New Orleans Raiders", statKey: "pass_yds", line: 500, closesAt: T0 + 9 * HOUR })).id;
      t.service.predict(alice, gw, "a");
      t.service.predict(bob, gw, "b");
      t.service.predict(alice, ou, "over");
      let dup = null; try { t.service.predict(alice, gw, "b"); } catch (e) { dup = e.status; }
      check("a second pick on one market is refused", dup === 409, dup);
      const m = (await t.service.getMarket(gw, alice.id)).market;
      check("community split 50/50 from two picks", m.total === 2 && m.options[0].pct === 50, JSON.stringify(m.options));
      check("picks are free", bal(alice) === 500);

      // Settling, retrying, disputing
      clock.t = T0 + 9 * HOUR;
      saved.results.push({ id: "T-1", score: [28, 21] }, { id: "T-2", score: [30, 24], box: [{}, { passing: [{ player: "biglester1", yds: 512 }] }] });
      await t.service.resolve(boss, gw);
      await t.service.resolve(boss, ou);
      check("correct picks pay the market's points", bal(alice) === 600 && bal(bob) === 500, `${bal(alice)} ${bal(bob)}`);
      check("settling again pays nothing", (await t.service.resolve(boss, gw)).already === true && bal(alice) === 600);
      t.service.setState(boss, gw, "dispute", "Wrong score posted");
      check("a dispute takes the award back", bal(alice) === 550, bal(alice));
      await t.service.resolve(boss, gw, { mode: "manual", scoreA: 14, scoreB: 21, note: "Corrected score" });
      check("the corrected result pays the right person once", bal(alice) === 550 && bal(bob) === 550, `${bal(alice)} ${bal(bob)}`);

      // A parlay
      clock.t = T0;
      saved.results.length = 0;
      saved.schedule[0].games.push({ id: "T-3", teams: ["BAL", "SJS"], at: T0 + 10 * HOUR }, { id: "T-4", teams: ["SEA", "PIT"], at: T0 + 10 * HOUR });
      const g3 = (await t.service.createMarket(boss, { kind: "game_winner", gameId: "T-3", closesAt: T0 + 9 * HOUR })).id;
      const g4 = (await t.service.createMarket(boss, { kind: "game_winner", gameId: "T-4", closesAt: T0 + 9 * HOUR })).id;
      const c = t.challenges.create(boss, { title: "Test parlay", entryDeadline: T0 + 8 * HOUR, pointsPerLeg: 25, perfectBonus: 100, legs: [g3, g4] }).id;
      t.challenges.publish(boss, c);
      const legs = (await t.challenges.detail(null, c)).challenge.legs;
      t.challenges.enter(alice, c, { [legs[0].id]: "a", [legs[1].id]: "b" });
      clock.t = T0 + 9 * HOUR;
      saved.results.push({ id: "T-3", score: [10, 3] }, { id: "T-4", score: [7, 21] });
      await t.service.resolve(boss, g3);
      await t.service.resolve(boss, g4);
      const before = bal(alice);
      t.challenges.settle(boss, c);
      check("a perfect parlay pays 2 x 25 + 100", bal(alice) === before + 150, bal(alice) - before);
      check("settling the parlay again pays nothing", t.challenges.settle(boss, c).already === true && bal(alice) === before + 150);

      // Rewards
      const rid = t.rewards.createReward(boss, { name: "Pic perms", category: "other", cost: 300, enabled: true, requiresApproval: true }).id;
      const key = crypto.randomUUID();
      const r1 = t.rewards.redeem(bob, { rewardId: rid, idempotencyKey: key });
      const r2 = t.rewards.redeem(bob, { rewardId: rid, idempotencyKey: key });
      check("a repeated redeem takes the points once", r2.repeated === true && bal(bob) === 250, bal(bob));
      t.rewards.act(boss, r1.redemption.id, { action: "reject", note: "Not this season" });
      t.rewards.act(boss, r1.redemption.id, { action: "reject", note: "again" });
      check("a rejection refunds once", bal(bob) === 550, bal(bob));

      // Credits
      const adj = { accountId: bob.accountId, username: "bob", type: "add", amount: 40, reasonCode: "event", note: "Watch party", idempotencyKey: crypto.randomUUID() };
      t.admin.adjust(boss, adj);
      check("a retried credit adjustment lands once", t.admin.adjust(boss, adj).repeated === true && bal(bob) === 590, bal(bob));

      // Integrity
      check("every balance matches the ledger", t.ledger.mismatches().length === 0, JSON.stringify(t.ledger.mismatches()));
      let blocked = 0;
      for (const q of ["UPDATE audit SET action = 'x'", "DELETE FROM audit", "DELETE FROM ledger", "UPDATE ledger SET delta = 0"]) { try { db.exec(q); } catch (e) { blocked++; } }
      check("the audit log and ledger can't be edited or deleted", blocked === 4, blocked);
      const users = get("SELECT COUNT(*) AS n FROM users").n;
      try { tx(db, () => { db.prepare("INSERT INTO users (username, pass_hash, pass_salt, balance, created_at, credential) VALUES ('half', 'x', '', 0, 0, 'pin')").run(); throw new Error("boom"); }); } catch (e) {}
      check("a transaction that fails halfway leaves nothing behind", get("SELECT COUNT(*) AS n FROM users").n === users);
      let roleBlocked = false; try { db.exec(`UPDATE users SET account_id = 'x' WHERE id = ${alice.id}`); } catch (e) { roleBlocked = true; }
      check("account ids can't be changed", roleBlocked);
    } catch (e) {
      check("self-test ran to the end", false, e.stack || e.message);
    }
    return new Response(JSON.stringify({ passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results }, null, 1),
      { headers: { "content-type": "application/json" } });
  }
}

export default {
  // A brand-new database for every run
  fetch: (req, env) => env.SELFTEST.get(env.SELFTEST.newUniqueId()).fetch(req)
};

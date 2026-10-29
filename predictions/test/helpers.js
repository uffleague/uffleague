// Test setup: an in-memory database, a clock the test moves, and a made-up league (real data.js teams,
// test-only games) that the test can post finals to. Nothing here touches the network or a file database.
import { openDb } from "../db.js";
import { buildLeague, readDataJs } from "../league.js";
import { createTools } from "../server.js";
import { randomBytes } from "node:crypto";

const L = readDataJs();
export const HOUR = 3600 * 1000;
export const T0 = Date.UTC(2026, 10, 1, 18);

export function setup({ config = {} } = {}) {
  const clock = { t: T0 };
  const saved = {
    schedule: [{ week: 1, series: 1, games: [
      { id: "T-1", teams: ["OLY", "CR"], at: T0 + 10 * HOUR },
      { id: "T-2", teams: ["NO", "TOR"], at: T0 + 10 * HOUR },
      { id: "T-3", teams: ["BAL", "SJS"] }
    ] }],
    results: []
  };
  const db = openDb(":memory:");
  const league = { mode: "live", label: "", get: async () => ({ ok: true, source: "live", fetchedAt: clock.t, error: null, view: buildLeague(L, saved) }) };
  const cfg = { startBalance: 1000, defaultStake: 50, maxStake: 100, minLeaderboard: 2, sessionDays: 7, sessionIdleHours: 24, pepper: randomBytes(32), ...config };
  const tools = createTools({ db, league, config: cfg, now: () => clock.t });
  const { service, auth } = tools;
  // The admin is an ordinary account made the first Super Admin (the accounts tool's bootstrap), then signed in with
  // its PIN and unlocked with its admin password: the same path a real admin takes
  const signedIn = (name, pin, role = null, password = "adminpass1234") => {
    auth.createAccount({ username: name, pin, confirmPin: pin, ip: `test:${name}` });
    if (role === "super_admin") auth.bootstrapSuperAdmin(name, password);
    else if (role) { db.prepare("UPDATE users SET role = ?, role_granted_at = ? WHERE username = ?").run(role, clock.t, name); auth.setAdminPassword(name, password); }
    const { token } = auth.signIn({ username: name, pin, ip: `test:${name}` });
    if (role) auth.elevate({ token, user: auth.sessionUser(token), password, ip: `test:${name}` });
    return { token, user: auth.sessionUser(token) };
  };
  const boss = signedIn("boss", "86420", "super_admin");
  const admin = boss.user;
  // Each test account signs up from its own address, so the per-address sign-up limit stays out of the way
  // (one argument only: tests call ["a", "b"].map(s.user))
  const user = (name) => auth.createAccount({ username: name, pin: "13579", confirmPin: "13579", ip: `test:${name}` }).user;
  const post = (id, score, box = null) => saved.results.push({ id, score, box });
  const ledgerSum = (userId) => db.prepare("SELECT COALESCE(SUM(delta), 0) AS s FROM ledger WHERE user_id = ?").get(userId).s;
  const balance = (userId) => db.prepare("SELECT balance FROM users WHERE id = ?").get(userId).balance;
  return { db, clock, saved, ...tools, adminTools: tools.admin, admin, bossToken: boss.token, signedIn, user, post, ledgerSum, balance, cfg };
}

export const ouInput = (over = {}) => ({ kind: "player_ou", gameId: "T-2", player: "biglester1", playerTeam: "New Orleans Raiders",
  statKey: "pass_yds", line: 500, closesAt: T0 + 9 * HOUR, ...over });
export const gwInput = (over = {}) => ({ kind: "game_winner", gameId: "T-1", closesAt: T0 + 9 * HOUR, ...over });

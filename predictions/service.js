// UFF Predictions on the local database: picks, settlement and market admin.
// Picks are free: making one never costs points, a wrong one never loses any, and a correct one earns the market's
// points. Every balance change goes through ledger.js in the same transaction as the change itself, and the client
// never sends a balance, an outcome or a stat: those come from the database and the league data (league.js).
import { tx } from "./txn.js";
import * as core from "./core.js";
import { createLedger } from "./ledger.js";
import { createAudit } from "./audit.js";
import { need, plays } from "./roles.js";

import { HttpError } from "./errors.js";
export { HttpError };
const fail = (status, message) => { throw new HttpError(status, message); };

const text = (v, max) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : "");

// Accounts and sign-in are in auth.js; this only reads the users table
export function createService({ db, league, config, now = Date.now }) {
  const stmts = new Map();
  const st = (sql) => { if (!stmts.has(sql)) stmts.set(sql, db.prepare(sql)); return stmts.get(sql); };
  const get = (sql, ...a) => st(sql).get(...a);
  const all = (sql, ...a) => st(sql).all(...a);
  const run = (sql, ...a) => st(sql).run(...a);

  const ledger = createLedger({ db, now });
  const auditLogger = createAudit({ db, now });
  const audit = (userId, action, marketId, detail) => auditLogger.log({ actorId: userId, action: `market.${action}`, marketId, detail: detail ?? {} });
  const addLedger = (userId, delta, kind, { marketId = null, predictionId = null, round = 0, note = null, actorId = null } = {}) =>
    ledger.post({ userId, delta, kind, marketId, predictionId, round, note, actorId, allowNegative: kind === "reversal" });
  // What a settled pick gives back. Free picks (all picks since migration 003): the market's points if correct.
  // Picks made before then held points ("stake"): those pay double if correct and give the points back on a push or void.
  const paidFor = (p, result) => (p.mode === "free" ? (result === "won" ? p.stake : 0) : core.payoutFor(result, p.stake));

  const publicUser = (u) => u && { id: u.id, accountId: u.account_id, username: u.username, role: u.role, isAdmin: u.role === "admin" || u.role === "super_admin",
    isStaff: u.role !== "user", balance: u.balance, createdAt: u.created_at };
  const needAdmin = (u) => need(u, "markets.manage");

  /* ---------- Market views ---------- */

  const counts = (marketId) => Object.fromEntries(all("SELECT selection, COUNT(*) AS n FROM predictions WHERE market_id = ? GROUP BY selection", marketId).map((r) => [r.selection, r.n]));
  const currentResolution = (m) => get("SELECT * FROM resolutions WHERE market_id = ? AND reversed_at IS NULL ORDER BY round DESC LIMIT 1", m.id);

  function teamInfo(view, name) {
    const t = view.team(name);
    return { name, code: (t && t.code) || "", logo: (t && t.logo) || "", color: (t && t.color) || "", color2: (t && t.color2) || "",
      record: t ? { w: t.w, l: t.l } : null };
  }

  function marketView(m, view, userId) {
    const status = core.effectiveStatus(m, now());
    const opts = core.optionsFor(m);
    const split = core.communitySplit(counts(m.id), opts.map((o) => o.key));
    const g = view.game(m.game_id);
    const res = currentResolution(m);
    const mine = userId ? get("SELECT selection, stake, result, created_at, settled_at FROM predictions WHERE market_id = ? AND user_id = ?", m.id, userId) : null;
    const stat = m.stat_key && core.STATS[m.stat_key];
    return {
      id: m.id, kind: m.kind, kindLabel: core.KINDS[m.kind], gameId: m.game_id, week: m.game_week,
      teams: [teamInfo(view, m.team_a), teamInfo(view, m.team_b)],
      kickoffAt: m.kickoff_at, gameTime: (g && g.time) || "", sample: !!m.demo,
      player: m.player, playerTeam: m.player_team ? teamInfo(view, m.player_team) : null,
      stat: stat ? { key: m.stat_key, label: stat.label, short: stat.short } : null,
      line: m.line, pushPossible: m.kind === "player_ou" && core.lineHasPush(m.line),
      stake: m.stake, opensAt: m.opens_at, closesAt: m.closes_at, status, hold: m.hold, storedStatus: m.status,
      options: opts.map((o) => ({ ...o, ...split.options.find((s) => s.key === o.key) })), total: split.total,
      rules: core.rulesFor(m),
      resolution: res && { outcome: res.outcome, value: res.stat_value, score: res.score_a == null ? null : [res.score_a, res.score_b],
        source: res.source, note: res.note, at: res.at },
      mine: mine && { selection: mine.selection, stake: mine.stake, result: mine.result, createdAt: mine.created_at, settledAt: mine.settled_at }
    };
  }

  async function view() {
    const l = await league.get();
    return l;
  }
  const leagueInfo = (l) => ({ ok: l.ok, source: l.source, fetchedAt: l.fetchedAt, error: l.error, label: league.label || "" });

  async function listMarkets({ userId = null, kind = "", status = "", q = "", sort = "closing" } = {}) {
    const l = await view();
    let list = all("SELECT * FROM markets").map((m) => marketView(m, l.view, userId));
    if (kind) list = list.filter((m) => m.kind === kind);
    if (status === "completed") list = list.filter((m) => m.status === "resolved" || m.status === "void");
    else if (status) list = list.filter((m) => m.status === status);
    const needle = String(q).trim().toLowerCase();
    if (needle) list = list.filter((m) => [m.player, m.gameId, m.stat && m.stat.label, ...m.teams.flatMap((t) => [t.name, t.code])]
      .some((s) => s && String(s).toLowerCase().includes(needle)));
    const sorts = {
      closing: (a, b) => a.closesAt - b.closesAt,
      popular: (a, b) => b.total - a.total || a.closesAt - b.closesAt,
      newest: (a, b) => b.id - a.id,
      kickoff: (a, b) => (a.kickoffAt ?? Infinity) - (b.kickoffAt ?? Infinity) || a.closesAt - b.closesAt
    };
    list.sort(sorts[sort] || sorts.closing);
    return { league: leagueInfo(l), markets: list };
  }

  async function getMarket(id, userId = null) {
    const m = get("SELECT * FROM markets WHERE id = ?", Number(id));
    if (!m) fail(404, "That market doesn't exist.");
    const l = await view();
    const out = marketView(m, l.view, userId);
    const keys = out.options.map((o) => o.key);
    out.history = all("SELECT at, total, counts FROM snapshots WHERE market_id = ? ORDER BY at, id", m.id).map((s) => {
      const split = core.communitySplit(JSON.parse(s.counts), keys);
      return { at: s.at, total: split.total, pct: split.options.map((o) => o.pct) };
    });
    if (m.kind === "player_ou") {
      const games = l.view.history([m.player, ...JSON.parse(m.player_names || "[]")], m.stat_key).filter((g) => g.gameId !== m.game_id);
      const vals = games.map((g) => g.value);
      out.stats = {
        games: games.slice(-8),
        played: vals.length,
        average: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
        high: vals.length ? Math.max(...vals) : null,
        over: vals.filter((v) => v > m.line).length,
        under: vals.filter((v) => v < m.line).length,
        at: vals.filter((v) => v === m.line).length
      };
    } else {
      out.stats = {
        teams: [m.team_a, m.team_b].map((name) => l.view.games.filter((g) => g.final && g.id !== m.game_id && g.teams.includes(name)).slice(-5).map((g) => {
          const i = g.teams.indexOf(name);
          return { gameId: g.id, week: g.week, opponent: g.teams[1 - i], score: [g.score[i], g.score[1 - i]], result: g.score[i] > g.score[1 - i] ? "W" : g.score[i] < g.score[1 - i] ? "L" : "T" };
        }))
      };
    }
    return { league: leagueInfo(l), market: out };
  }

  /* ---------- Picks ---------- */

  function predict(user, marketId, selection) {
    if (!user) fail(401, "Sign in to make a pick.");
    if (!plays(user)) fail(403, "Staff and admin accounts run the markets, so they can't make picks.");
    return tx(db, () => {
      const m = get("SELECT * FROM markets WHERE id = ?", Number(marketId));
      if (!m) fail(404, "That market doesn't exist.");
      const status = core.effectiveStatus(m, now());
      if (status === "upcoming") fail(409, "This market isn't open for picks yet.");
      if (status !== "open") fail(409, "Picks for this market are closed.");
      if (!core.optionsFor(m).some((o) => o.key === selection)) fail(400, "That isn't one of this market's choices.");
      if (get("SELECT id FROM predictions WHERE market_id = ? AND user_id = ?", m.id, user.id)) fail(409, "You already made a pick on this market. Picks can't be changed.");
      // Free: nothing comes off the balance. stake = the points this pick earns if it's correct.
      const { lastInsertRowid } = run("INSERT INTO predictions (market_id, user_id, selection, stake, created_at, mode) VALUES (?, ?, ?, ?, ?, 'free')",
        m.id, user.id, selection, m.stake, now());
      const predictionId = Number(lastInsertRowid);
      const c = counts(m.id);
      run("INSERT INTO snapshots (market_id, at, total, counts) VALUES (?, ?, ?, ?)", m.id, now(), Object.values(c).reduce((a, b) => a + b, 0), JSON.stringify(c));
      return { predictionId };
    });
  }

  /* ---------- Admin: markets ---------- */

  function checkTimes(closesAt, opensAt, kickoffAt) {
    if (!Number.isFinite(closesAt)) fail(400, "Set a closing time.");
    if (closesAt <= now()) fail(400, "The closing time has to be in the future.");
    if (kickoffAt != null && closesAt > kickoffAt) fail(400, "Picks have to close by kickoff.");
    if (opensAt != null && !(Number.isFinite(opensAt) && opensAt < closesAt)) fail(400, "The opening time has to be before the closing time.");
  }
  const numOrNull = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

  async function createMarket(admin, input = {}) {
    needAdmin(admin);
    const l = await view();
    if (!l.ok) fail(503, `League data isn't available right now (${l.error || "no answer"}), so markets can't be made.`);
    const g = l.view.game(String(input.gameId || ""));
    if (!g) fail(400, "That game isn't on the schedule.");
    if (g.final) fail(400, "That game is already final.");
    const kind = input.kind;
    if (!core.KINDS[kind]) fail(400, "Pick Player Over/Under or Game Winner.");
    const closesAt = Number(input.closesAt), opensAt = numOrNull(input.opensAt);
    checkTimes(closesAt, opensAt, g.at);
    const stake = input.stake == null || input.stake === "" ? config.defaultStake : Number(input.stake);
    if (!Number.isInteger(stake) || stake < 1 || stake > config.maxStake) fail(400, `Points per pick are 1-${config.maxStake}.`);
    let player = null, playerTeam = null, statKey = null, line = null, names = [];
    if (kind === "player_ou") {
      player = text(input.player, 40);
      if (!player) fail(400, "Pick a player.");
      playerTeam = String(input.playerTeam || "");
      if (!g.teams.includes(playerTeam)) fail(400, "The player's team has to be one of the two teams in that game.");
      statKey = String(input.statKey || "");
      if (!core.STATS[statKey]) fail(400, "Pick a stat UFF box scores keep.");
      line = Number(input.line);
      if (!core.validLine(line)) fail(400, "The line has to be 0 or more, a whole number or ending in .5.");
      names = [...new Set([].concat(input.playerNames || []).map((n) => text(n, 40)).filter(Boolean))].slice(0, 30);
    }
    const dup = all("SELECT * FROM markets WHERE kind = ? AND game_id = ? AND status <> 'void'", kind, g.id).find((m) =>
      kind === "game_winner" || (m.player.toLowerCase() === player.toLowerCase() && m.stat_key === statKey && m.line === line));
    if (dup) fail(409, `That market already exists (#${dup.id}).`);
    const status = opensAt != null && opensAt > now() ? "upcoming" : "open";
    return tx(db, () => {
      const { lastInsertRowid } = run(`INSERT INTO markets (kind, game_id, game_week, team_a, team_b, kickoff_at, player, player_team, player_names, stat_key, line,
        stake, opens_at, closes_at, status, demo, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        kind, g.id, g.week ?? null, g.teams[0], g.teams[1], g.at ?? null, player, playerTeam, JSON.stringify(names), statKey, line,
        stake, opensAt, closesAt, status, l.source === "demo" ? 1 : 0, admin.id, now(), now());
      const id = Number(lastInsertRowid);
      audit(admin.id, "create", id, { kind, gameId: g.id, player, statKey, line, stake, opensAt, closesAt, status });
      return { id };
    });
  }

  // A Game Winner market for every unplayed game in one series. Games that already have one are skipped, and a game
  // whose kickoff comes before the closing time closes at kickoff.
  async function createSeriesWinners(admin, input = {}) {
    needAdmin(admin);
    const l = await view();
    if (!l.ok) fail(503, `League data isn't available right now (${l.error || "no answer"}), so markets can't be made.`);
    const series = Number(input.series), closesAt = Number(input.closesAt);
    const games = l.view.games.filter((g) => g.series === series && !g.final);
    if (!games.length) fail(400, "That series has no unplayed games.");
    checkTimes(closesAt, null, null);
    const created = [], skipped = [];
    for (const g of games) {
      if (get("SELECT id FROM markets WHERE kind = 'game_winner' AND game_id = ? AND status <> 'void'", g.id)) { skipped.push({ gameId: g.id, why: "already has one" }); continue; }
      if (g.at != null && g.at <= now()) { skipped.push({ gameId: g.id, why: "already kicked off" }); continue; }
      const { id } = await createMarket(admin, { kind: "game_winner", gameId: g.id, stake: input.stake, closesAt: g.at != null ? Math.min(closesAt, g.at) : closesAt });
      created.push(id);
    }
    return { series, created, skipped };
  }

  function marketFor(id) {
    const m = get("SELECT * FROM markets WHERE id = ?", Number(id));
    if (!m) fail(404, "That market doesn't exist.");
    return m;
  }
  const done = (m) => m.status === "resolved" || m.status === "void";

  function editMarket(admin, id, changes = {}) {
    needAdmin(admin);
    return tx(db, () => {
      const m = marketFor(id);
      if (done(m)) fail(409, "A settled or void market can't be edited.");
      const picks = get("SELECT COUNT(*) AS n FROM predictions WHERE market_id = ?", m.id).n;
      const next = { ...m };
      if ("closesAt" in changes) next.closes_at = Number(changes.closesAt);
      if ("opensAt" in changes) next.opens_at = numOrNull(changes.opensAt);
      for (const [k, col] of [["line", "line"], ["stake", "stake"], ["statKey", "stat_key"]]) {
        if (!(k in changes)) continue;
        const v = k === "statKey" ? String(changes[k]) : Number(changes[k]);
        if (v === m[col]) continue;
        if (picks) fail(409, "This market already has picks, so its line, stat and points can't change. Void it and make a new one.");
        next[col] = v;
      }
      if (m.kind === "player_ou" && !core.validLine(next.line)) fail(400, "The line has to be 0 or more, a whole number or ending in .5.");
      if (m.kind === "player_ou" && !core.STATS[next.stat_key]) fail(400, "Pick a stat UFF box scores keep.");
      if (!Number.isInteger(next.stake) || next.stake < 1 || next.stake > config.maxStake) fail(400, `Points per pick are 1-${config.maxStake}.`);
      if (next.closes_at !== m.closes_at || next.opens_at !== m.opens_at) checkTimes(next.closes_at, next.opens_at, m.kickoff_at);
      if (m.status === "upcoming" && (next.opens_at == null || next.opens_at <= now())) next.status = "open";
      const changed = ["closes_at", "opens_at", "line", "stake", "stat_key", "status"].filter((k) => next[k] !== m[k]);
      if (!changed.length) return { id: m.id, changed: [] };
      run("UPDATE markets SET closes_at = ?, opens_at = ?, line = ?, stake = ?, stat_key = ?, status = ?, updated_at = ? WHERE id = ?",
        next.closes_at, next.opens_at, next.line, next.stake, next.stat_key, next.status, now(), m.id);
      audit(admin.id, "edit", m.id, Object.fromEntries(changed.map((k) => [k, { from: m[k], to: next[k] }])));
      return { id: m.id, changed };
    });
  }

  // Takes back a settlement's payouts and refunds (a dispute or a void after settling): every pick goes back to pending
  function reverseSettlement(m, adminId, note) {
    all("SELECT * FROM predictions WHERE market_id = ? AND result <> 'pending'", m.id).forEach((p) => {
      const paid = paidFor(p, p.result);
      if (paid) addLedger(p.user_id, -paid, "reversal", { marketId: m.id, predictionId: p.id, round: m.settlement_round, note });
      run("UPDATE predictions SET result = 'pending', settled_at = NULL WHERE id = ?", p.id);
    });
    run("UPDATE resolutions SET reversed_at = ?, reversed_note = ? WHERE market_id = ? AND round = ?", now(), note, m.id, m.settlement_round);
    audit(adminId, "reverse", m.id, { round: m.settlement_round, note });
  }

  function setState(admin, id, action, note = "") {
    needAdmin(admin);
    const why = text(note, 300);
    return tx(db, () => {
      const m = marketFor(id);
      if (done(m) && action !== "dispute") fail(409, "This market is already settled or void.");
      if (action === "open") {
        if (m.hold === "disputed") fail(409, "Settle or void a disputed market; it can't reopen.");
        if (m.closes_at <= now()) fail(409, "Its closing time has passed. Set a later closing time first.");
        run("UPDATE markets SET status = 'open', hold = NULL, opens_at = CASE WHEN opens_at > ? THEN NULL ELSE opens_at END, updated_at = ? WHERE id = ?", now(), now(), m.id);
      } else if (action === "lock") {
        run("UPDATE markets SET status = 'locked', updated_at = ? WHERE id = ?", now(), m.id);
      } else if (action === "postpone") {
        run("UPDATE markets SET hold = 'postponed', updated_at = ? WHERE id = ?", now(), m.id);
      } else if (action === "dispute") {
        if (m.status === "void") fail(409, "A void market can't be disputed.");
        if (!why) fail(400, "Say what's disputed.");
        if (m.status === "resolved") reverseSettlement(m, admin.id, why);
        run("UPDATE markets SET status = 'locked', hold = 'disputed', updated_at = ? WHERE id = ?", now(), m.id);
      } else if (action === "clearHold") {
        if (!m.hold) fail(409, "This market isn't on hold.");
        run("UPDATE markets SET hold = NULL, updated_at = ? WHERE id = ?", now(), m.id);
      } else {
        fail(400, "Unknown action.");
      }
      audit(admin.id, action, m.id, why ? { note: why } : {});
      return { id: m.id };
    });
  }

  /* ---------- Admin: settling ---------- */

  // What the league data says right now; nothing is saved
  async function preview(admin, id) {
    needAdmin(admin);
    const m = marketFor(id);
    const l = await view();
    return { league: leagueInfo(l), ...outcomeFromLeague(m, l) };
  }

  function outcomeFromLeague(m, l) {
    if (!l.ok) return { ready: false, reason: `League data isn't available (${l.error || "no answer"}).` };
    const g = l.view.game(m.game_id);
    if (!g) return { ready: false, reason: "That game isn't on the schedule anymore. Void the market if it was canceled." };
    if (!g.final) return { ready: false, reason: "No final score has been posted for this game yet." };
    const source = l.source === "demo" ? "demo_result" : "box_score";
    if (m.kind === "game_winner") {
      return { ready: true, outcome: core.winnerOutcome(g.score), score: g.score, source,
        reason: `Final: ${g.teams[0]} ${g.score[0]}-${g.score[1]} ${g.teams[1]}.` };
    }
    if (!g.box) return { ready: false, reason: "The game is final but has no box score, so this can only be settled by hand (with a note) or voided." };
    const r = core.playerStatFromBox(g.box, l.view.nameSet([m.player, ...JSON.parse(m.player_names || "[]")]), m.stat_key);
    if (!r.played) return { ready: true, outcome: "void", source, reason: `${m.player} isn't in this game's box score (didn't play), so the market voids.` };
    const stat = core.STATS[m.stat_key];
    return { ready: true, outcome: core.overUnderOutcome(r.value, m.line), value: r.value, score: g.score, source,
      reason: `Box score: ${m.player} had ${r.value} ${stat.label.toLowerCase()} (line ${core.fmtLine(m.line)}).` };
  }

  function settle(m, adminId, outcome, { value = null, score = null, source, note = null }) {
    const round = m.settlement_round + 1;
    all("SELECT * FROM predictions WHERE market_id = ? AND result = 'pending'", m.id).forEach((p) => {
      const result = outcome === "push" ? "push" : p.selection === outcome ? "won" : "lost";
      run("UPDATE predictions SET result = ?, settled_at = ? WHERE id = ?", result, now(), p.id);
      const paid = paidFor(p, result);
      if (paid) addLedger(p.user_id, paid, result === "won" ? "payout" : "refund", { marketId: m.id, predictionId: p.id, round, actorId: adminId,
        note: result === "won" ? "Correct pick" : "Push: points back" });
    });
    run(`INSERT INTO resolutions (market_id, round, outcome, stat_value, score_a, score_b, source, note, by_user, at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, m.id, round, outcome, value, score ? score[0] : null, score ? score[1] : null, source, note, adminId, now());
    run("UPDATE markets SET status = 'resolved', hold = NULL, settlement_round = ?, updated_at = ? WHERE id = ?", round, now(), m.id);
    audit(adminId, "resolve", m.id, { outcome, value, score, source, note, round });
  }

  function voidIn(m, adminId, note) {
    if (m.status === "resolved") { reverseSettlement(m, adminId, `Voided: ${note}`); m = marketFor(m.id); }
    const round = m.settlement_round + 1;
    all("SELECT * FROM predictions WHERE market_id = ? AND result = 'pending'", m.id).forEach((p) => {
      run("UPDATE predictions SET result = 'void', settled_at = ? WHERE id = ?", now(), p.id);
      if (p.mode === "stake") addLedger(p.user_id, p.stake, "refund", { marketId: m.id, predictionId: p.id, round, actorId: adminId, note: "Market void: points back" });
    });
    run("INSERT INTO resolutions (market_id, round, outcome, source, note, by_user, at) VALUES (?, ?, 'void', 'void', ?, ?, ?)", m.id, round, note, adminId, now());
    run("UPDATE markets SET status = 'void', hold = NULL, settlement_round = ?, updated_at = ? WHERE id = ?", round, now(), m.id);
    audit(adminId, "void", m.id, { note, round });
  }

  // Settling twice does nothing the second time: a settled market answers { already: true }
  async function resolve(admin, id, input = {}) {
    needAdmin(admin);
    const before = marketFor(id);
    const auto = input.mode !== "manual";
    const found = auto ? outcomeFromLeague(before, await view()) : null;
    return tx(db, () => {
      const m = marketFor(id);
      if (done(m)) return { id: m.id, already: true, status: m.status };
      if (core.effectiveStatus(m, now()) !== "locked") fail(409, "Picks are still open. Lock the market (or wait for it to close) before settling it.");
      if (auto) {
        if (!found.ready) fail(409, found.reason);
        if (found.outcome === "void") { voidIn(m, admin.id, found.reason); return { id: m.id, status: "void" }; }
        settle(m, admin.id, found.outcome, { value: found.value ?? null, score: found.score || null, source: found.source, note: found.reason });
        return { id: m.id, status: "resolved", outcome: found.outcome };
      }
      const note = text(input.note, 300);
      if (note.length < 5) fail(400, "Settling by hand needs a note saying where the result came from.");
      if (m.kind === "player_ou") {
        const value = Number(input.value);
        if (input.value === "" || input.value == null || !Number.isFinite(value) || value < 0) fail(400, "Enter the player's final stat.");
        const outcome = core.overUnderOutcome(value, m.line);
        settle(m, admin.id, outcome, { value, source: "manual", note });
        return { id: m.id, status: "resolved", outcome };
      }
      const score = [Number(input.scoreA), Number(input.scoreB)];
      if (score.some((n) => !Number.isInteger(n) || n < 0) || [input.scoreA, input.scoreB].some((v) => v === "" || v == null)) fail(400, "Enter both final scores.");
      const outcome = core.winnerOutcome(score);
      settle(m, admin.id, outcome, { score, source: "manual", note });
      return { id: m.id, status: "resolved", outcome };
    });
  }

  function voidMarket(admin, id, note) {
    needAdmin(admin);
    const why = text(note, 300);
    if (why.length < 3) fail(400, "Say why the market is void (for example: game canceled).");
    return tx(db, () => {
      const m = marketFor(id);
      if (m.status === "void") return { id: m.id, already: true, status: "void" };
      voidIn(m, admin.id, why);
      return { id: m.id, status: "void" };
    });
  }

  // Voids every Game Winner market in one series that isn't settled yet (picks on them are voided too).
  // Settled ones are left alone; posting the series again makes new markets.
  async function voidSeriesWinners(admin, input = {}) {
    needAdmin(admin);
    const l = await view();
    if (!l.ok) fail(503, `League data isn't available right now (${l.error || "no answer"}).`);
    const series = Number(input.series);
    const ids = new Set(l.view.games.filter((g) => g.series === series).map((g) => g.id));
    const list = all("SELECT id, game_id FROM markets WHERE kind = 'game_winner' AND status NOT IN ('void', 'resolved')").filter((m) => ids.has(m.game_id));
    if (!list.length) fail(400, `Series ${series} has no Game Winner markets to remove.`);
    list.forEach((m) => voidMarket(admin, m.id, `Series ${series} Game Winner markets removed by an admin`));
    return { series, removed: list.length };
  }

  /* ---------- Demo mode: sample finals ---------- */

  async function postDemoResult(admin, input = {}) {
    needAdmin(admin);
    if (league.mode !== "demo") fail(403, "Sample results can only be posted in demo mode.");
    const l = await view();
    const g = l.view.game(String(input.gameId || ""));
    if (!g || !g.sample) fail(400, "That isn't one of the sample games.");
    const score = [Number(input.scoreA), Number(input.scoreB)];
    if (score.some((n) => !Number.isInteger(n) || n < 0 || n > 999)) fail(400, "Enter both final scores.");
    if (get("SELECT id FROM markets WHERE game_id = ? AND status = 'resolved'", g.id)) fail(409, "A market on this game is already settled; dispute it first to change the result.");
    const box = [{}, {}];
    [].concat(input.lines || []).slice(0, 60).forEach((ln) => {
      const stat = core.STATS[ln && ln.statKey];
      const player = text(ln && ln.player, 40);
      const value = Number(ln && ln.value);
      if (!stat || !player || !Number.isFinite(value) || value < 0) fail(400, "Each stat line needs a player, a stat and a number.");
      const side = box[Number(ln.side) === 1 ? 1 : 0];
      const rows = (side[stat.cat] = side[stat.cat] || []);
      let row = rows.find((r) => r.player.toLowerCase() === player.toLowerCase());
      if (!row) rows.push((row = { player }));
      row[stat.field] = value;
    });
    run(`INSERT INTO demo_results (game_id, score_a, score_b, box, by_user, at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(game_id) DO UPDATE SET score_a = excluded.score_a, score_b = excluded.score_b, box = excluded.box, by_user = excluded.by_user, at = excluded.at`,
      g.id, score[0], score[1], JSON.stringify(box), admin.id, now());
    audit(admin.id, "demoResult", null, { gameId: g.id, score, box });
    return { gameId: g.id, score };
  }

  /* ---------- People ---------- */

  function boardRows() {
    return all(`SELECT u.id, u.username, u.balance, COUNT(p.id) AS picks,
        COALESCE(SUM(CASE WHEN p.result = 'pending' AND p.mode = 'stake' THEN p.stake ELSE 0 END), 0) AS inPlay,
        COALESCE(SUM(p.result = 'won'), 0) AS won, COALESCE(SUM(p.result = 'lost'), 0) AS lost
      FROM users u LEFT JOIN predictions p ON p.user_id = u.id WHERE u.role = 'user' AND u.status = 'active' GROUP BY u.id`);
  }

  function leaderboard() {
    const rows = boardRows();
    return {
      minSettled: config.minLeaderboard,
      accuracy: core.rankAccuracy(rows, config.minLeaderboard).map(({ rank, username, won, lost, accuracy }) => ({ rank, username, won, lost, accuracy })),
      // Separate from accuracy on purpose: a big balance doesn't mean good picks. Ranked by points including
      // those riding on unsettled picks, so making picks doesn't drop anyone down the list.
      points: rows.filter((r) => r.picks).map((r) => ({ ...r, total: r.balance + r.inPlay }))
        .sort((a, b) => b.total - a.total || a.username.localeCompare(b.username))
        .map(({ username, balance, inPlay, total, picks }, i) => ({ rank: i + 1, username, balance, inPlay, total, picks }))
    };
  }

  // Only ever the signed-in person's own picks and ledger
  async function dashboard(user) {
    if (!user) fail(401, "Sign in to see your predictions.");
    const u = get("SELECT * FROM users WHERE id = ?", user.id);
    const l = await view();
    const picks = all(`SELECT p.*, m.id AS mid FROM predictions p JOIN markets m ON m.id = p.market_id WHERE p.user_id = ? ORDER BY p.created_at DESC, p.id DESC`, u.id);
    const items = picks.map((p) => ({ ...marketView(get("SELECT * FROM markets WHERE id = ?", p.mid), l.view, u.id) }));
    const record = core.userRecord(picks);
    const board = leaderboard();
    const mine = board.accuracy.find((r) => r.username === u.username);
    return {
      league: leagueInfo(l),
      user: publicUser(u),
      record,
      rank: mine ? { rank: mine.rank, of: board.accuracy.length } : null,
      minSettled: config.minLeaderboard,
      active: items.filter((m) => m.mine.result === "pending"),
      completed: items.filter((m) => m.mine.result !== "pending"),
      ledger: all("SELECT at, delta, balance_after, kind, market_id, note FROM ledger WHERE user_id = ? ORDER BY id", u.id)
        .map((r) => ({ at: r.at, delta: r.delta, balance: r.balance_after, kind: r.kind, marketId: r.market_id, note: r.note }))
    };
  }

  // Market history (the full log is on UFF Admin -> Audit Logs)
  function auditLog(admin, { marketId = null, limit = 200 } = {}) {
    needAdmin(admin);
    const { rows } = auditLogger.list(marketId ? { targetType: "market", targetId: String(Number(marketId)), limit } : { action: "market.", limit });
    return rows.map((r) => ({ ...r, action: r.action.replace(/^market\./, "") }));
  }

  // Market cards for challenge legs (the same view the market pages use), by id
  async function marketsByIds(ids, userId = null) {
    const l = await view();
    const out = new Map();
    [...new Set(ids)].forEach((id) => { const m = get("SELECT * FROM markets WHERE id = ?", id); if (m) out.set(id, marketView(m, l.view, userId)); });
    return out;
  }

  // Games a market can be made on (not final yet), with players seen in each team's box scores
  async function games(admin) {
    needAdmin(admin);
    const l = await view();
    const seen = new Map();
    l.view.games.filter((g) => g.final && g.box).forEach((g) => g.box.forEach((side, i) => Object.values(side || {}).forEach((rows) => [].concat(rows).forEach((r) => {
      if (!r || !r.player) return;
      const team = g.teams[i];
      if (!seen.has(team)) seen.set(team, new Set());
      seen.get(team).add(l.view.alias(r.player));
    }))));
    const marketsOn = new Map(all("SELECT game_id, COUNT(*) AS n FROM markets WHERE status <> 'void' GROUP BY game_id").map((r) => [r.game_id, r.n]));
    return {
      league: leagueInfo(l),
      stats: Object.entries(core.STATS).map(([key, s]) => ({ key, label: s.label })),
      defaultStake: config.defaultStake, maxStake: config.maxStake,
      games: l.view.games.filter((g) => !g.final).map((g) => ({
        id: g.id, week: g.week, series: g.series ?? null, at: g.at, time: g.time, sample: !!g.sample, markets: marketsOn.get(g.id) || 0,
        teams: g.teams.map((name) => ({ ...teamInfo(l.view, name), players: [...(seen.get(name) || [])].sort((a, b) => a.localeCompare(b)) }))
      })),
      sampleGames: l.source === "demo" ? l.view.games.filter((g) => g.sample).map((g) => ({ id: g.id, teams: g.teams, final: g.final, score: g.score || null })) : []
    };
  }

  return { listMarkets, getMarket, predict, createMarket, createSeriesWinners, voidSeriesWinners, editMarket, setState, preview, resolve,
    voidMarket, postDemoResult, leaderboard, dashboard, auditLog, games, marketsByIds };
}

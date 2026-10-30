// Multi-pick challenges: staff bundle existing markets (Game Winner, Player Over/Under) into one challenge, people
// answer every leg before the deadline, and each entry earns fixed points when the last leg settles.
// Free to enter: nothing is ever taken from anyone's points, and a wrong leg just earns nothing.
// Each leg IS a market (challenge_legs.market_id), so teams, players, lines and results come from that market.
import { tx } from "./txn.js";
import { HttpError } from "./errors.js";
import { need, can, plays } from "./roles.js";
import * as core from "./core.js";

const fail = (status, message) => { throw new HttpError(status, message); };
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const MAX_LEGS = 10, MAX_PER_LEG = 1000, MAX_BONUS = 5000;

// The published rules, worded from the challenge's own numbers (shown before anyone enters)
export function challengeRules(c) {
  const per = c.points_per_leg ?? c.pointsPerLeg, bonus = c.perfect_bonus ?? c.perfectBonus;
  return [
    "Free to enter. Nothing is ever taken from your points, and a wrong answer just earns nothing.",
    "Answer every leg before the entry deadline. You can change your answers until then; after that your entry is locked.",
    per ? `Each correct leg earns ${per} points.` : "Correct legs on their own earn no points; only a perfect entry does.",
    bonus ? `Get every leg that counts right (at least two) and earn a ${bonus}-point bonus on top.` : "There's no bonus for a perfect entry.",
    "Each leg settles with its market's official result. A leg whose market is voided, or ends in a push, doesn't count either way.",
    "If every leg is void, the challenge awards nothing. If the challenge is cancelled, no points are given or taken.",
    "Points are added once, when the last leg has settled. One entry per account."
  ];
}

export function createChallenges({ db, service, ledger, audit, limiter, now = Date.now }) {
  const get = (sql, ...a) => db.prepare(sql).get(...a);
  const all = (sql, ...a) => db.prepare(sql).all(...a);
  const run = (sql, ...a) => db.prepare(sql).run(...a);

  const byId = (id) => {
    const c = get("SELECT * FROM challenges WHERE id = ?", Number(id));
    if (!c) fail(404, "That challenge doesn't exist.");
    return c;
  };
  const legsOf = (id) => all("SELECT * FROM challenge_legs WHERE challenge_id = ? ORDER BY position, id", id);
  const canManage = (user, c) => can(user, "challenges.manage_all") || (can(user, "challenges.manage_own") && c.owner_id === user.id);
  const needManage = (user, c) => {
    need(user, "challenges.manage_own");
    if (!canManage(user, c)) fail(403, "Staff can only manage challenges they made.");
  };

  /* ---------- Building ---------- */

  function checkFields(input, { publishing = false } = {}) {
    const title = text(input.title, 80);
    if (title.length < 3) fail(400, "Give the challenge a title (3-80 characters).");
    const description = text(input.description, 600);
    const deadline = Number(input.entryDeadline);
    if (!Number.isFinite(deadline)) fail(400, "Set an entry deadline.");
    if (deadline <= now()) fail(400, "The entry deadline has to be in the future.");
    const per = Number(input.pointsPerLeg ?? 0), bonus = Number(input.perfectBonus ?? 0);
    if (!Number.isInteger(per) || per < 0 || per > MAX_PER_LEG) fail(400, `Points per correct leg are 0-${MAX_PER_LEG}.`);
    if (!Number.isInteger(bonus) || bonus < 0 || bonus > MAX_BONUS) fail(400, `The perfect-entry bonus is 0-${MAX_BONUS}.`);
    if (per + bonus <= 0) fail(400, "Set points per correct leg, a perfect-entry bonus, or both.");
    const legs = [].concat(input.legs || []).map(Number);
    if (legs.some((n) => !Number.isInteger(n) || n <= 0)) fail(400, "Each leg has to be one of the markets.");
    if (new Set(legs).size !== legs.length) fail(400, "A market can only be one leg of a challenge.");
    if (legs.length > MAX_LEGS) fail(400, `A challenge has at most ${MAX_LEGS} legs.`);
    if (publishing && legs.length < 2) fail(400, "A multi-pick challenge needs at least two legs.");
    legs.forEach((id) => {
      const m = get("SELECT * FROM markets WHERE id = ?", id);
      if (!m) fail(400, `Market #${id} doesn't exist.`);
      if (m.status === "void" || m.status === "resolved") fail(400, `Market #${id} is already settled or void.`);
      // Every leg has to stay open for picks until the challenge deadline, so nobody answers a leg after it's decided
      if (m.closes_at < deadline) fail(400, `Market #${id} closes before the challenge deadline. Move the deadline to ${new Date(m.closes_at).toISOString()} or earlier.`);
      if (publishing && m.hold) fail(400, `Market #${id} is on hold (${m.hold}).`);
    });
    return { title, description, deadline, per, bonus, legs };
  }

  const snapshot = (c) => ({ title: c.title, description: c.description, entryDeadline: c.entry_deadline, pointsPerLeg: c.points_per_leg,
    perfectBonus: c.perfect_bonus, status: c.status, legs: legsOf(c.id).map((l) => l.market_id) });
  const setLegs = (id, legs) => {
    run("DELETE FROM challenge_legs WHERE challenge_id = ?", id);
    legs.forEach((marketId, i) => run("INSERT INTO challenge_legs (challenge_id, position, market_id) VALUES (?, ?, ?)", id, i + 1, marketId));
  };

  function create(user, input = {}) {
    need(user, "challenges.manage_own");
    limiter(`admin:${user.id}`, 60, 60000);
    const f = checkFields(input);
    return tx(db, () => {
      const demo = f.legs.some((id) => get("SELECT demo FROM markets WHERE id = ?", id).demo) ? 1 : 0;
      const { lastInsertRowid } = run(`INSERT INTO challenges (title, description, status, entry_deadline, points_per_leg, perfect_bonus, owner_id, demo, created_at, updated_at)
        VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)`, f.title, f.description, f.deadline, f.per, f.bonus, user.id, demo, now(), now());
      const id = Number(lastInsertRowid);
      setLegs(id, f.legs);
      audit.log({ actorId: user.id, action: "challenge.create", targetType: "challenge", targetId: id, detail: { after: snapshot(byId(id)) } });
      return { id };
    });
  }

  // Only drafts change; a published challenge can only be cancelled (so nobody's entry is changed under them)
  function update(user, id, input = {}) {
    const c = byId(id);
    needManage(user, c);
    limiter(`admin:${user.id}`, 60, 60000);
    if (c.status !== "draft") fail(409, "Only drafts can be edited. A published challenge can be cancelled instead.");
    const f = checkFields(input);
    return tx(db, () => {
      const before = snapshot(c);
      run("UPDATE challenges SET title = ?, description = ?, entry_deadline = ?, points_per_leg = ?, perfect_bonus = ?, updated_at = ? WHERE id = ?",
        f.title, f.description, f.deadline, f.per, f.bonus, now(), c.id);
      setLegs(c.id, f.legs);
      audit.log({ actorId: user.id, action: "challenge.edit", targetType: "challenge", targetId: c.id, detail: { before, after: snapshot(byId(c.id)) } });
      return { id: c.id };
    });
  }

  function publish(user, id) {
    const c = byId(id);
    needManage(user, c);
    if (c.status !== "draft") fail(409, "Only a draft can be published.");
    checkFields({ title: c.title, description: c.description, entryDeadline: c.entry_deadline, pointsPerLeg: c.points_per_leg,
      perfectBonus: c.perfect_bonus, legs: legsOf(c.id).map((l) => l.market_id) }, { publishing: true });
    return tx(db, () => {
      run("UPDATE challenges SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?", now(), now(), c.id);
      audit.log({ actorId: user.id, action: "challenge.publish", targetType: "challenge", targetId: c.id, detail: { before: { status: "draft" }, after: { status: "published" } } });
      return { id: c.id, status: "published" };
    });
  }

  // Cancelling: no points are involved (entries were free), so every entry just ends void
  // A published challenge's deadline can only move later, and only before it passes: nobody's answers change,
  // they just get longer to enter or change them. Every leg's market has to stay open until the new deadline.
  function extend(user, id, entryDeadline) {
    const c = byId(id);
    needManage(user, c);
    limiter(`admin:${user.id}`, 60, 60000);
    if (c.status !== "published") fail(409, "Only a published challenge's deadline can be extended (edit a draft instead).");
    if (now() >= c.entry_deadline) fail(409, "The deadline has already passed, so entries are locked. It can't be reopened.");
    const next = Number(entryDeadline);
    if (!Number.isFinite(next) || next <= c.entry_deadline) fail(400, "The new deadline has to be later than the current one.");
    const early = legsOf(c.id).map((l) => get("SELECT * FROM markets WHERE id = ?", l.market_id)).filter((m) => m.closes_at < next);
    if (early.length) fail(409, `Market${early.length > 1 ? "s" : ""} ${early.map((m) => `#${m.id}`).join(", ")} close${early.length > 1 ? "" : "s"} before that. Move their closing time first.`);
    return tx(db, () => {
      run("UPDATE challenges SET entry_deadline = ?, updated_at = ? WHERE id = ?", next, now(), c.id);
      audit.log({ actorId: user.id, action: "challenge.extend", targetType: "challenge", targetId: c.id,
        detail: { before: { entryDeadline: new Date(c.entry_deadline).toISOString() }, after: { entryDeadline: new Date(next).toISOString() } } });
      return { id: c.id, entryDeadline: next };
    });
  }

  function cancel(user, id, note) {
    const c = byId(id);
    needManage(user, c);
    const why = text(note, 300);
    if (why.length < 3) fail(400, "Say why the challenge is cancelled.");
    if (c.status === "cancelled") return { id: c.id, already: true };
    if (c.status === "settled") fail(409, "A settled challenge can't be cancelled; its points are already given. Use a credit adjustment to correct one.");
    return tx(db, () => {
      run("UPDATE challenges SET status = 'cancelled', cancelled_at = ?, cancel_note = ?, updated_at = ? WHERE id = ?", now(), why, now(), c.id);
      run("UPDATE challenge_entries SET result = 'void', award = 0, settled_at = ? WHERE challenge_id = ? AND result = 'pending'", now(), c.id);
      run("UPDATE challenge_picks SET result = 'void' WHERE entry_id IN (SELECT id FROM challenge_entries WHERE challenge_id = ?)", c.id);
      audit.log({ actorId: user.id, action: "challenge.cancel", targetType: "challenge", targetId: c.id, detail: { before: { status: c.status }, after: { status: "cancelled" }, note: why } });
      return { id: c.id, status: "cancelled" };
    });
  }

  /* ---------- Settling ---------- */

  // How each leg came out, from its market's stored result (null while it's still undecided)
  function legOutcomes(c) {
    return legsOf(c.id).map((l) => {
      const m = get("SELECT * FROM markets WHERE id = ?", l.market_id);
      if (m.status === "void") return { leg: l, outcome: "void" };
      if (m.status !== "resolved") return { leg: l, outcome: null, market: m };
      const r = get("SELECT outcome FROM resolutions WHERE market_id = ? AND reversed_at IS NULL ORDER BY round DESC LIMIT 1", m.id);
      return { leg: l, outcome: r.outcome === "push" ? "void" : r.outcome };
    });
  }
  // Points per correct leg, plus the bonus when every leg that counts is right (at least two counting)
  const awardFor = (c, correct, wrong) => (correct + wrong === 0 ? 0 : correct * c.points_per_leg + (wrong === 0 && correct >= 2 ? c.perfect_bonus : 0));

  // What settling would do right now (nothing is saved)
  function settlePreview(user, id) {
    const c = byId(id);
    needManage(user, c);
    const outs = legOutcomes(c);
    const waiting = outs.filter((o) => !o.outcome);
    const entries = all("SELECT COUNT(*) AS n FROM challenge_entries WHERE challenge_id = ?", c.id)[0].n;
    return { ready: c.status === "published" && now() >= c.entry_deadline && !waiting.length, status: c.status, entries,
      deadlinePassed: now() >= c.entry_deadline, waitingOn: waiting.map((o) => o.leg.market_id) };
  }

  // Settling twice does nothing the second time: the challenge is marked settled in the same transaction, and each
  // entry's award has its own idempotency key in the ledger
  function settle(user, id) {
    const c0 = byId(id);
    needManage(user, c0);
    return tx(db, () => {
      const c = byId(id);
      if (c.status === "settled") return { id: c.id, already: true };
      if (c.status !== "published") fail(409, "Only a published challenge can be settled.");
      if (now() < c.entry_deadline) fail(409, "Entries are still open. Settle after the deadline.");
      const outs = legOutcomes(c);
      const waiting = outs.filter((o) => !o.outcome);
      if (waiting.length) fail(409, `Waiting on market${waiting.length > 1 ? "s" : ""} ${waiting.map((o) => `#${o.leg.market_id}`).join(", ")} to settle.`);
      const outcomeOf = new Map(outs.map((o) => [o.leg.id, o.outcome]));
      let paid = 0, scored = 0;
      all("SELECT * FROM challenge_entries WHERE challenge_id = ? AND result = 'pending'", c.id).forEach((e) => {
        let correct = 0, wrong = 0, voided = 0;
        all("SELECT * FROM challenge_picks WHERE entry_id = ?", e.id).forEach((p) => {
          const o = outcomeOf.get(p.leg_id);
          const result = o === "void" ? "void" : p.selection === o ? "won" : "lost";
          if (result === "won") correct++; else if (result === "lost") wrong++; else voided++;
          run("UPDATE challenge_picks SET result = ? WHERE entry_id = ? AND leg_id = ?", result, e.id, p.leg_id);
        });
        const award = awardFor(c, correct, wrong);
        run("UPDATE challenge_entries SET result = ?, correct = ?, wrong = ?, voided = ?, award = ?, settled_at = ? WHERE id = ?",
          correct + wrong === 0 ? "void" : "scored", correct, wrong, voided, award, now(), e.id);
        if (award > 0) {
          ledger.post({ userId: e.user_id, delta: award, kind: "challenge_award", challengeId: c.id, actorId: user.id,
            note: `${c.title}: ${correct} of ${correct + wrong} legs correct${wrong === 0 && correct >= 2 && c.perfect_bonus ? " (perfect)" : ""}`,
            idempotencyKey: `challenge:${c.id}:entry:${e.id}` });
          paid += award;
        }
        scored++;
      });
      run("UPDATE challenges SET status = 'settled', settled_at = ?, updated_at = ? WHERE id = ?", now(), now(), c.id);
      audit.log({ actorId: user.id, action: "challenge.settle", targetType: "challenge", targetId: c.id,
        detail: { before: { status: "published" }, after: { status: "settled" }, entries: scored, pointsAwarded: paid,
          legs: outs.map((o) => ({ market: o.leg.market_id, outcome: o.outcome })) } });
      return { id: c.id, status: "settled", entries: scored, pointsAwarded: paid };
    });
  }

  /* ---------- Entering ---------- */

  // Answers for every leg; can be changed until the deadline, then locked
  function enter(user, id, picks = {}) {
    if (!user) fail(401, "Sign in to enter.");
    if (!plays(user)) fail(403, "Staff and admin accounts run challenges, so they can't enter them.");
    limiter(`enter:${user.id}`, 30, 60000);
    return tx(db, () => {
      const c = byId(id);
      if (c.status !== "published") fail(409, c.status === "draft" ? "That challenge isn't published." : "This challenge is closed.");
      if (now() >= c.entry_deadline) fail(409, "The entry deadline has passed. Entries are locked.");
      const legs = legsOf(c.id);
      const answers = legs.map((l) => {
        const sel = picks && typeof picks === "object" ? String(picks[l.id] ?? "") : "";
        const m = get("SELECT * FROM markets WHERE id = ?", l.market_id);
        if (!core.optionsFor(m).some((o) => o.key === sel)) fail(400, "Answer every leg of the challenge.");
        return { leg: l.id, sel };
      });
      const keys = new Set(legs.map((l) => String(l.id)));
      if (Object.keys(picks).some((k) => !keys.has(k))) fail(400, "That answer isn't for a leg of this challenge.");
      let e = get("SELECT * FROM challenge_entries WHERE challenge_id = ? AND user_id = ?", c.id, user.id);
      if (!e) {
        run("INSERT INTO challenge_entries (challenge_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)", c.id, user.id, now(), now());
        e = get("SELECT * FROM challenge_entries WHERE challenge_id = ? AND user_id = ?", c.id, user.id);
      } else {
        run("UPDATE challenge_entries SET updated_at = ? WHERE id = ?", now(), e.id);
      }
      answers.forEach((a) => run(`INSERT INTO challenge_picks (entry_id, leg_id, selection) VALUES (?, ?, ?)
        ON CONFLICT(entry_id, leg_id) DO UPDATE SET selection = excluded.selection`, e.id, a.leg, a.sel));
      return { entryId: e.id, updated: e.created_at !== e.updated_at };
    });
  }

  /* ---------- Reading ---------- */

  const entryCount = (id) => get("SELECT COUNT(*) AS n FROM challenge_entries WHERE challenge_id = ?", id).n;
  const statusOf = (c) => (c.status === "published" && now() >= c.entry_deadline ? "locked" : c.status === "published" ? "open" : c.status);

  function summary(c, userId) {
    const legs = legsOf(c.id);
    const mine = userId ? get("SELECT * FROM challenge_entries WHERE challenge_id = ? AND user_id = ?", c.id, userId) : null;
    return { id: c.id, title: c.title, description: c.description, status: statusOf(c), storedStatus: c.status, entryDeadline: c.entry_deadline,
      pointsPerLeg: c.points_per_leg, perfectBonus: c.perfect_bonus, legCount: legs.length,
      maxAward: legs.length * c.points_per_leg + (legs.length >= 2 ? c.perfect_bonus : 0),
      entries: entryCount(c.id), sample: !!c.demo, cancelNote: c.cancel_note,
      owner: get("SELECT username FROM users WHERE id = ?", c.owner_id).username,
      mine: mine ? { result: mine.result, correct: mine.correct, wrong: mine.wrong, voided: mine.voided, award: mine.award, updatedAt: mine.updated_at } : null };
  }

  // Public: published, locked, settled and cancelled challenges (never drafts)
  function list(user) {
    return all("SELECT * FROM challenges WHERE status <> 'draft' ORDER BY CASE status WHEN 'published' THEN 0 WHEN 'settled' THEN 1 ELSE 2 END, entry_deadline DESC")
      .map((c) => summary(c, user && user.id));
  }

  async function detail(user, id) {
    const c = byId(id);
    // A draft is only visible to whoever can manage it
    if (c.status === "draft" && !(user && canManage(user, c))) fail(404, "That challenge doesn't exist.");
    const legs = legsOf(c.id);
    const markets = await service.marketsByIds(legs.map((l) => l.market_id));
    const outcome = new Map(legOutcomes(c).map((o) => [o.leg.id, o.outcome]));
    const e = user ? get("SELECT * FROM challenge_entries WHERE challenge_id = ? AND user_id = ?", c.id, user.id) : null;
    const picks = e ? new Map(all("SELECT * FROM challenge_picks WHERE entry_id = ?", e.id).map((p) => [p.leg_id, p])) : new Map();
    return {
      challenge: { ...summary(c, user && user.id), rules: challengeRules(c), canManage: !!(user && canManage(user, c)),
        legs: legs.map((l, i) => {
          const m = markets.get(l.market_id);
          // Only the community split of the market itself is shown; nobody else's challenge answers are
          return { id: l.id, position: i + 1, market: m && { ...m, mine: null }, outcome: outcome.get(l.id),
            mine: picks.has(l.id) ? { selection: picks.get(l.id).selection, result: picks.get(l.id).result } : null };
        }) }
    };
  }

  // Your own entries, newest first
  function myEntries(user) {
    if (!user) fail(401, "Sign in to see your challenge entries.");
    return all(`SELECT e.*, c.id AS cid FROM challenge_entries e JOIN challenges c ON c.id = e.challenge_id WHERE e.user_id = ? ORDER BY e.created_at DESC`, user.id)
      .map((e) => summary(get("SELECT * FROM challenges WHERE id = ?", e.cid), user.id));
  }

  // Admin list: every status (staff: their own drafts plus everything published)
  function adminList(user) {
    need(user, "challenges.manage_own");
    return all("SELECT * FROM challenges ORDER BY id DESC").filter((c) => c.status !== "draft" || canManage(user, c))
      .map((c) => ({ ...summary(c, null), canManage: canManage(user, c), legs: legsOf(c.id).map((l) => l.market_id) }));
  }

  // Markets a leg can be (still taking picks, not settled)
  async function legOptions(user) {
    need(user, "challenges.manage_own");
    const ids = all("SELECT id FROM markets WHERE status IN ('open', 'upcoming', 'locked') AND hold IS NULL AND closes_at > ? ORDER BY closes_at", now()).map((r) => r.id);
    const views = await service.marketsByIds(ids);
    return ids.map((id) => views.get(id)).filter((m) => m && (m.status === "open" || m.status === "upcoming"))
      .map((m) => ({ id: m.id, kind: m.kind, label: m.kind === "game_winner" ? `${m.teams[0].name} vs ${m.teams[1].name}` : `${m.player}: ${m.stat.label} ${core.fmtLine(m.line)}`,
        gameId: m.gameId, closesAt: m.closesAt, sample: m.sample, status: m.status }));
  }

  return { create, update, publish, extend, cancel, settle, settlePreview, enter, list, detail, myEntries, adminList, legOptions };
}

// UFF Predictions: the rules, with no database or network in them, so they can be tested on their own.
// Everything here is virtual points only: no money, no odds, no payouts of any real value.

// Stats a Player Over/Under can be set on. Each one is a column UFF box scores actually keep
// (worker/src/index.js STAT_FIELDS): box[side][cat] = [{ player, <field>: number, ... }]
export const STATS = {
  pass_yds: { label: "Passing yards", short: "Pass YDS", cat: "passing", field: "yds" },
  pass_td: { label: "Passing touchdowns", short: "Pass TD", cat: "passing", field: "td" },
  pass_int: { label: "Interceptions thrown", short: "INT thrown", cat: "passing", field: "int" },
  pass_comp: { label: "Completions", short: "Comp", cat: "passing", field: "comp" },
  rush_yds: { label: "Rushing yards", short: "Rush YDS", cat: "rushing", field: "yds" },
  rush_td: { label: "Rushing touchdowns", short: "Rush TD", cat: "rushing", field: "td" },
  rec_yds: { label: "Receiving yards", short: "Rec YDS", cat: "receiving", field: "yds" },
  rec_td: { label: "Receiving touchdowns", short: "Rec TD", cat: "receiving", field: "td" },
  rec_rec: { label: "Receptions", short: "REC", cat: "receiving", field: "rec" },
  def_tak: { label: "Tackles", short: "TAK", cat: "defense", field: "tak" },
  def_int: { label: "Interceptions (defense)", short: "DEF INT", cat: "defense", field: "int" },
  def_sck: { label: "Sacks", short: "SCK", cat: "defense", field: "sck" },
  def_pbu: { label: "Pass breakups", short: "PBU", cat: "defense", field: "pbu" }
};
const BOX_CATS = ["passing", "rushing", "receiving", "defense"];

export const KINDS = { player_ou: "Player Over/Under", game_winner: "Game Winner" };

// Over/Under: OVER wins when the final stat is strictly above the line, UNDER when strictly below.
// Exactly on the line (only possible with a whole-number line) is a push: points back, not counted in accuracy.
export function overUnderOutcome(value, line) {
  if (!Number.isFinite(value) || !Number.isFinite(line)) throw new Error("Over/Under needs a number and a line");
  return value > line ? "over" : value < line ? "under" : "push";
}

// Game Winner: score [a, b] -> "a", "b", or "push" for a tie
export function winnerOutcome(score) {
  if (!Array.isArray(score) || score.length !== 2 || !score.every(Number.isFinite)) throw new Error("Game Winner needs a final score");
  return score[0] > score[1] ? "a" : score[1] > score[0] ? "b" : "push";
}

// The line has to be a whole number or end in .5, and can't be negative
export const validLine = (line) => Number.isFinite(line) && line >= 0 && line <= 10000 && Number.isInteger(line * 2);
export const lineHasPush = (line) => Number.isInteger(line);

// The two choices a market offers
export function optionsFor(m) {
  if (m.kind === "game_winner") return [{ key: "a", label: m.team_a }, { key: "b", label: m.team_b }];
  const stat = STATS[m.stat_key];
  const unit = stat ? stat.label.toLowerCase() : "";
  return [{ key: "over", label: `Over ${fmtLine(m.line)} ${unit}` }, { key: "under", label: `Under ${fmtLine(m.line)} ${unit}` }];
}
export const fmtLine = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// The settlement rules shown on every market, worded from its own line and teams
export function rulesFor(m) {
  if (m.kind === "game_winner") {
    return [
      `${m.team_a} or ${m.team_b} wins, by the final score recorded for game ${m.game_id}.`,
      "A tie is a push: everyone gets their points back and it doesn't count toward accuracy.",
      "A forfeit counts as recorded: the team given the win on the official score wins.",
      "A canceled game voids the market (points back). A postponed game keeps every pick and settles when it's played.",
      "Picks close at the closing time below, never after kickoff. A disputed result is held until an admin settles or voids it."
    ];
  }
  const stat = STATS[m.stat_key] || { label: m.stat_key };
  const l = fmtLine(m.line);
  return [
    `Settles on ${m.player}'s ${stat.label.toLowerCase()} in game ${m.game_id}, from the official UFF box score.`,
    `OVER wins at more than ${l}; UNDER wins at less than ${l}.`,
    lineHasPush(m.line)
      ? `Exactly ${l} is a push: everyone gets their points back and it doesn't count toward accuracy.`
      : `The line ends in .5, so it can't land exactly on ${l}: there's no push.`,
    `If ${m.player} is in the box score but has no ${stat.label.toLowerCase()} line, that counts as 0.`,
    `If ${m.player} isn't in the game's box score at all (didn't play), the market is void and points go back.`,
    "A canceled game voids it. A postponed game keeps every pick and settles when it's played. A disputed result is held until an admin settles or voids it."
  ];
}

// What a market's status is right now. Stored: upcoming | open | locked | resolved | void, plus an optional
// hold (postponed | disputed) that stops picks and settlement. Picks lock at closes_at whatever is stored.
export function effectiveStatus(m, now) {
  if (m.status === "resolved" || m.status === "void") return m.status;
  if (m.hold) return "locked";
  if (now >= m.closes_at) return "locked";
  if (m.status === "upcoming") return m.opens_at != null && now >= m.opens_at ? "open" : "upcoming";
  return m.status;
}

// Community split: how many valid picks chose each option, and the percent (whole numbers adding up to 100
// by largest remainder). No picks = null percents, never a made-up 50/50.
export function communitySplit(counts, keys) {
  const total = keys.reduce((n, k) => n + (counts[k] || 0), 0);
  if (!total) return { total: 0, options: keys.map((key) => ({ key, count: 0, pct: null })) };
  const raw = keys.map((key) => ({ key, count: counts[key] || 0, exact: ((counts[key] || 0) * 100) / total }));
  raw.forEach((r) => (r.pct = Math.floor(r.exact)));
  let left = 100 - raw.reduce((n, r) => n + r.pct, 0);
  [...raw].sort((a, b) => (b.exact - b.pct) - (a.exact - a.pct) || b.count - a.count).forEach((r) => { if (left > 0) { r.pct++; left--; } });
  return { total, options: raw.map(({ key, count, pct }) => ({ key, count, pct })) };
}

// A player's stat in one game's box score. names = every lower-case name that is this player.
// { played: false } = not anywhere in the box score (didn't play); played but no line in that category = 0.
export function playerStatFromBox(box, names, statKey) {
  const stat = STATS[statKey];
  if (!stat) throw new Error(`Unknown stat ${statKey}`);
  const isPlayer = (r) => r && r.player && names.has(String(r.player).toLowerCase());
  let played = false, value = 0;
  (box || []).forEach((side) => BOX_CATS.forEach((cat) => [].concat((side && side[cat]) || []).forEach((r) => {
    if (!isPlayer(r)) return;
    played = true;
    if (cat === stat.cat) value += Number(r[stat.field]) || 0;
  })));
  return played ? { played: true, value } : { played: false };
}

// Accuracy and streaks from someone's picks. Pushes, voids and pending picks don't count.
// picks: [{ result, settled_at }]; streaks run in the order the picks were settled.
export function userRecord(picks) {
  const n = (r) => picks.filter((p) => p.result === r).length;
  const won = n("won"), lost = n("lost");
  const decided = picks.filter((p) => p.result === "won" || p.result === "lost").sort((a, b) => a.settled_at - b.settled_at || a.id - b.id);
  let best = 0, run = 0, prev = null;
  decided.forEach((p) => {
    run = p.result === prev ? run + 1 : 1;
    prev = p.result;
    if (p.result === "won") best = Math.max(best, run);
  });
  return {
    won, lost, push: n("push"), void: n("void"), pending: n("pending"),
    settled: won + lost,
    accuracy: won + lost ? won / (won + lost) : null,
    streak: prev ? { type: prev === "won" ? "W" : "L", n: run } : null,
    bestStreak: best
  };
}

// Accuracy leaderboard: only people with at least minSettled decided picks; best accuracy first, then more
// correct picks, then name. Virtual points play no part in it.
export function rankAccuracy(rows, minSettled) {
  const ranked = rows.filter((r) => r.won + r.lost >= minSettled)
    .map((r) => ({ ...r, accuracy: r.won / (r.won + r.lost) }))
    .sort((a, b) => b.accuracy - a.accuracy || b.won - a.won || a.username.localeCompare(b.username));
  let rank = 0;
  ranked.forEach((r, i) => {
    if (!i || r.accuracy !== ranked[i - 1].accuracy || r.won !== ranked[i - 1].won) rank = i + 1;
    r.rank = rank;
  });
  return ranked;
}

// What a settled pick pays back (virtual points). The stake left the balance when the pick was made.
export const payoutFor = (result, stake) => (result === "won" ? stake * 2 : result === "push" || result === "void" ? stake : 0);

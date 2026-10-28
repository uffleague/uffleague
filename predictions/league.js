// The server's own view of the league (teams, schedule, finals, box scores), so markets are created and settled
// from league data and never from anything a browser sends.
//   live: data.js + the Worker's public GET (read-only, the same request the site makes on every page load)
//   demo: data.js teams + the sample games in fixtures/demo-league.json + sample finals an admin posts locally
// It follows app.js mergeSaved() for the parts markets need (team names/codes, team edits, schedule, results);
// player renames are covered by each market's own list of names (picked on the site, where every alias is known).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { SITE_ROOT, HERE, CONFIG } from "./config.js";
import { playerStatFromBox, STATS } from "./core.js";

export function readDataJs(file = join(SITE_ROOT, "data.js")) {
  return new vm.Script(`${readFileSync(file, "utf8")}\n;LEAGUE`).runInNewContext({});
}

export function buildLeague(L, saved = {}, extra = {}) {
  const teams = [];
  L.conferences.forEach((c) => c.divisions.forEach((d) => d.teams.forEach((t) =>
    teams.push({ key: t.name, name: t.name, code: t.code, logo: t.logo || "", color: t.color, color2: t.color2,
      conference: c.name, division: d.name, w: t.w || 0, l: t.l || 0, pf: t.pf || 0, pa: t.pa || 0, disbanded: !!t.disbanded }))));
  // Team edits from Admin -> Teams (saved under the team's original name; "+..." = a team added there)
  const renames = {};
  Object.entries(saved.teams || {}).forEach(([key, e]) => {
    let t = teams.find((x) => x.key === key);
    if (!t) {
      if (!key.startsWith("+")) return;
      teams.push((t = { key, name: key, w: 0, l: 0, pf: 0, pa: 0 }));
    } else if (e.name && e.name !== t.name) renames[t.name] = e.name;
    ["name", "code", "logo", "color", "color2", "conference", "division"].forEach((f) => { if (e[f]) t[f] = e[f]; });
  });
  const lookup = new Map();
  teams.forEach((t) => { lookup.set(t.name.toLowerCase(), t.name); if (t.code) lookup.set(t.code.toLowerCase(), t.name); });
  Object.entries(renames).forEach(([from, to]) => lookup.set(from.toLowerCase(), to));
  const city = (n) => n.toLowerCase().split(/\s+/).slice(0, -1).join(" ");
  const teamName = (name) => {
    const s = String(name).replace(/:[^:\s]+:/g, "").replace(/@/g, "").replace(/\s+/g, " ").trim();
    if (lookup.has(s.toLowerCase())) return lookup.get(s.toLowerCase());
    const same = city(s) ? teams.filter((t) => city(t.name) === city(s)) : [];
    return same.length === 1 ? same[0].name : s;
  };

  // The schedule the bot posts replaces those weeks in data.js
  const sent = new Set((saved.schedule || []).map((w) => w.week));
  const weeks = [...(L.schedule || []).filter((w) => !sent.has(w.week)), ...(saved.schedule || [])].sort((a, b) => a.week - b.week);
  const games = weeks.flatMap((w) => w.games.map((g) => ({
    id: g.id, week: w.week, series: w.series, teams: g.teams.map(teamName), at: Number.isFinite(g.at) ? g.at : null, time: g.time || ""
  })));
  (extra.games || []).forEach((g) => games.push({ ...g, teams: g.teams.map(teamName) }));
  const byId = new Map(games.map((g) => [g.id, g]));
  [...(saved.results || []), ...(extra.results || [])].forEach((r) => {
    const g = byId.get(r.id);
    if (g && Array.isArray(r.score) && r.score.length === 2) Object.assign(g, { score: r.score.map(Number), date: r.date || "", box: r.box || null });
  });
  games.forEach((g) => { g.final = Array.isArray(g.score); });

  // Records: data.js numbers plus every final
  const teamOf = new Map(teams.map((t) => [t.name, t]));
  games.filter((g) => g.final).forEach((g) => {
    const [a, b] = g.teams.map((n) => teamOf.get(n));
    [[a, g.score[0], g.score[1]], [b, g.score[1], g.score[0]]].forEach(([t, mine, theirs]) => {
      if (!t) return;
      t.pf += mine; t.pa += theirs;
      if (mine > theirs) t.w++; else if (mine < theirs) t.l++;
    });
  });

  // Old name -> current name (data.js aliases, Admin -> Players renames, data.js renames)
  const aliases = new Map();
  Object.entries(L.aliases || {}).forEach(([k, v]) => aliases.set(k.toLowerCase(), v));
  (saved.renames || []).filter((r) => r.admin && r.from && r.to).forEach((r) => aliases.set(String(r.from).toLowerCase(), r.to));
  Object.entries(L.renames || {}).forEach(([k, v]) => aliases.set(k.toLowerCase(), v));
  const alias = (name) => {
    let cur = String(name);
    for (let i = 0; i < 10; i++) {
      const next = aliases.get(cur.toLowerCase());
      if (next === undefined || next.toLowerCase() === cur.toLowerCase()) return next || cur;
      cur = next;
    }
    return cur;
  };
  // Every lower-case name that is this player: the names given, and anything that renames to them
  const nameSet = (names) => {
    const set = new Set();
    [].concat(names).filter(Boolean).forEach((n) => { set.add(String(n).toLowerCase()); set.add(alias(n).toLowerCase()); });
    const current = new Set([...set].map((n) => alias(n).toLowerCase()));
    aliases.forEach((_, from) => { if (current.has(alias(from).toLowerCase())) set.add(from); });
    // box score lines saved under any of those names
    games.forEach((g) => (g.box || []).forEach((side) => Object.values(side || {}).forEach((rows) => [].concat(rows).forEach((r) => {
      if (r && r.player && current.has(alias(r.player).toLowerCase())) set.add(String(r.player).toLowerCase());
    }))));
    return set;
  };

  return {
    teams,
    games,
    team: (name) => teamOf.get(teamName(name)) || null,
    game: (id) => byId.get(id) || null,
    alias,
    nameSet,
    // The player's stat in every final with a box score they're in (oldest first)
    history(names, statKey) {
      if (!STATS[statKey]) return [];
      const set = nameSet(names);
      return games.filter((g) => g.final && g.box).map((g) => {
        const r = playerStatFromBox(g.box, set, statKey);
        if (!r.played) return null;
        const side = g.box.findIndex((s) => Object.values(s || {}).some((rows) => [].concat(rows).some((x) => x && set.has(String(x.player).toLowerCase()))));
        return { gameId: g.id, week: g.week, date: g.date, opponent: side === 0 ? g.teams[1] : side === 1 ? g.teams[0] : "", value: r.value };
      }).filter(Boolean);
    }
  };
}

// Sample games for demo mode, kicking off relative to when the server started. Each is labeled sample data.
export function demoGames(startedAt, file = join(HERE, "fixtures", "demo-league.json")) {
  const fx = JSON.parse(readFileSync(file, "utf8"));
  const hour = 3600 * 1000;
  return {
    label: fx.label,
    games: fx.games.map((g) => ({ id: g.id, week: g.week, teams: g.teams, at: Math.round((startedAt + g.kickoffInHours * hour) / 60000) * 60000, time: "", sample: true })),
    results: fx.games.filter((g) => g.score).map((g) => ({ id: g.id, score: g.score, box: g.box || null, date: "" }))
  };
}

// Where league data comes from. get() always answers: { ok, source, fetchedAt, error, view }
export function createLeagueSource({ mode, db, fetchSaved, dataJs, startedAt = Date.now(), now = Date.now }) {
  const L = dataJs || readDataJs();
  if (mode === "demo") {
    const demo = demoGames(startedAt);
    return {
      mode, label: demo.label,
      async get() {
        const posted = db.prepare("SELECT * FROM demo_results").all().map((r) => ({ id: r.game_id, score: [r.score_a, r.score_b], box: JSON.parse(r.box) }));
        const ids = new Set(posted.map((r) => r.id));
        return { ok: true, source: "demo", fetchedAt: now(), error: null,
          view: buildLeague(L, {}, { games: demo.games, results: [...demo.results.filter((r) => !ids.has(r.id)), ...posted] }) };
      }
    };
  }
  const read = fetchSaved || (async () => {
    const res = await fetch(CONFIG.liveUrl, { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error(`League data answered ${res.status}`);
    return res.json();
  });
  let last = null; // { saved, at }
  let lastError = null;
  return {
    mode: "live", label: "",
    async get() {
      if (!last || now() - last.at > CONFIG.liveCacheMs) {
        try { last = { saved: await read(), at: now() }; lastError = null; } catch (e) { lastError = e.message || String(e); }
      }
      // Without the saved data the schedule and finals aren't known, so nothing can be created or settled
      if (!last) return { ok: false, source: "live", fetchedAt: null, error: lastError, view: buildLeague(L, {}) };
      return { ok: true, source: "live", fetchedAt: last.at, error: lastError, view: buildLeague(L, last.saved) };
    }
  };
}

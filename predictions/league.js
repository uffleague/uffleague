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
import { buildLeague } from "./league-core.js";

export { buildLeague };

export function readDataJs(file = join(SITE_ROOT, "data.js")) {
  return new vm.Script(`${readFileSync(file, "utf8")}\n;LEAGUE`).runInNewContext({});
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

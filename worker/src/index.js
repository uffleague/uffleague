// Stores everything entered on the Admin page (Cloudflare Worker + KV): game results, transactions,
// position changes, live streams, the playoff bracket, United Flag Bowl history and an activity log.
//   GET  /                                     -> saved data (everything but the activity log)
//   POST / { action: "login", username, password, name } -> { username, name, token }
//   POST / { action, token, ... }              -> the saved data ("activity" returns the log)
// Secrets (set with `wrangler secret put`): ADMIN_USERNAME and ADMIN_PASSWORD_HASH (SHA-256 hex of the password).
const KEY = "data";
const EMPTY = { results: [], updates: [], positions: {}, streams: [], playoffs: null, bowls: {}, teams: {}, statEdits: {}, vods: [], allFlag: {}, schedule: [],
  renames: [], people: [], rosterSyncs: [], activity: [] };
const RENAMES_MAX = 3000;
const PEOPLE_MAX = 3000;
const SYNCS_MAX = 200;
const STAT_FIELDS = {
  passing: ["comp", "att", "yds", "td", "int", "lng", "sacked"],
  rushing: ["att", "yds", "td", "fum", "lng", "pre"],
  receiving: ["tgt", "rec", "yds", "td", "drop", "lng"],
  defense: ["tak", "tfl", "sck", "saf", "swat", "int", "pbu", "pre", "td"]
};
const IMAGE_MAX = 400 * 1024;
const UPDATE_TYPES = ["sign", "demand", "release", "promotion"];
const TOKEN_HOURS = 12;
const ACTIVITY_MAX = 300;

// Reads are public and every write needs a login token (not a cookie), so any site may call this
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type"
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS }
  });

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
async function sign(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(String(msg))));
}
// Compare without bailing early, so timing doesn't give away how much matched
function same(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
const b64 = (s) => btoa(String.fromCharCode(...enc.encode(s)));
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
const str = (v, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

// Fingerprint of a pasted recap; spacing and blank lines don't count, the words and numbers do
const recapHash = (text) =>
  sha256(String(text).split(/\r?\n/).map((l) => l.trim().replace(/\s+/g, " ")).filter(Boolean).join("\n"));

// Token = expiry . admin's name . signature; returns the name when it's valid
async function tokenName(env, token) {
  const [exp, name64, sig] = String(token || "").split(".");
  if (!(Number(exp) > Date.now()) || !name64 || !sig) return null;
  let name;
  try { name = unb64(name64); } catch (e) { return null; }
  return same(sig, await sign(env.ADMIN_PASSWORD_HASH, `${exp}.${name}`)) ? name : null;
}

async function load(env) {
  const data = (await env.UFF.get(KEY, { type: "json" })) || {};
  return { ...EMPTY, ...data };
}
// The site gets each known player's Roblox and Discord names, but not their ids
const publicData = ({ activity, people, ...rest }) => ({ ...rest, people: (people || []).map((p) => ({ name: p.name, discord: p.discord })) });

const STREAM_HOSTS = /^https:\/\/(www\.|m\.|clips\.)?(twitch\.tv|youtube\.com|youtu\.be)\//i;

// Keep only the bracket fields the site uses
function cleanPlayoffs(p) {
  const slot = (v) => str(v, 60) || "";
  const from = (v) => (Number.isInteger(v) && v >= 0 && v < 64 ? v : null);
  // Logo: an uploaded picture, or an image file that's part of the site (e.g. "ufb-7.png")
  const logo = typeof (p && p.logo) === "string" ? p.logo : "";
  const okLogo = (/^data:image\/(png|jpeg|webp);base64,/.test(logo) && logo.length < 400000) || /^[\w-]+(\/[\w-]+)*\.(png|jpe?g|webp)$/i.test(logo);
  return {
    title: str(p && p.title, 80) || "Playoffs",
    logo: okLogo ? logo : "",
    rounds: [].concat((p && p.rounds) || []).slice(0, 10).map((r) => ({
      name: str(r && r.name, 40) || "Round",
      games: [].concat((r && r.games) || []).slice(0, 32).map((g) => ({
        a: slot(g && g.a), b: slot(g && g.b),
        sa: str(String((g && g.sa) ?? ""), 4) || "", sb: str(String((g && g.sb) ?? ""), 4) || "",
        seedA: str(String((g && g.seedA) ?? ""), 3) || "", seedB: str(String((g && g.seedB) ?? ""), 3) || "",
        adv: g && (g.adv === "a" || g.adv === "b") ? g.adv : "",
        fromA: from(g && g.fromA), fromB: from(g && g.fromB)
      }))
    }))
  };
}

// Uploaded pictures (team logos) are stored separately and served from /img/<id>
async function serveImage(env, id) {
  if (!/^[\w-]{10,60}$/.test(id)) return new Response("Not found", { status: 404, headers: CORS });
  const { value, metadata } = await env.UFF.getWithMetadata(`img:${id}`, { type: "arrayBuffer" });
  if (!value) return new Response("Not found", { status: 404, headers: CORS });
  return new Response(value, {
    headers: { "content-type": (metadata && metadata.type) || "image/png", "cache-control": "public, max-age=31536000, immutable", ...CORS }
  });
}

// Date ("2026-10-17") and 24-hour time ("15:23") of a moment in the league's time zone
function leagueDateTime(when, tz) {
  const d = new Date(typeof when === "number" || /^\d+$/.test(String(when)) ? Number(when) : String(when || ""));
  if (isNaN(d)) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(d).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

// The transactions bot (ZevoraV2) posts here the moment it announces a transaction:
//   POST /bot   Authorization: Bearer <BOT_KEY>
//   { "transactions": [{ "type": "sign"|"offer"|"demand"|"release"|"promotion", "player": "...", "team": "...",
//                        "by": "...", "role": "...", "note": "...", "time": "<ISO time>", "id": "<Discord message id>" }] }
//
// It can also post the schedule it generates (same URL and key):
//   { "schedule": { "replace": false, "weeks": [{ "week": 1, "series": 1,
//       "games": [{ "id": "W1-1", "teams": ["Team A", "Team B"], "time": "Sat 8 PM EST" | "<ISO time>" }] }] } }
// Each week sent replaces that week; weeks not sent stay. "replace": true wipes the old schedule first.
// An ISO time or timestamp becomes "Sat, Oct 25, 8:00 PM EDT"; anything else is shown as written
function gameTimeText(v, tz) {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  if (/^\d{10,13}$/.test(s) || /^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(/^\d+$/.test(s) ? Number(s.length === 10 ? s + "000" : s) : s);
    if (!isNaN(d)) return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(d);
  }
  return str(s, 40);
}

// Finds a game on the saved schedule from what the bot knows about it: the game id, the bot's game code
// (set with a game time), or the week (and series) plus the two teams in either order
const botTeamKey = (t) => String(t || "").replace(/:[^:\s]+:/g, "").replace(/@/g, "").replace(/\s+/g, " ").trim().toLowerCase();
function findBotGame(data, q) {
  const week = Math.round(Number(q && q.week));
  const series = Math.round(Number(q && q.series));
  const id = str(String((q && q.id) ?? ""), 20);
  const code = str(String((q && q.gameCode) ?? ""), 20);
  const pair = [].concat((q && q.teams) || [q && (q.team || q.team1), q && (q.opponent || q.team2)].filter(Boolean)).map(botTeamKey).sort().join("|");
  const weeks = data.schedule.filter((w) => (!(week >= 1) || w.week === week) && (!(series >= 1) || !w.series || w.series === series));
  let game;
  weeks.some((w) => (game = w.games.find((g) => (id && g.id === id) || (code && g.code && g.code.toLowerCase() === code.toLowerCase()))));
  if (!game && pair.includes("|") && (week >= 1 || !id)) weeks.some((w) => (game = w.games.find((g) => g.teams.map(botTeamKey).sort().join("|") === pair)));
  return game || null;
}
const notOnSite = () => json({ updated: 0, note: "That game isn't on the site's schedule, so nothing changed." });

// Live streams for a game that's over (or that started hours ago) become its replay (VOD); one with no game just ends
const STREAM_HOURS = 8;
function retireStreams(data, done) {
  const gone = data.streams.filter(done);
  if (!gone.length) return;
  data.streams = data.streams.filter((x) => !done(x));
  data.vods = [...gone.filter((x) => x.gameId && !data.vods.some((v) => v.gameId === x.gameId && v.url === x.url))
    .map((x) => ({ id: crypto.randomUUID(), title: x.title, url: x.url, gameId: x.gameId, note: "", at: Date.now() })), ...data.vods];
}

// A game time set with /gametime or /hostgametime (same URL and key):
//   { "gameTime": { "week": 1, "series": 1, "id": "W1-1", "teams": ["Team A", "Team B"], "time": "<ISO time>", "gameCode": "NNG646" } }
// Only changes a game already on the site; "time": "" clears it. The game code lets /stream find the game later.
async function botGameTime(env, gt) {
  if (!(Number(gt && gt.week) >= 1) && !(gt && (gt.id || gt.gameCode))) return json({ error: "Send the week (and the two teams) or the game id." }, 400);
  const data = await load(env);
  const game = findBotGame(data, gt);
  if (!game) return notOnSite();
  game.time = gameTimeText(gt.time, env.LEAGUE_TZ || "America/New_York");
  const code = str(String(gt.gameCode ?? ""), 20);
  if (code) game.code = code;
  data.activity = [{ at: Date.now(), by: "Discord bot", action: "saveSchedule",
    text: `${game.time ? `Set the time for ${game.id} (${game.teams.join(" vs ")}) to ${game.time}` : `Cleared the time for ${game.id}`}` }, ...data.activity].slice(0, ACTIVITY_MAX);
  await env.UFF.put(KEY, JSON.stringify(data));
  return json({ updated: 1, id: game.id, time: game.time || "" });
}

// A final score from /score (same URL and key); the stats come later from the Admin page:
//   { "score": { "week": 1, "series": 1, "id": "W1-1", "teams": ["Team A", "Team B"], "scores": [24, 44], "time": "<ISO time>" } }
// Scores are lined up with the schedule's team order. A game that already has stats keeps them.
async function botScore(env, sc) {
  if (sc && sc.remove) return botRemoveScore(env, sc);
  const teams = [].concat((sc && sc.teams) || []).map(botTeamKey);
  const scores = [].concat((sc && sc.scores) || []).map(Number);
  if (teams.length !== 2 || teams.some((t) => !t) || scores.length !== 2 || scores.some((n) => !Number.isFinite(n) || n < 0)) {
    return json({ error: "A score needs two teams and two scores." }, 400);
  }
  const data = await load(env);
  const game = findBotGame(data, sc);
  if (!game) return notOnSite();
  const flip = botTeamKey(game.teams[0]) === teams[1];
  const score = flip ? [scores[1], scores[0]] : scores;
  const when = leagueDateTime(sc.time || Date.now(), env.LEAGUE_TZ || "America/New_York");
  const old = data.results.find((r) => r.id === game.id);
  data.results = [...data.results.filter((r) => r.id !== game.id), { ...old, id: game.id, score, date: (old && old.date) || (when && when.date) || undefined }];
  // The game's live streams stay on its card as replays
  retireStreams(data, (x) => x.gameId === game.id);
  data.activity = [{ at: Date.now(), by: "Discord bot", action: "saveResult",
    text: `Recorded ${game.id}: ${game.teams[0]} ${score[0]}-${score[1]} ${game.teams[1]}` }, ...data.activity].slice(0, ACTIVITY_MAX);
  await env.UFF.put(KEY, JSON.stringify(data));
  return json({ updated: 1, id: game.id, score, teams: game.teams });
}

// /removescore: { "score": { "week": 1, "series": 1, "id": "W1-1", "teams": ["DET", "SJS"], "remove": true } }
// The game goes back to unplayed. Its box score and Player of the Game stay saved (hidden while there's no score)
// and come back with the next score; its replay stays too.
async function botRemoveScore(env, sc) {
  const teams = [].concat(sc.teams || []).map(botTeamKey);
  if (teams.length !== 2 || teams.some((t) => !t)) return json({ error: "A score removal needs the two teams." }, 400);
  const data = await load(env);
  const game = findBotGame(data, sc);
  if (!game) return json({ error: "Couldn't find that game on the site's schedule." }, 400);
  const old = data.results.find((r) => r.id === game.id);
  if (!old || !Array.isArray(old.score)) return json({ removed: 0, note: `${game.id} has no score on the site, so nothing changed.` });
  const { score, ...rest } = old;
  data.results = data.results.filter((r) => r.id !== game.id);
  if (rest.box || rest.potg) data.results.push(rest);
  data.activity = [{ at: Date.now(), by: "Discord bot", action: "deleteResult",
    text: `Removed the score for ${game.id}: ${game.teams[0]} ${score[0]}-${score[1]} ${game.teams[1]}${rest.box ? " (stats kept for the next score)" : ""}` }, ...data.activity].slice(0, ACTIVITY_MAX);
  await env.UFF.put(KEY, JSON.stringify(data));
  return json({ removed: 1, id: game.id });
}

// A live stream from /stream (same URL and key):
//   { "stream": { "url": "https://www.twitch.tv/name", "streamer": "day", "gameCode": "NNG646",
//                 "id": "W1-1", "week": 1, "series": 1, "teams": ["Team A", "Team B"] } }
// It goes on that game's card (and Live Now on the home page). "end": true takes it down; the game's
// final score, or STREAM_HOURS going by, turns it into the game's replay.
async function botStream(env, st) {
  const url = str(st && st.url, 300);
  if (!url || !STREAM_HOSTS.test(url)) return json({ error: "Send a YouTube or Twitch link." }, 400);
  const data = await load(env);
  const old = Date.now() - STREAM_HOURS * 3600 * 1000;
  retireStreams(data, (x) => x.source === "bot" && x.at < old);
  const link = (u) => u.toLowerCase().replace(/^https?:\/\/(www\.|m\.)?/, "").replace(/\/+$/, "");
  const sameUrl = (x) => link(x.url) === link(url);
  let log;
  if (st.end) {
    const had = data.streams.some(sameUrl);
    retireStreams(data, sameUrl);
    log = had ? `Ended the live stream ${url}` : "";
  } else {
    const game = findBotGame(data, st);
    const streamer = str(st.streamer, 40);
    const title = [streamer, game ? game.teams.join(" vs ") : str(st.title, 80)].filter(Boolean).join(" · ") || "UFF live stream";
    // One stream per link: going live again (or for another game) replaces the old one
    data.streams = [...data.streams.filter((x) => !sameUrl(x)),
      { id: crypto.randomUUID(), title, url, gameId: game ? game.id : undefined, at: Date.now(), source: "bot" }];
    log = `Added live stream "${title}"${game ? ` for ${game.id}` : ""}`;
  }
  if (log) data.activity = [{ at: Date.now(), by: "Discord bot", action: "addStream", text: log }, ...data.activity].slice(0, ACTIVITY_MAX);
  await env.UFF.put(KEY, JSON.stringify(data));
  const s = data.streams.find(sameUrl);
  return json({ live: !!s, gameId: (s && s.gameId) || null, title: (s && s.title) || null });
}

async function botSchedule(env, sched) {
  const tz = env.LEAGUE_TZ || "America/New_York";
  const gameTime = (v) => gameTimeText(v, tz);
  const problems = [];
  const weeks = [].concat((sched && sched.weeks) || []).slice(0, 40).map((w, wi) => {
    const week = Math.round(Number(w && w.week));
    if (!(week >= 1 && week <= 99)) { problems.push(`week #${wi + 1}: needs a week number`); return null; }
    const series = Math.round(Number(w.series));
    const games = [].concat(w.games || []).slice(0, 40).map((g, gi) => {
      const teams = [].concat((g && g.teams) || [g && g.home, g && g.away].filter(Boolean)).map((t) => str(t, 60));
      if (teams.length !== 2 || teams.some((t) => !t)) { problems.push(`week ${week} game #${gi + 1}: needs two teams`); return null; }
      return { id: str(String(g.id ?? ""), 20) || `W${week}-${gi + 1}`, teams, time: gameTime(g.time) };
    }).filter(Boolean);
    if (!games.length) { problems.push(`week ${week}: no games with two teams, left as it was`); return null; }
    return { ...(series >= 1 ? { series } : {}), week, games };
  }).filter(Boolean);
  if (!weeks.length && !(sched && sched.replace)) return json({ error: "No schedule weeks to save.", problems }, 400);

  const data = await load(env);
  const sent = new Set(weeks.map((w) => w.week));
  const matchups = () => new Map(data.schedule.flatMap((w) => w.games).map((g) => [g.id, g.teams.map(botTeamKey).sort().join("|")]));
  const before = matchups();
  data.schedule = [...(sched.replace ? [] : data.schedule.filter((w) => !sent.has(w.week))), ...weeks].sort((a, b) => a.week - b.week);
  // A game id that's now a different matchup (or gone) drops the old game's score, stats, stream and replay link
  const after = matchups();
  const changed = (id) => before.has(id) && after.get(id) !== before.get(id);
  data.results = data.results.filter((r) => !changed(r.id));
  data.streams = data.streams.filter((x) => !changed(x.gameId));
  data.vods.forEach((v) => { if (changed(v.gameId)) delete v.gameId; });
  const games = weeks.reduce((n, w) => n + w.games.length, 0);
  data.activity = [{ at: Date.now(), by: "Discord bot", action: "saveSchedule",
    text: weeks.length ? `${sched.replace ? "Replaced the schedule with" : "Updated"} week${weeks.length === 1 ? "" : "s"} ${weeks.map((w) => w.week).join(", ")} (${games} game${games === 1 ? "" : "s"})` : "Cleared the schedule" }, ...data.activity].slice(0, ACTIVITY_MAX);
  await env.UFF.put(KEY, JSON.stringify(data));
  return json({ weeks: weeks.length, games, problems });
}

async function botTransactions(req, env) {
  const key = String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.BOT_KEY || !key || !same(key, env.BOT_KEY)) return json({ error: "Wrong or missing bot key." }, 401);
  let body;
  try { body = await req.json(); } catch (e) { return json({ error: "Send JSON." }, 400); }
  if (body.schedule) return botSchedule(env, body.schedule);
  if (body.gameTime) return botGameTime(env, body.gameTime);
  if (body.score) return botScore(env, body.score);
  if (body.stream) return botStream(env, body.stream);
  if (body.rosters) return botRosters(env, body.rosters);
  if (body.vod || body.vods) return botVods(env, [].concat(body.vods || body.vod));
  const list = [].concat(body.transactions || (body.type ? [body] : []));
  const data = await load(env);
  const keyOf = (u) => [u.date, u.time, u.type, u.player, u.team].join("|").toLowerCase();
  const have = new Set(data.updates.map(keyOf));
  const ids = new Set(data.updates.map((u) => u.sourceId).filter(Boolean));
  const added = [], problems = [];
  let renamed = 0;
  list.slice(0, 50).forEach((t, i) => {
    const type = String(t.type || "").toLowerCase() === "offer" ? "sign" : String(t.type || "").toLowerCase();
    const when = leagueDateTime(t.time || Date.now(), env.LEAGUE_TZ || "America/New_York");
    const u = {
      id: crypto.randomUUID(), date: when && when.date, time: when && when.time, type,
      player: str(t.player), discord: str(t.discord), team: str(t.team), by: str(t.by), role: str(t.role), note: str(t.note, 120),
      sourceId: str(String(t.id ?? ""), 40), source: "bot"
    };
    if (!UPDATE_TYPES.includes(type) || !u.player || !u.team || !when) { problems.push(`#${i + 1}: needs type, player, team and a valid time`); return; }
    // "player" is the Roblox username and "discord" the Discord name the site used to store
    if (u.discord && addRename(data, u.discord, u.player)) renamed++;
    if ((u.sourceId && ids.has(u.sourceId)) || have.has(keyOf(u))) return; // already have it
    have.add(keyOf(u));
    if (u.sourceId) ids.add(u.sourceId);
    added.push(u);
  });
  if (added.length) {
    data.updates = [...data.updates, ...added];
    data.activity = [{ at: Date.now(), by: "Discord bot", action: "saveUpdates",
      text: `Added ${added.length} transaction${added.length === 1 ? "" : "s"}: ${added.map((u) => `${u.player} (${u.type}, ${u.team})`).join(", ")}` }, ...data.activity].slice(0, ACTIVITY_MAX);
  }
  if (renamed) data.activity = [{ at: Date.now(), by: "Discord bot", action: "renamePlayers", text: `Renamed ${renamed} player${renamed === 1 ? "" : "s"} to their Roblox username` }, ...data.activity].slice(0, ACTIVITY_MAX);
  if (added.length || renamed) await env.UFF.put(KEY, JSON.stringify(data));
  return json({ added: added.length, skipped: list.length - added.length - problems.length, renamed, problems }, problems.length && !added.length ? 400 : 200);
}

// A game replay or highlight from /vods (same URL and key); one or several:
//   { "vod": { "url": "https://www.twitch.tv/videos/123", "title": "...", "by": "day", "gameCode": "NNG646",
//              "id": "W1-1", "week": 1, "series": 1, "teams": ["Team A", "Team B"] } }   or   { "vods": [ ... ] }
// Tied to a game, it's that card's "▶ Stream" replay (the newest one shows), in place of the channel link kept
// from its live stream. Every VOD is on the VODs page. "remove": true takes that link down.
async function botVods(env, list) {
  const data = await load(env);
  const link = (u) => String(u).toLowerCase().replace(/^https?:\/\/(www\.|m\.)?/, "").replace(/\/+$/, "");
  const channelOnly = (u) => /twitch\.tv\/[A-Za-z0-9_]+\/?$/i.test(u) && !/\/videos\//i.test(u);
  const saved = [], problems = [];
  let removed = 0;
  list.slice(0, 20).forEach((v, i) => {
    const url = str(v && v.url, 300);
    if (!url || !STREAM_HOSTS.test(url)) { problems.push(`#${i + 1}: needs a YouTube or Twitch link`); return; }
    if (v.remove) {
      const before = data.vods.length;
      data.vods = data.vods.filter((x) => link(x.url) !== link(url));
      removed += before - data.vods.length;
      return;
    }
    const game = findBotGame(data, v);
    // The two teams, as the bot sent them (or from the game); the site shows their logos on the VOD card
    const sentTeams = [].concat(v.teams || []).map((t) => str(t, 60));
    const teams = sentTeams.length === 2 && sentTeams.every(Boolean) ? sentTeams : game ? game.teams : undefined;
    const title = str(v.title, 80) || (teams ? teams.join(" vs ") : "") || str(v.by, 40) || "UFF VOD";
    // The same link again updates it; a real replay replaces the live channel link kept for that game
    data.vods = data.vods.filter((x) => link(x.url) !== link(url) && !(game && x.gameId === game.id && channelOnly(x.url)));
    const vod = { id: crypto.randomUUID(), title, url, gameId: game ? game.id : undefined, teams, note: str(v.note, 80) || "", at: Date.now(), source: "bot" };
    data.vods = [vod, ...data.vods];
    saved.push(vod);
  });
  if (saved.length || removed) {
    data.activity = [{ at: Date.now(), by: "Discord bot", action: "addVod",
      text: [saved.length && `Added VOD${saved.length === 1 ? "" : "s"} ${saved.map((v) => `"${v.title}"${v.gameId ? ` for ${v.gameId}` : ""}`).join(", ")}`,
        removed && `Removed ${removed} VOD${removed === 1 ? "" : "s"}`].filter(Boolean).join("; ") }, ...data.activity].slice(0, ACTIVITY_MAX);
    await env.UFF.put(KEY, JSON.stringify(data));
  }
  return json({ added: saved.length, removed, vods: saved.map((v) => ({ title: v.title, gameId: v.gameId || null })), problems },
    problems.length && !saved.length && !removed ? 400 : 200);
}

// Old name -> Roblox username, applied by the site in order on top of the aliases in data.js, so a renamed player
// keeps their transactions, stats and positions. byId: matched by Roblox / Discord id, so it's surely the same person.
function addRename(data, from, to, byId) {
  from = str(from, 60);
  to = str(to, 60);
  if (!from || !to || from.toLowerCase() === to.toLowerCase()) return false;
  const last = data.renames.filter((r) => r.from.toLowerCase() === from.toLowerCase()).pop();
  if (last && last.to === to && (last.id || !byId)) return false; // already have it
  data.renames = [...data.renames, { from, to, at: Date.now(), ...(byId ? { id: true } : {}) }].slice(-RENAMES_MAX);
  return true;
}

// Every team's current roster from the bot (same URL and key):
//   { "rosters": { "replace": true, "teams": [{ "team": "San Francisco Miners", "players": [
//       { "name": "<Roblox username>", "discord": "<Discord name>", "discordId": "...", "robloxId": 123, "role": "Head Coach" }] }] } }
// replace: each team sent gets exactly this roster and staff (otherwise the players are added). It's a correction,
// so no transactions are made. Players are matched to who the site already has by Roblox id, Discord id, then Discord
// name, and renamed to their Roblox username.
async function botRosters(env, rs) {
  const problems = [];
  const data = await load(env);
  const now = Date.now();
  const when = leagueDateTime(now, env.LEAGUE_TZ || "America/New_York");
  const replace = rs.replace === true;
  const id = (v, re) => (re.test(String(v ?? "")) ? String(v) : undefined);
  let renamed = 0, players = 0;
  const saved = [];
  [].concat(rs.teams || []).slice(0, 25).forEach((t, ti) => {
    const team = str(t && t.team, 60);
    if (!team) { problems.push(`team #${ti + 1}: needs a team name or code`); return; }
    const list = [], seen = new Set();
    [].concat((t && t.players) || []).slice(0, 60).forEach((p, pi) => {
      const name = str(p && p.name, 60);
      if (!name) { problems.push(`${team} player #${pi + 1}: needs a name`); return; }
      if (seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());
      const discord = str(p.discord, 60);
      const robloxId = id(p.robloxId, /^\d{1,20}$/);
      const discordId = id(p.discordId, /^\d{5,25}$/);
      const known = (robloxId && data.people.find((x) => x.robloxId === robloxId)) || (discordId && data.people.find((x) => x.discordId === discordId));
      if (known && addRename(data, known.name, name, true)) renamed++;
      if (discord && addRename(data, discord, name)) renamed++;
      const person = { name, discord: discord || (known && known.discord), robloxId: robloxId || (known && known.robloxId), discordId: discordId || (known && known.discordId), at: now };
      if (known) Object.assign(known, person);
      else if (robloxId || discordId) data.people.push(person);
      const role = str(p.role, 40);
      list.push(role ? { name, role } : { name });
    });
    // A full roster replaces every earlier sync for that team
    const key = team.toLowerCase();
    if (replace) data.rosterSyncs = data.rosterSyncs.filter((s) => s.team.toLowerCase() !== key);
    saved.push({ team, date: when.date, time: when.time, at: now, replace, players: list });
    players += list.length;
  });
  if (!saved.length) return json({ error: "No teams to save.", problems }, 400);
  data.rosterSyncs = [...data.rosterSyncs, ...saved].slice(-SYNCS_MAX);
  data.people = data.people.slice(-PEOPLE_MAX);
  data.activity = [{ at: now, by: "Discord bot", action: "syncRosters",
    text: `Synced the roster${saved.length === 1 ? "" : "s"} of ${saved.map((s) => s.team).join(", ")} (${players} player${players === 1 ? "" : "s"}${renamed ? `, ${renamed} renamed` : ""})` }, ...data.activity].slice(0, ACTIVITY_MAX);
  await env.UFF.put(KEY, JSON.stringify(data));
  return json({ teams: saved.length, players, renamed, problems });
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const path = new URL(req.url).pathname;
    if (req.method === "GET" && path.startsWith("/img/")) return serveImage(env, path.slice(5));
    if (req.method === "GET") return json(publicData(await load(env)));
    if (req.method === "POST" && path === "/bot") return botTransactions(req, env);
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const { ADMIN_USERNAME, ADMIN_PASSWORD_HASH } = env;
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) return json({ error: "Admin login isn't set up yet." }, 500);

    let body;
    try { body = await req.json(); } catch (e) { return json({ error: "Bad request" }, 400); }

    if (body.action === "login") {
      const ok = String(body.username || "").trim().toLowerCase() === ADMIN_USERNAME.toLowerCase() &&
        same(await sha256(String(body.password || "")), ADMIN_PASSWORD_HASH);
      if (!ok) return json({ error: "Wrong username or password." }, 401);
      const name = str(body.name, 30) || ADMIN_USERNAME;
      const exp = Date.now() + TOKEN_HOURS * 3600 * 1000;
      return json({ username: ADMIN_USERNAME, name, token: `${exp}.${b64(name)}.${await sign(ADMIN_PASSWORD_HASH, `${exp}.${name}`)}` });
    }

    const by = await tokenName(env, body.token);
    if (!by) return json({ error: "Your login expired. Log in again." }, 401);
    const data = await load(env);
    if (body.action === "activity") return json({ activity: data.activity });
    if (body.action === "uploadImage") {
      const m = String(body.image || "").match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!m) return json({ error: "That file isn't a PNG, JPG or WebP picture." }, 400);
      const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
      if (bytes.length > IMAGE_MAX) return json({ error: "That picture is too big." }, 400);
      const id = crypto.randomUUID();
      await env.UFF.put(`img:${id}`, bytes, { metadata: { type: m[1], by } });
      return json({ url: `${new URL(req.url).origin}/img/${id}` });
    }

    let log = "";
    if (body.action === "saveResult") {
      const r = body.result || {};
      const score = Array.isArray(r.score) ? r.score.map(Number) : [];
      if (typeof r.id !== "string" || score.length !== 2 || score.some((n) => !Number.isFinite(n))) {
        return json({ error: "A result needs a game and both scores." }, 400);
      }
      // The same recap pasted twice (e.g. by two admins) is turned away
      const sourceHash = body.source ? await recapHash(body.source) : undefined;
      const dup = sourceHash && data.results.find((x) => x.sourceHash === sourceHash && Array.isArray(x.score)); // a game whose score was removed can take it again
      if (dup) return json({ error: `These exact stats were already entered for ${dup.id}.` }, 409);
      // A score the bot already posted keeps its date if the recap has none
      const prev = data.results.find((x) => x.id === r.id);
      const clean = { id: r.id, score, date: r.date || (prev && prev.date) || undefined, potg: r.potg || undefined, box: r.box || undefined, sourceHash };
      data.results = [...data.results.filter((x) => x.id !== r.id), clean];
      log = `Recorded ${str(body.label, 120) || `${r.id}: ${score[0]}-${score[1]}`}`;
    } else if (body.action === "deleteResult") {
      data.results = data.results.filter((x) => x.id !== body.id);
      log = `Removed the result for ${str(body.label, 120) || body.id}`;
    } else if (body.action === "saveUpdates") {
      const sourceHash = body.source ? await recapHash(body.source) : undefined;
      const dup = sourceHash && data.updates.find((x) => x.sourceHash === sourceHash);
      if (dup) return json({ error: "These exact transactions were already entered." }, 409);
      const key = (u) => [u.date, u.time, u.type, u.player, u.team].join("|").toLowerCase();
      const have = new Set(data.updates.map(key));
      const added = [];
      for (const u of [].concat(body.updates || [])) {
        const clean = {
          id: crypto.randomUUID(), date: str(u.date, 10), time: str(u.time, 5), type: str(u.type, 12),
          player: str(u.player), team: str(u.team), by: str(u.by), role: str(u.role), note: str(u.note, 120), sourceHash
        };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(clean.date || "") || !UPDATE_TYPES.includes(clean.type) || !clean.player || !clean.team) {
          return json({ error: "Each transaction needs a date, type, player and team." }, 400);
        }
        if (have.has(key(clean))) continue;
        have.add(key(clean));
        added.push(clean);
      }
      if (!added.length) return json({ error: "Those transactions are already on the Updates page." }, 409);
      data.updates = [...data.updates, ...added];
      log = `Added ${added.length} transaction${added.length === 1 ? "" : "s"}: ${added.map((u) => `${u.player} (${u.type}, ${u.team})`).join(", ")}`;
    } else if (body.action === "deleteUpdate") {
      const gone = data.updates.find((x) => x.id === body.id);
      data.updates = data.updates.filter((x) => x.id !== body.id);
      log = gone ? `Removed transaction: ${gone.player} (${gone.type}, ${gone.team})` : "Removed a transaction";
    } else if (body.action === "setPosition") {
      const name = String(body.name || "").trim();
      const list = [].concat(body.list || []).filter((p) => ["TE", "LB"].includes(p));
      if (!name) return json({ error: "Pick a player." }, 400);
      Object.keys(data.positions).filter((n) => n.toLowerCase() === name.toLowerCase()).forEach((n) => delete data.positions[n]);
      data.positions[name] = list;
      log = `Set ${name} to ${list.includes("TE") ? "TE" : "WR"} / ${list.includes("LB") ? "LB" : "DB"}`;
    } else if (body.action === "addStream") {
      const title = str(body.title, 80);
      const url = str(body.url, 300);
      if (!title || !url || !STREAM_HOSTS.test(url)) return json({ error: "Add a title and a YouTube or Twitch link." }, 400);
      data.streams = [...data.streams, { id: crypto.randomUUID(), title, url, gameId: str(body.gameId, 20), at: Date.now() }];
      log = `Added live stream "${title}"`;
    } else if (body.action === "removeStream") {
      const gone = data.streams.find((s) => s.id === body.id);
      data.streams = data.streams.filter((s) => s.id !== body.id);
      // keep: the stream was tied to a game, so it stays on that game card as its replay (VOD)
      if (gone && gone.gameId && body.keep) {
        data.vods = [{ id: crypto.randomUUID(), title: gone.title, url: gone.url, gameId: gone.gameId, note: "", at: Date.now() }, ...data.vods];
        log = `Ended live stream "${gone.title}" and kept it on ${gone.gameId} as a replay`;
      } else {
        log = `Removed live stream "${gone ? gone.title : "?"}"`;
      }
    } else if (body.action === "saveAllFlag") {
      // One season's All-Flag teams: [{ tier: 1-3, side: "offense"|"defense", pos, team, player }]
      const season = Math.round(Number(body.season));
      if (!(season >= 1 && season <= 99)) return json({ error: "Pick the season." }, 400);
      const picks = [].concat(body.picks || []).slice(0, 150).map((p) => ({
        tier: [1, 2, 3].includes(Number(p.tier)) ? Number(p.tier) : 0,
        side: p.side === "defense" ? "defense" : "offense",
        pos: str(p.pos, 4).toUpperCase(), team: str(p.team, 12).toUpperCase(), player: str(p.player, 60)
      })).filter((p) => p.tier && p.pos && p.player);
      if (!picks.length) return json({ error: "No All-Flag picks to save." }, 400);
      data.allFlag = { ...data.allFlag, [season]: picks };
      log = `Saved the Season ${season} All-Flag teams (${picks.length} picks)`;
    } else if (body.action === "deleteAllFlag") {
      const season = String(Math.round(Number(body.season)));
      const { [season]: gone, ...rest } = data.allFlag;
      data.allFlag = rest;
      log = `Removed the Season ${season} All-Flag teams`;
    } else if (body.action === "savePlayoffs") {
      data.playoffs = cleanPlayoffs(body.playoffs);
      log = `Saved the playoff bracket "${data.playoffs.title}"`;
    } else if (body.action === "saveTeam") {
      // key = the team's original name, or "+<id>" for a team added on the Admin page
      const key = str(body.key, 80);
      const t = body.team || {};
      const team = {
        name: str(t.name, 60), code: str(t.code, 5), coach: str(t.coach, 40),
        conference: str(t.conference, 60), division: str(t.division, 60),
        color: /^#[0-9a-f]{6}$/i.test(t.color || "") ? t.color : undefined,
        color2: /^#[0-9a-f]{6}$/i.test(t.color2 || "") ? t.color2 : undefined,
        logo: typeof t.logo === "string" && /^(https:\/\/[\w.-]+\/img\/[\w-]+|logos\/[\w\/.-]+\.(png|jpe?g|webp))$/.test(t.logo) ? t.logo : undefined
      };
      if (!key || !team.name || !team.conference || !team.division) return json({ error: "A team needs a name, conference and division." }, 400);
      data.teams = { ...data.teams, [key]: team };
      log = key.startsWith("+") ? `Saved new team ${team.name}` : `Edited team ${key}${team.name !== key ? ` (now ${team.name})` : ""}`;
    } else if (body.action === "removeTeam") {
      const key = String(body.key || "");
      if (!(key in data.teams)) return json({ error: "That team has no changes to remove." }, 400);
      const gone = data.teams[key];
      delete data.teams[key];
      log = key.startsWith("+") ? `Removed added team ${gone.name}` : `Reset team ${key} to its original details`;
    } else if (body.action === "setStats") {
      const name = str(body.name, 60);
      if (!name) return json({ error: "Pick a player." }, 400);
      Object.keys(data.statEdits).filter((n) => n.toLowerCase() === name.toLowerCase()).forEach((n) => delete data.statEdits[n]);
      if (body.stats) {
        const out = {};
        Object.entries(STAT_FIELDS).forEach(([g, fields]) => {
          const src = (body.stats || {})[g];
          if (!src) return;
          out[g] = {};
          fields.forEach((f) => { const v = Number(src[f]); out[g][f] = Number.isFinite(v) ? Math.round(v * 10) / 10 : 0; });
        });
        const gp = Number(body.stats.gp);
        if (Number.isFinite(gp) && gp >= 0) out.gp = Math.round(gp);
        data.statEdits[name] = out;
        log = `Edited Season stats for ${name}`;
      } else {
        log = `Reset ${name}'s stats to the box scores`;
      }
    } else if (body.action === "addVod") {
      const title = str(body.title, 80);
      const url = str(body.url, 300);
      if (!title || !url || !STREAM_HOSTS.test(url)) return json({ error: "Add a title and a YouTube or Twitch link." }, 400);
      data.vods = [{ id: crypto.randomUUID(), title, url, gameId: str(body.gameId, 20), note: str(body.note, 80), at: Date.now() }, ...data.vods];
      log = `Added VOD "${title}"${body.gameId ? ` for ${str(body.gameId, 20)}` : ""}`;
    } else if (body.action === "removeVod") {
      const gone = data.vods.find((v) => v.id === body.id);
      data.vods = data.vods.filter((v) => v.id !== body.id);
      log = `Removed VOD "${gone ? gone.title : "?"}"`;
    } else if (body.action === "saveBowls") {
      const bowls = {};
      Object.entries(body.bowls || {}).forEach(([season, b]) => {
        if (!/^\d{1,2}$/.test(season) || !b) return;
        const row = { champion: str(b.champion, 60), runnerUp: str(b.runnerUp, 60), scoreA: str(String(b.scoreA ?? ""), 4), scoreB: str(String(b.scoreB ?? ""), 4) };
        if (row.champion || row.runnerUp) bowls[season] = row;
      });
      data.bowls = bowls;
      log = "Saved United Flag Bowl history";
    } else {
      return json({ error: "Unknown action" }, 400);
    }

    data.activity = [{ at: Date.now(), by, action: body.action, text: log }, ...data.activity].slice(0, ACTIVITY_MAX);
    await env.UFF.put(KEY, JSON.stringify(data));
    return json(publicData(data));
  }
};

// Stores everything entered on the Admin page (Cloudflare Worker + KV): game results, transactions,
// position changes, live streams, the playoff bracket, United Flag Bowl history and an activity log.
//   GET  /                                     -> saved data (everything but the activity log)
//   POST / { action: "login", username, password, name } -> { username, name, token }
//   POST / { action, token, ... }              -> the saved data ("activity" returns the log)
//   POST /bot, GET /bot/deadlines, GET /bot/primetime (Authorization: Bearer <BOT_KEY>) -> the Discord bot (see below)
//   GET /avatars?names=a,b -> Roblox headshots for player profiles (see avatars)
//   GET /test, POST /test (Authorization: Bearer <GAME_KEY>) -> test log for the Roblox game (see gameTest)
// Secrets (set with `wrangler secret put`): ADMIN_USERNAME and ADMIN_PASSWORD_HASH (SHA-256 hex of the password).
const KEY = "data";
const EMPTY = { results: [], updates: [], positions: {}, streams: [], playoffs: null, bowls: {}, teams: {}, statEdits: {}, vods: [], allFlag: {}, schedule: [],
  renames: [], people: [], rosterSyncs: [], rosterMoves: [], awardGrants: [], recordGrants: [], deadlines: null, primetime: null, activity: [] };
const RENAMES_MAX = 3000;
const PEOPLE_MAX = 3000;
const SYNCS_MAX = 200;
const STAT_FIELDS = {
  passing: ["comp", "att", "yds", "td", "int", "lng", "sacked"],
  rushing: ["att", "yds", "td", "fum", "lng", "pre"],
  receiving: ["tgt", "rec", "yds", "td", "drop", "lng"],
  defense: ["tak", "tfl", "sck", "saf", "swat", "int", "pbu", "pre", "td", "yda", "tda"]
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
// and the series deadlines it's showing (with the bot's own date for each, for the Admin page), and the primetime games
const publicData = ({ activity, people, ...rest }) => ({ ...rest, people: (people || []).map((p) => ({ name: p.name, discord: p.discord })),
  deadlines: shownDeadlines(rest, true), primetime: (rest.primetime && rest.primetime.view) || null });

// The site checks for updates every 30 seconds, so reads are kept for a few seconds in this copy of the worker
// instead of hitting KV every time; a save here clears it right away
const READ_CACHE_MS = 10 * 1000;
let readCache = null; // { text, at }
async function publicText(env) {
  if (readCache && Date.now() - readCache.at < READ_CACHE_MS) return readCache.text;
  const data = await load(env);
  if (!(data.primetime && data.primetime.view)) await save(env, data); // the primetime games, the first time
  const text = JSON.stringify(publicData(data));
  readCache = { text, at: Date.now() };
  return text;
}
// Every save picks the primetime games again, since results, the schedule and game times all change them
async function save(env, data) {
  await refreshPrimetime(env, data);
  await env.UFF.put(KEY, JSON.stringify(data));
  readCache = null;
}

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
//                        "by": "...", "role": "...", "note": "...", "time": "<ISO time>", "id": "<Discord message id>",
//                        "discord": "<Discord name>", "robloxId": 123, "discordId": "..." }] }
// The site moves the player right away: release / demand take them off that team, sign / offer put them on it (and
// off any other), promotion keeps them on it. They're matched like a roster sync: Roblox / Discord id, then Discord name.
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
// The moment (ms) of an ISO time or timestamp, kept on the game as "at" so the site can count down to it
function gameTimeAt(v) {
  const s = String(v ?? "").trim();
  if (!/^\d{10,13}$/.test(s) && !/^\d{4}-\d{2}-\d{2}T/.test(s)) return undefined;
  const t = new Date(/^\d+$/.test(s) ? Number(s.length === 10 ? s + "000" : s) : s).getTime();
  return isNaN(t) ? undefined : t;
}

// Finds a game on the saved schedule from what the bot knows about it: the game id, the bot's game code
// (set with a game time), or the week (and series) plus the two teams in either order
const botTeamKey = (t) => String(t || "").replace(/:[^:\s]+:/g, "").replace(/@/g, "").replace(/\s+/g, " ").trim().toLowerCase();
// The bot's schedule names teams by code ("NO") but its game times and scores use the full name ("@New Orleans Raiders"),
// so both go through the league's team list (the one the primetime games last read) before they're compared
function gameTeamKey(data) {
  const { resolve } = ptTeams(ptState(data).teams, data.teams);
  return (t) => botTeamKey(resolve(t));
}
function findBotGame(data, q) {
  const key = gameTeamKey(data);
  const week = Math.round(Number(q && q.week));
  const series = Math.round(Number(q && q.series));
  const id = str(String((q && q.id) ?? ""), 20);
  const code = str(String((q && q.gameCode) ?? ""), 20);
  const pair = [].concat((q && q.teams) || [q && (q.team || q.team1), q && (q.opponent || q.team2)].filter(Boolean)).map(key).sort().join("|");
  const weeks = data.schedule.filter((w) => (!(week >= 1) || w.week === week) && (!(series >= 1) || !w.series || w.series === series));
  let game;
  weeks.some((w) => (game = w.games.find((g) => (id && g.id === id) || (code && g.code && g.code.toLowerCase() === code.toLowerCase()))));
  if (!game && pair.includes("|") && (week >= 1 || !id)) weeks.some((w) => (game = w.games.find((g) => g.teams.map(key).sort().join("|") === pair)));
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
  game.at = gameTimeAt(gt.time);
  if (!game.at) delete game.at;
  const code = str(String(gt.gameCode ?? ""), 20);
  if (code) game.code = code;
  data.activity = [{ at: Date.now(), by: "Discord bot", action: "saveSchedule",
    text: `${game.time ? `Set the time for ${game.id} (${game.teams.join(" vs ")}) to ${game.time}` : `Cleared the time for ${game.id}`}` }, ...data.activity].slice(0, ACTIVITY_MAX);
  await save(env, data);
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
  const key = gameTeamKey(data);
  const flip = key(game.teams[0]) === key(sc.teams[1]);
  const score = flip ? [scores[1], scores[0]] : scores;
  const when = leagueDateTime(sc.time || Date.now(), env.LEAGUE_TZ || "America/New_York");
  const old = data.results.find((r) => r.id === game.id);
  data.results = [...data.results.filter((r) => r.id !== game.id), { ...old, id: game.id, score, date: (old && old.date) || (when && when.date) || undefined }];
  // The game's live streams stay on its card as replays
  retireStreams(data, (x) => x.gameId === game.id);
  data.activity = [{ at: Date.now(), by: "Discord bot", action: "saveResult",
    text: `Recorded ${game.id}: ${game.teams[0]} ${score[0]}-${score[1]} ${game.teams[1]}` }, ...data.activity].slice(0, ACTIVITY_MAX);
  await save(env, data);
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
  await save(env, data);
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
  await save(env, data);
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
      return { id: str(String(g.id ?? ""), 20) || `W${week}-${gi + 1}`, teams, time: gameTime(g.time), at: gameTimeAt(g.time) };
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
  await save(env, data);
  return json({ weeks: weeks.length, games, problems });
}

async function botTransactions(req, env) {
  const key = String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.BOT_KEY || !key || !same(key, env.BOT_KEY)) return json({ error: "Wrong or missing bot key." }, 401);
  let body;
  try { body = await req.json(); } catch (e) { return json({ error: "Send JSON." }, 400); }
  if (body.deadlines) return botDeadlines(env, body.deadlines);
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
  const id = (v, re) => (re.test(String(v ?? "")) ? String(v) : undefined);
  list.slice(0, 50).forEach((t, i) => {
    const type = String(t.type || "").toLowerCase() === "offer" ? "sign" : String(t.type || "").toLowerCase();
    const when = leagueDateTime(t.time || Date.now(), env.LEAGUE_TZ || "America/New_York");
    const u = {
      id: crypto.randomUUID(), date: when && when.date, time: when && when.time, type,
      player: str(t.player), discord: str(t.discord), team: str(t.team), by: str(t.by), role: str(t.role), note: str(t.note, 120),
      sourceId: str(String(t.id ?? ""), 40), source: "bot"
    };
    if (!UPDATE_TYPES.includes(type) || !u.player || !u.team || !when) { problems.push(`#${i + 1}: needs type, player, team and a valid time`); return; }
    // "player" is the Roblox username and "discord" the Discord name the site used to store; someone the site knows
    // by their Roblox / Discord id under another name is renamed to it, like a roster sync does
    const robloxId = id(t.robloxId, /^\d{1,20}$/), discordId = id(t.discordId, /^\d{5,25}$/);
    const known = (robloxId && data.people.find((x) => x.robloxId === robloxId)) || (discordId && data.people.find((x) => x.discordId === discordId));
    if (known && addRename(data, known.name, u.player, true)) renamed++;
    if (u.discord && addRename(data, u.discord, u.player)) renamed++;
    if (robloxId || discordId) {
      const person = { name: u.player, discord: u.discord || (known && known.discord), robloxId: robloxId || (known && known.robloxId),
        discordId: discordId || (known && known.discordId), at: Date.now() };
      if (known) Object.assign(known, person);
      else data.people.push(person);
    }
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
  data.people = data.people.slice(-PEOPLE_MAX);
  if (added.length || renamed) await save(env, data);
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
    await save(env, data);
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
// replace: each team sent gets exactly this roster and staff (otherwise the players are added): anyone the bot put on
// the team who isn't listed comes off it (a free agent, unless another team's sync has them), stats kept. Players added
// by hand on the site stay (the site sees to that) until the bot lists them itself. It's a correction,
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
      // A player added by hand on the site (Admin -> Players) who the bot now lists, by Roblox id or the same username:
      // they become one player (stats kept, under the bot's name) and the bot decides their team from now on
      const byId = robloxId && known && known.robloxId === robloxId ? known.name : null;
      data.rosterMoves.filter((m) => m.source !== "bot" && m.team).forEach((m) => {
        const same = m.player.toLowerCase() === name.toLowerCase() || (byId && m.player.toLowerCase() === byId.toLowerCase());
        if (!same) return;
        m.source = "bot";
        m.merged = { at: now, team };
        if (addRename(data, m.player, name, true)) renamed++;
      });
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
  await save(env, data);
  return json({ teams: saved.length, players, renamed, problems });
}

// ---- Series deadlines ----
// Every game in a series has to be played by its deadline (11:59 PM Eastern, DEADLINE_DAYS apart by default).
// The bot sends them (POST /bot { deadlines }); an admin can change one on the site, and that edit wins over what
// the bot sends until it's reset; the bot reads back what the site shows (GET /bot/deadlines) so Discord matches.
// Saved as { bot: { start, days, series: [{ series, weeks, deadline }] }, edits: { [series]: { deadline, weeks } },
//            site: { start, days } (the Admin page's "Start date" form), updatedAt }
const isoTime = (v) => {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const d = new Date(v);
  return isNaN(d) ? null : d.toISOString();
};
const isDay = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(`${v}T00:00:00Z`));
const cleanWeeks = (v, fallback) => {
  const weeks = [...new Set([].concat(v || []).map((n) => Math.round(Number(n))).filter((n) => n >= 1 && n <= 99))].sort((a, b) => a - b);
  return weeks.length ? weeks.slice(0, 20) : [fallback];
};
const deadlineState = (data) => ({ bot: null, edits: {}, site: null, updatedAt: null, ...(data.deadlines || {}) });

// What the site shows: the bot's deadlines with the admin edits on top. withBot adds the bot's own date (Admin page).
function shownDeadlines(data, withBot) {
  const d = deadlineState(data);
  const bot = (d.bot && d.bot.series) || [];
  const nums = [...new Set([...bot.map((s) => s.series), ...Object.keys(d.edits).map(Number)])].sort((a, b) => a - b);
  const from = d.site || d.bot || {};
  return {
    start: from.start || null,
    days: from.days || null,
    series: nums.map((n) => {
      const b = bot.find((s) => s.series === n);
      const e = d.edits[n];
      return { series: n, weeks: (b && b.weeks) || (e && e.weeks) || [n], deadline: e ? e.deadline : b.deadline, edited: !!e,
        ...(withBot ? { bot: b ? b.deadline : null } : {}) };
    }),
    updatedAt: d.updatedAt
  };
}

// The moment a league-time date and time ("2026-11-02", "23:59") happens, as an ISO time
function leagueInstant(date, time, tz) {
  const want = Date.parse(`${date}T${time}:00Z`);
  if (isNaN(want)) return null;
  let t = want;
  for (let i = 0; i < 3; i++) {
    const p = leagueDateTime(t, tz);
    t += want - Date.parse(`${p.date}T${p.time}:00Z`);
  }
  return new Date(t).toISOString();
}
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
// "Nov 14", plus the time when it isn't 11:59 PM, for the activity log
function shortDeadline(iso, tz) {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(d);
  const p = leagueDateTime(d.getTime(), tz);
  return p.time === "23:59" ? day : `${day} ${new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d)} ET`;
}

//   POST /bot { "deadlines": { "start": "2026-10-23", "days": 10,
//     "series": [{ "series": 1, "weeks": [1, 2], "deadline": "2026-11-03T04:59:00.000Z" }] } }
// Replaces the bot's deadlines (an empty list clears them); deadlines edited on the site stay until reset.
async function botDeadlines(env, dl) {
  const tz = env.LEAGUE_TZ || "America/New_York";
  const sent = [].concat((dl && dl.series) || []);
  const problems = [];
  const seen = new Set();
  const series = sent.slice(0, 99).map((s, i) => {
    const n = Math.round(Number(s && s.series));
    if (!(n >= 1 && n <= 99)) { problems.push(`#${i + 1}: needs a series number`); return null; }
    const deadline = isoTime(s.deadline);
    if (!deadline) { problems.push(`series ${n}: needs a deadline (ISO time)`); return null; }
    if (seen.has(n)) { problems.push(`series ${n}: sent twice, kept the first`); return null; }
    seen.add(n);
    return { series: n, weeks: cleanWeeks(s.weeks, n), deadline };
  }).filter(Boolean).sort((a, b) => a.series - b.series);
  if (sent.length && !series.length) return json({ error: "No deadlines to save.", series: 0, problems }, 400);
  const days = Number(dl && dl.days);
  const bot = { start: isDay(dl && dl.start) ? dl.start : null, days: days >= 1 && days <= 60 ? days : null, series };

  const data = await load(env);
  const d = deadlineState(data);
  if (JSON.stringify(d.bot) !== JSON.stringify(bot)) {
    d.bot = bot;
    d.updatedAt = new Date().toISOString();
    data.deadlines = d;
    const edited = series.filter((s) => d.edits[s.series]).length;
    data.activity = [{ at: Date.now(), by: "Discord bot", action: "deadlines",
      text: series.length ? `Got ${series.length} series deadline${series.length === 1 ? "" : "s"} from the bot: ${series.map((s) => `Series ${s.series} → ${shortDeadline(s.deadline, tz)}`).join(", ")}${edited ? ` (${edited} edited on the site, those stay)` : ""}`
        : "The bot cleared its series deadlines" }, ...data.activity].slice(0, ACTIVITY_MAX);
    await save(env, data);
  }
  return json({ series: series.length, problems });
}

// GET /bot/deadlines: the deadlines the site is showing, admin edits included ("edited": true)
async function botReadDeadlines(req, env) {
  const key = String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.BOT_KEY || !key || !same(key, env.BOT_KEY)) return json({ error: "Wrong or missing bot key." }, 401);
  return json(shownDeadlines(await load(env)));
}

// Admin -> Deadlines. Returns the log line, or a Response for a mistake.
function adminDeadlines(env, data, body) {
  const tz = env.LEAGUE_TZ || "America/New_York";
  const d = deadlineState(data);
  const n = Math.round(Number(body.series));
  let log;
  if (body.action === "setDeadline") {
    // "local": the date and time in Eastern, as a date-time picker gives it ("2026-11-14T23:59")
    const m = String(body.local || "").match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    const deadline = m && isDay(m[1]) ? leagueInstant(m[1], m[2], tz) : null;
    if (!(n >= 1 && n <= 99)) return json({ error: "Pick the series." }, 400);
    if (!deadline) return json({ error: "Pick a date and time." }, 400);
    const shown = shownDeadlines(data).series.find((s) => s.series === n);
    d.edits = { ...d.edits, [n]: { deadline, weeks: shown ? shown.weeks : cleanWeeks(body.weeks, n) } };
    log = `Series ${n} → ${shortDeadline(deadline, tz)}`;
  } else if (body.action === "recalcDeadlines") {
    // Every series again from a start date: Series n = start + n × days, at 11:59 PM
    const days = Math.round(Number(body.days));
    if (!isDay(body.start)) return json({ error: "Pick the start date." }, 400);
    if (!(days >= 1 && days <= 60)) return json({ error: "Days between has to be 1 to 60." }, 400);
    // The series the site knows, plus the ones on the schedule (sent by the Admin page) that have no deadline yet
    const list = new Map(shownDeadlines(data).series.map((s) => [s.series, s.weeks]));
    [].concat(body.list || []).slice(0, 99).forEach((s) => {
      const k = Math.round(Number(s && s.series));
      if (k >= 1 && k <= 99 && !list.has(k)) list.set(k, cleanWeeks(s.weeks, k));
    });
    if (!list.size) return json({ error: "There's no schedule to set deadlines for yet." }, 400);
    d.edits = Object.fromEntries([...list].sort((a, b) => a[0] - b[0]).map(([k, weeks]) => [k, { deadline: leagueInstant(addDays(body.start, k * days), "23:59", tz), weeks }]));
    d.site = { start: body.start, days };
    log = `From ${shortDeadline(leagueInstant(body.start, "23:59", tz), tz)}, ${days} days apart: ${Object.entries(d.edits).map(([k, e]) => `Series ${k} → ${shortDeadline(e.deadline, tz)}`).join(", ")}`;
  } else {
    if (!d.edits[n]) return json({ error: "That series already has the bot's date." }, 400);
    const { [n]: gone, ...rest } = d.edits;
    d.edits = rest;
    if (!Object.keys(rest).length) d.site = null;
    const bot = ((d.bot && d.bot.series) || []).find((s) => s.series === n);
    log = bot ? `Series ${n} → back to the bot's date (${shortDeadline(bot.deadline, tz)})` : `Series ${n} → no deadline (the bot hasn't sent one)`;
  }
  d.updatedAt = new Date().toISOString();
  data.deadlines = d;
  return log; // the activity log shows it under "Deadlines"
}

// ---- Primetime games ----
// The marquee game(s) of each series: its games between two top seeds, best first (lowest seed total; ties: the
// better seed of the worse team, then the earlier game). Seeds come from the standings (win %, point differential,
// points for), so they're only there once a game is final; until then the admin picks. An admin can star or unstar
// any game (that wins over the automatic pick) and give it a label. A series that's started (a game is final) or is
// within PT_LOCK_HOURS of its first game keeps the automatic pick and seeds it had. The bot reads them at GET /bot/primetime.
// Saved as { settings: { perSeries, topSeeds }, manual: { [gameId]: true|false }, labels: { [gameId]: "Rivalry Night" },
//            auto: { [series]: { ids, seeds: { team: seed }, locked } }, teams: [{ name, code }] (the last team list read),
//            view: what the site and the bot get, updatedAt (changes whenever the view does) }
const PT_LOCK_HOURS = 48;
const PT_DEFAULTS = { perSeries: 1, topSeeds: 6 };
const SITE_DATA = "https://uffleague.github.io/data.js";
const ptState = (data) => ({ manual: {}, labels: {}, auto: {}, teams: [], view: null, updatedAt: null, ...(data.primetime || {}),
  settings: { ...PT_DEFAULTS, ...((data.primetime || {}).settings || {}) } });

// The league's teams ({ name, code }, in data.js order) from the site's data.js, read again every 10 minutes.
// The bot's schedule names teams by code, so this is how "DET" becomes Detroit Dynasty.
let siteTeams = null; // { list, at }
async function leagueTeams(env, lastRead) {
  if (!siteTeams || Date.now() - siteTeams.at > 10 * 60 * 1000) {
    try {
      const res = await fetch(env.SITE_DATA || SITE_DATA);
      const text = res.ok ? await res.text() : "";
      const at = text.indexOf("conferences:");
      const list = at < 0 ? [] : [...text.slice(at).matchAll(/\{\s*name:\s*"([^"]+)",\s*code:\s*"([^"]*)"/g)].map((m) => ({ name: m[1], code: m[2] }));
      if (list.length) siteTeams = { list, at: Date.now() };
    } catch (e) {}
  }
  return siteTeams ? siteTeams.list : lastRead;
}

// Team names as the site shows them (data.js with the Admin -> Teams edits on top), and resolve() to read the bot's
// names and codes ("DET", ":DET: Detroit Dynasty") the way the site does
function ptTeams(list, edits) {
  const teams = list.map((t) => ({ ...t, key: t.name, keys: [t.name, t.code] }));
  Object.entries(edits || {}).forEach(([key, e]) => {
    if (!e || !e.name) return;
    const t = teams.find((x) => x.key === key);
    if (t) { t.name = e.name; t.code = e.code || t.code; t.keys.push(e.name, e.code); }
    else if (key.startsWith("+")) teams.push({ name: e.name, code: e.code || "", key, keys: [e.name, e.code] });
  });
  const lookup = new Map();
  teams.forEach((t) => t.keys.filter(Boolean).forEach((k) => lookup.set(botTeamKey(k), t.name)));
  // A nickname the bot has differently still matches by its city when only one team has it
  const city = (n) => n.split(" ").slice(0, -1).join(" ");
  const resolve = (name) => {
    const k = botTeamKey(name);
    if (lookup.has(k)) return lookup.get(k);
    const same = city(k) ? teams.filter((t) => city(t.name.toLowerCase()) === city(k)) : [];
    return same.length === 1 ? same[0].name : str(String(name).replace(/:[^:\s]+:/g, "").replace(/@/g, ""), 60) || String(name);
  };
  return { names: teams.map((t) => t.name), resolve };
}

// Each team's seed (1 = best) from the final scores: win %, then point differential, then points for (then data.js
// order, like the Standings page). null before any game is final: the site has no last-season standings to go by.
function ptSeeds(data, names, resolve) {
  const rec = new Map(names.map((n, i) => [n, { n, i, w: 0, l: 0, pf: 0, pa: 0 }]));
  const scores = new Map(data.results.filter((r) => Array.isArray(r.score)).map((r) => [r.id, r.score]));
  let finals = 0;
  data.schedule.forEach((w) => w.games.forEach((g) => {
    const s = scores.get(g.id);
    if (!s) return;
    finals++;
    g.teams.map(resolve).forEach((n, k) => {
      const t = rec.get(n);
      if (!t) return;
      t.pf += s[k];
      t.pa += s[1 - k];
      if (s[k] !== s[1 - k]) s[k] > s[1 - k] ? t.w++ : t.l++;
    });
  }));
  if (!finals) return null;
  const pct = (t) => (t.w + t.l ? t.w / (t.w + t.l) : 0);
  const order = [...rec.values()].sort((a, b) => pct(b) - pct(a) || (b.pf - b.pa) - (a.pf - a.pa) || b.pf - a.pf || a.i - b.i);
  return Object.fromEntries(order.map((t, i) => [t.n, i + 1]));
}

// When a game starts (ms): its "at", or its time as the site shows it ("Sat, Oct 25, 8:00 PM EDT"; no year, so the
// one nearest to now). null when it has no time, or one written some other way.
const US_ZONES = { E: -5, C: -6, M: -7, P: -8 };
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function gameStart(g, now) {
  if (Number.isFinite(g.at)) return g.at;
  const m = String(g.time || "").match(/\b([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{1,2}):(\d{2})\s*([AP])M\s+([ECMP])([DS])T\b/i);
  const mon = m ? MONTHS.indexOf(m[1].toLowerCase()) : -1;
  if (mon < 0) return null;
  const hour = (Number(m[3]) % 12) + (m[5].toUpperCase() === "P" ? 12 : 0);
  const offset = US_ZONES[m[6].toUpperCase()] + (m[7].toUpperCase() === "D" ? 1 : 0);
  const year = new Date(now).getUTCFullYear();
  return [year - 1, year, year + 1].map((y) => Date.UTC(y, mon, Number(m[2]), hour - offset, Number(m[4])))
    .sort((a, b) => Math.abs(a - now) - Math.abs(b - now))[0];
}

// Picks the primetime games again and rebuilds what the site and bot see (run by every save)
async function refreshPrimetime(env, data) {
  try {
    const pt = ptState(data);
    const now = Date.now();
    pt.teams = (await leagueTeams(env, pt.teams)).map(({ name, code }) => ({ name, code }));
    const { names, resolve } = ptTeams(pt.teams, data.teams);
    const seeds = ptSeeds(data, names, resolve);
    const finals = new Set(data.results.filter((r) => Array.isArray(r.score)).map((r) => r.id));
    // Each series (a schedule without series: each week) with its games in schedule order
    const series = new Map();
    let order = 0;
    [...data.schedule].sort((a, b) => a.week - b.week).forEach((w) => {
      const n = w.series || w.week;
      if (!series.has(n)) series.set(n, { series: n, weeks: [], games: [] });
      const s = series.get(n);
      s.weeks.push(w.week);
      w.games.forEach((g) => s.games.push({ id: g.id, week: w.week, order: order++, teams: g.teams.map(resolve), final: finals.has(g.id), start: gameStart(g, now) }));
    });
    const { perSeries, topSeeds } = pt.settings;
    const worst = (sd, g) => Math.max(...g.teams.map((t) => sd[t] || 999));
    const total = (sd, g) => g.teams.reduce((n, t) => n + (sd[t] || 999), 0);
    const log = [];
    const auto = {};
    series.forEach((s, n) => {
      const starts = s.games.map((g) => g.start).filter(Number.isFinite);
      const lockNow = s.games.some((g) => g.final) || (starts.length > 0 && now >= Math.min(...starts) - PT_LOCK_HOURS * 3600e3);
      const prev = pt.auto[n];
      if (prev && (prev.locked || lockNow)) { auto[n] = { ...prev, locked: true }; return; }
      // The seeds of this series' teams stay with the pick, so a locked series shows the seeds it was picked with
      const sd = seeds ? Object.fromEntries(s.games.flatMap((g) => g.teams).filter((t) => seeds[t]).map((t) => [t, seeds[t]])) : {};
      const ids = s.games.filter((g) => g.teams.every((t) => sd[t] && sd[t] <= topSeeds))
        .sort((a, b) => total(sd, a) - total(sd, b) || worst(sd, a) - worst(sd, b) || a.order - b.order)
        .slice(0, perSeries).map((g) => g.id);
      auto[n] = { ids, seeds: sd, locked: lockNow };
      if (ids.join() !== (prev ? prev.ids.join() : "")) {
        const what = ids.map((id) => { const g = s.games.find((x) => x.id === id); return `${id} (${g.teams.map((t) => `#${sd[t]}`).join(" vs ")})`; });
        log.push(`Series ${n} · automatic pick: ${what.length ? what.join(", ") : `none (no game between two top-${topSeeds} seeds)`}`);
      }
    });

    const view = {
      settings: pt.settings,
      seeded: !!seeds,
      series: [...series.values()].map((s) => {
        const a = auto[s.series];
        const sd = a.locked ? { ...(seeds || {}), ...a.seeds } : seeds || {};
        const all = s.games.map((g) => {
          const m = pt.manual[g.id];
          return { id: g.id, week: g.week, teams: g.teams, seeds: g.teams.map((t) => sd[t] || null), start: g.start || null, final: g.final,
            auto: a.ids.includes(g.id), manual: typeof m === "boolean" ? m : null, primetime: m === true || (m !== false && a.ids.includes(g.id)),
            label: pt.labels[g.id] || null };
        });
        const rank = (g) => (g.seeds.every(Boolean) ? g.seeds[0] + g.seeds[1] : 999);
        const top = (g) => (g.seeds.every(Boolean) ? Math.max(...g.seeds) : 999);
        const games = all.filter((g) => g.primetime).sort((x, y) => rank(x) - rank(y) || top(x) - top(y))
          .map((g) => ({ id: g.id, teams: g.teams, seeds: g.seeds, label: g.label || "Primetime", manual: g.manual === true }));
        return { series: s.series, weeks: s.weeks, locked: a.locked, games, all };
      })
    };
    const { updatedAt: was, ...old } = pt.view || {};
    if (JSON.stringify(view) !== JSON.stringify(old) || !pt.updatedAt) pt.updatedAt = new Date(now).toISOString();
    view.updatedAt = pt.updatedAt;
    pt.view = view;
    pt.auto = auto;
    data.primetime = pt;
    if (log.length) data.activity = [...log.reverse().map((text) => ({ at: now, by: "Automatic (standings)", action: "primetime", text })), ...data.activity].slice(0, ACTIVITY_MAX);
  } catch (e) {
    console.log("primetime refresh failed", e && e.stack);
  }
}

// GET /bot/primetime: every series and its primetime games, admin picks included ("manual": true)
async function botReadPrimetime(req, env) {
  const key = String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.BOT_KEY || !key || !same(key, env.BOT_KEY)) return json({ error: "Wrong or missing bot key." }, 401);
  const data = await load(env);
  if (!(data.primetime && data.primetime.view)) await save(env, data); // first read after this was added
  const view = data.primetime && data.primetime.view;
  if (!view) return json({ updatedAt: null, series: [] });
  return json({ updatedAt: view.updatedAt, series: view.series.map((s) => ({ series: s.series,
    games: s.games.map((g) => ({ id: g.id, teams: g.teams, seeds: g.seeds, label: g.label, manual: g.manual })) })) });
}

// Admin -> Primetime. Returns the log line, or a Response for a mistake.
function adminPrimetime(data, body) {
  const pt = ptState(data);
  let log;
  if (body.action === "ptSettings") {
    const perSeries = Math.round(Number(body.perSeries));
    const topSeeds = Math.round(Number(body.topSeeds));
    if (!(perSeries >= 0 && perSeries <= 3)) return json({ error: "Primetime games per series has to be 0 to 3." }, 400);
    if (!(topSeeds >= 2 && topSeeds <= 32)) return json({ error: "Top seeds has to be 2 to 32." }, 400);
    pt.settings = { perSeries, topSeeds };
    log = `Settings · ${perSeries} game${perSeries === 1 ? "" : "s"} per series, top ${topSeeds} seeds`;
  } else if (body.action === "ptReset") {
    const n = Math.round(Number(body.series));
    const ids = data.schedule.filter((w) => (w.series || w.week) === n).flatMap((w) => w.games.map((g) => g.id));
    if (!ids.some((id) => id in pt.manual)) return json({ error: "That series already uses the automatic pick." }, 400);
    pt.manual = Object.fromEntries(Object.entries(pt.manual).filter(([id]) => !ids.includes(id)));
    log = `Series ${n} · reset to automatic`;
  } else {
    const id = str(body.id, 20);
    const w = id && data.schedule.find((x) => x.games.some((g) => g.id === id));
    if (!w) return json({ error: "That game isn't on the schedule. Reload and try again." }, 400);
    const where = `Series ${w.series || w.week} · ${id}`;
    if (body.action === "ptStar") {
      pt.manual = { ...pt.manual, [id]: body.on === true };
      log = `${where} ${body.on === true ? "starred" : "unstarred"}`;
    } else {
      const label = str(body.label, 24);
      const { [id]: gone, ...rest } = pt.labels;
      pt.labels = label ? { ...rest, [id]: label } : rest;
      log = label ? `${where} labeled "${label}"` : `${where} label cleared`;
    }
  }
  data.primetime = pt;
  return log; // the activity log shows it under "Primetime"
}

// Roblox head-and-shoulders pictures for player profiles (Roblox's API can't be called from other websites, so the site asks here)
//   GET /avatars?names=a,b,c  -> { avatars: { "<name lowercase>": "<image url>" | null } }
// null = that name has no Roblox account or no picture. A name left out couldn't be checked right now (Roblox down,
// busy, or the picture is still being made), so the site tries again later. A player the bot knows uses their Roblox
// id; anyone else is looked up by their exact Roblox username. Answers are kept in KV for a day (6 hours for a miss).
const AVATAR_KEY = "busts";
const AVATAR_MAX_NAMES = 50;
const AVATAR_KEEP = 3000;
const AVATAR_HIT_MS = 24 * 3600 * 1000;
const AVATAR_MISS_MS = 6 * 3600 * 1000;
const ROBLOX_NAME = /^[A-Za-z0-9_]{3,20}$/;
let avatarMemo = null; // this copy of the worker's view of the KV list
async function avatars(req, env) {
  const asked = [...new Set(String(new URL(req.url).searchParams.get("names") || "").split(",")
    .map((n) => n.trim().toLowerCase()).filter(Boolean))].slice(0, AVATAR_MAX_NAMES);
  const out = {};
  asked.filter((n) => !ROBLOX_NAME.test(n)).forEach((n) => { out[n] = null; }); // can't be a Roblox username
  const valid = asked.filter((n) => ROBLOX_NAME.test(n));
  const now = Date.now();
  const fresh = (e) => e && now - e.at < (e.url ? AVATAR_HIT_MS : AVATAR_MISS_MS);
  if (!avatarMemo || valid.some((n) => !fresh(avatarMemo[n]))) avatarMemo = (await env.UFF.get(AVATAR_KEY, { type: "json" })) || {};
  const cache = avatarMemo;
  const stale = valid.filter((n) => {
    if (!fresh(cache[n])) return true;
    out[n] = cache[n].url;
    return false;
  });

  if (stale.length) {
    const found = {}; // name -> { url } | { url: null }, only what Roblox actually answered
    // Roblox ids the bot has for these names, then the rest by username
    const ids = {};
    const people = (await load(env)).people || [];
    stale.forEach((n) => {
      const p = people.find((x) => x.robloxId && String(x.name || "").toLowerCase() === n);
      if (p && /^\d{1,20}$/.test(String(p.robloxId))) ids[n] = String(p.robloxId);
    });
    const byName = stale.filter((n) => !ids[n]);
    if (byName.length) {
      try {
        const res = await fetch("https://users.roblox.com/v1/usernames/users", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ usernames: byName, excludeBannedUsers: true })
        });
        if (res.ok) {
          const list = ((await res.json()) || {}).data || [];
          byName.forEach((n) => {
            const u = list.find((x) => String(x.requestedUsername || "").toLowerCase() === n);
            if (u && u.id) ids[n] = String(u.id);
            else found[n] = { url: null }; // no such account
          });
        }
      } catch (e) {}
    }
    const want = Object.entries(ids);
    if (want.length) {
      try {
        const q = [...new Set(want.map(([, id]) => id))].join(",");
        const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-bust?userIds=${q}&size=420x420&format=Png&isCircular=false`);
        if (res.ok) {
          const list = ((await res.json()) || {}).data || [];
          want.forEach(([n, id]) => {
            const t = list.find((x) => String(x.targetId) === id);
            if (t && t.state === "Completed" && /^https:\/\/[\w.-]+\.rbxcdn\.com\//.test(t.imageUrl || "")) found[n] = { url: t.imageUrl };
            else if (t && t.state !== "Pending") found[n] = { url: null }; // blocked or no picture
          });
        }
      } catch (e) {}
    }
    Object.entries(found).forEach(([n, { url }]) => {
      out[n] = url;
      cache[n] = { url, at: now };
    });
    if (Object.keys(found).length) {
      const keep = Object.entries(cache).sort((a, b) => b[1].at - a[1].at).slice(0, AVATAR_KEEP);
      avatarMemo = Object.fromEntries(keep);
      await env.UFF.put(AVATAR_KEY, JSON.stringify(avatarMemo));
    }
  }
  return new Response(JSON.stringify({ avatars: out }), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=300", ...CORS }
  });
}

// Test endpoint for hooking up the Roblox game; it only keeps a log of what was sent and never touches the site's data
//   POST /test  Authorization: Bearer <GAME_KEY>  { ...any JSON... }  -> { ok, received }
//   GET  /test  -> { ok, recent: [the last TEST_MAX posts, newest first] }
const TEST_KEY = "test";
const TEST_MAX = 20;
const TEST_BYTES = 64 * 1024;
async function gameTest(req, env) {
  const recent = (await env.UFF.get(TEST_KEY, { type: "json" })) || [];
  if (req.method === "GET") return json({ ok: true, time: new Date().toISOString(), recent });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const key = String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.GAME_KEY || !key || !same(key, env.GAME_KEY)) return json({ error: "Wrong or missing game key." }, 401);
  const text = await req.text();
  if (text.length > TEST_BYTES) return json({ error: "That's too big (64 KB max)." }, 400);
  let body;
  try { body = JSON.parse(text); } catch (e) { return json({ error: "Send JSON." }, 400); }
  const entry = { at: new Date().toISOString(), robloxServer: req.headers.get("roblox-id") || undefined, body };
  await env.UFF.put(TEST_KEY, JSON.stringify([entry, ...recent].slice(0, TEST_MAX)));
  return json({ ok: true, received: body });
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const path = new URL(req.url).pathname;
    if (req.method === "GET" && path.startsWith("/img/")) return serveImage(env, path.slice(5));
    if (req.method === "GET" && path.replace(/\/+$/, "") === "/bot/deadlines") return botReadDeadlines(req, env);
    if (req.method === "GET" && path.replace(/\/+$/, "") === "/bot/primetime") return botReadPrimetime(req, env);
    if (req.method === "GET" && path.replace(/\/+$/, "") === "/test") return gameTest(req, env);
    if (req.method === "GET" && path.replace(/\/+$/, "") === "/avatars") return avatars(req, env);
    if (req.method === "GET") {
      return new Response(await publicText(env), { headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS } });
    }
    if (req.method === "POST" && path === "/bot") return botTransactions(req, env);
    if (path.replace(/\/+$/, "") === "/test") return gameTest(req, env);
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
    if (["setDeadline", "recalcDeadlines", "resetDeadline"].includes(body.action)) {
      log = adminDeadlines(env, data, body);
      if (log instanceof Response) return log;
    } else if (["ptSettings", "ptStar", "ptLabel", "ptReset"].includes(body.action)) {
      log = adminPrimetime(data, body);
      if (log instanceof Response) return log;
    } else if (body.action === "saveResult") {
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
    } else if (body.action === "editGameLine") {
      // One player's line in one game's box score: fix it (stats), take it out (stats: null), or add one (index -1)
      const r = data.results.find((x) => x.id === body.id);
      const side = Number(body.side);
      const group = String(body.group || "");
      if (!r || ![0, 1].includes(side) || !STAT_FIELDS[group]) return json({ error: "Couldn't find that game's box score. Reload and try again." }, 400);
      if (!Array.isArray(r.box)) r.box = [{}, {}];
      const box = (r.box[side] = r.box[side] || {});
      const list = (box[group] = Array.isArray(box[group]) ? box[group] : []);
      const clean = (src) => Object.fromEntries(STAT_FIELDS[group].map((f) => { const v = Number(src[f]); return [f, Number.isFinite(v) ? Math.round(v * 10) / 10 : 0]; }));
      const index = Number(body.index);
      if (index === -1) {
        const player = str(body.player, 60);
        if (!player || !body.stats) return json({ error: "Pick a player." }, 400);
        list.push({ player, ...clean(body.stats) });
        log = `Added a ${group} line for ${player} to ${r.id}`;
      } else {
        const line = Number.isInteger(index) ? list[index] : null;
        if (!line) return json({ error: "That stat line changed since you loaded it. Reload and try again." }, 409);
        if (!body.stats) {
          list.splice(index, 1);
          if (!list.length) delete box[group];
          log = `Removed ${line.player}'s ${group} line from ${r.id}`;
        } else {
          Object.assign(line, clean(body.stats));
          if (group === "passing") line.cmpPct = line.att ? ((line.comp / line.att) * 100).toFixed(1) : "0.0";
          if (group === "rushing" && line.ypc != null) line.ypc = line.att ? (line.yds / line.att).toFixed(1) : "0.0";
          log = `Edited ${line.player}'s ${group} line in ${r.id}`;
        }
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
    } else if (body.action === "editPlayer") {
      // Admin -> Players: a new name (the old one still counts as them; the site applies admin renames after the
      // bot's, so they win) and/or the team they're on from now on ("" = free agent), without making a transaction
      const player = str(body.player, 60);
      const name = str(body.name, 60);
      const moving = typeof body.team === "string";
      const team = moving ? str(body.team, 60) || null : undefined;
      if (!player) return json({ error: "Pick a player." }, 400);
      if (!name && !moving) return json({ error: "Type a new name or pick a team." }, 400);
      const done = [];
      if (name && name !== player) {
        data.renames = [...data.renames, { id: crypto.randomUUID(), from: player, to: name, at: Date.now(), admin: true }].slice(-RENAMES_MAX);
        done.push(`renamed ${player} to ${name}`);
      }
      if (moving) {
        const when = leagueDateTime(Date.now(), env.LEAGUE_TZ || "America/New_York");
        // source "manual": a bot roster sync doesn't take them off the team (see botRosters for when the bot takes over)
        data.rosterMoves = [...data.rosterMoves, { id: crypto.randomUUID(), player: name || player, team, date: when.date, time: when.time, at: Date.now(), source: "manual" }].slice(-SYNCS_MAX);
        done.push(team ? `put ${name || player} on the ${team}` : `made ${name || player} a free agent`);
      }
      if (!done.length) return json({ error: "That's already their name." }, 400);
      log = done.join(" and ").replace(/^./, (c) => c.toUpperCase());
    } else if (body.action === "giveAward") {
      // Admin -> Honors: an award for a season (Awards page, the player's honors and Legacy)
      const season = Math.round(Number(body.season));
      const code = String(body.code || "").toUpperCase();
      const player = str(body.player, 60);
      if (!(season >= 1 && season <= 99)) return json({ error: "Pick the season." }, 400);
      if (!/^[A-Z0-9_]{2,20}$/.test(code)) return json({ error: "Pick the award." }, 400);
      if (!player) return json({ error: "Pick a player." }, 400);
      data.awardGrants = [...data.awardGrants, { id: crypto.randomUUID(), season, code, player, at: Date.now() }].slice(-500);
      log = `Gave ${player} ${str(body.label, 60) || code} (Season ${season})`;
    } else if (body.action === "giveRecord") {
      // Admin -> Honors: who holds a record and its value. An existing record (by its label) is set to this and no longer
      // updates from stats; a new one goes in the group and section given.
      const label = str(body.label, 80);
      const holders = [].concat(body.holders || []).map((h) => str(h, 60)).filter(Boolean).slice(0, 10);
      const value = str(String(body.value ?? ""), 30);
      const season = Math.round(Number(body.season));
      if (!label) return json({ error: "Pick a record or name the new one." }, 400);
      if (!holders.length) return json({ error: "Add who holds it." }, 400);
      if (!value) return json({ error: "Add the record's value." }, 400);
      data.recordGrants = [...data.recordGrants, {
        id: crypto.randomUUID(), label, holders, value, season: season >= 1 && season <= 99 ? season : undefined,
        group: str(body.group, 60), section: str(body.section, 40), at: Date.now()
      }].slice(-300);
      log = `Set the record "${label}" to ${holders.join(" & ")} (${value}${season >= 1 ? `, Season ${season}` : ""})`;
    } else if (body.action === "undoHonor") {
      const award = data.awardGrants.find((g) => g.id === body.id);
      const record = data.recordGrants.find((g) => g.id === body.id);
      if (!award && !record) return json({ error: "That's already gone." }, 400);
      data.awardGrants = data.awardGrants.filter((g) => g !== award);
      data.recordGrants = data.recordGrants.filter((g) => g !== record);
      log = award ? `Took back ${award.player}'s ${award.code} (Season ${award.season})` : `Undid the record change "${record.label}"`;
    } else if (body.action === "undoPlayerEdit") {
      const rename = data.renames.find((r) => r.admin && r.id === body.id);
      const move = data.rosterMoves.find((m) => m.id === body.id);
      if (!rename && !move) return json({ error: "That change is already gone." }, 400);
      data.renames = data.renames.filter((r) => r !== rename);
      data.rosterMoves = data.rosterMoves.filter((m) => m !== move);
      log = rename ? `Undid renaming ${rename.from} to ${rename.to}` : `Undid ${move.team ? `putting ${move.player} on the ${move.team}` : `making ${move.player} a free agent`}`;
    } else {
      return json({ error: "Unknown action" }, 400);
    }

    data.activity = [{ at: Date.now(), by, action: body.action, text: log }, ...data.activity].slice(0, ACTIVITY_MAX);
    await save(env, data);
    return json(publicData(data));
  }
};

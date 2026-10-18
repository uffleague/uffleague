// Stores everything entered on the Admin page (Cloudflare Worker + KV): game results, transactions,
// position changes, live streams, the playoff bracket, United Flag Bowl history and an activity log.
//   GET  /                                     -> saved data (everything but the activity log)
//   POST / { action: "login", username, password, name } -> { username, name, token }
//   POST / { action, token, ... }              -> the saved data ("activity" returns the log)
// Secrets (set with `wrangler secret put`): ADMIN_USERNAME and ADMIN_PASSWORD_HASH (SHA-256 hex of the password).
const KEY = "data";
const EMPTY = { results: [], updates: [], positions: {}, streams: [], playoffs: null, bowls: {}, teams: {}, statEdits: {}, vods: [], activity: [] };
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
const publicData = ({ activity, ...rest }) => rest;

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
async function botTransactions(req, env) {
  const key = String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.BOT_KEY || !key || !same(key, env.BOT_KEY)) return json({ error: "Wrong or missing bot key." }, 401);
  let body;
  try { body = await req.json(); } catch (e) { return json({ error: "Send JSON." }, 400); }
  const list = [].concat(body.transactions || (body.type ? [body] : []));
  const data = await load(env);
  const keyOf = (u) => [u.date, u.time, u.type, u.player, u.team].join("|").toLowerCase();
  const have = new Set(data.updates.map(keyOf));
  const ids = new Set(data.updates.map((u) => u.sourceId).filter(Boolean));
  const added = [], problems = [];
  list.slice(0, 50).forEach((t, i) => {
    const type = String(t.type || "").toLowerCase() === "offer" ? "sign" : String(t.type || "").toLowerCase();
    const when = leagueDateTime(t.time || Date.now(), env.LEAGUE_TZ || "America/New_York");
    const u = {
      id: crypto.randomUUID(), date: when && when.date, time: when && when.time, type,
      player: str(t.player), team: str(t.team), by: str(t.by), role: str(t.role), note: str(t.note, 120),
      sourceId: str(String(t.id ?? ""), 40), source: "bot"
    };
    if (!UPDATE_TYPES.includes(type) || !u.player || !u.team || !when) { problems.push(`#${i + 1}: needs type, player, team and a valid time`); return; }
    if ((u.sourceId && ids.has(u.sourceId)) || have.has(keyOf(u))) return; // already have it
    have.add(keyOf(u));
    if (u.sourceId) ids.add(u.sourceId);
    added.push(u);
  });
  if (added.length) {
    data.updates = [...data.updates, ...added];
    data.activity = [{ at: Date.now(), by: "Discord bot", action: "saveUpdates",
      text: `Added ${added.length} transaction${added.length === 1 ? "" : "s"}: ${added.map((u) => `${u.player} (${u.type}, ${u.team})`).join(", ")}` }, ...data.activity].slice(0, ACTIVITY_MAX);
    await env.UFF.put(KEY, JSON.stringify(data));
  }
  return json({ added: added.length, skipped: list.length - added.length - problems.length, problems }, problems.length && !added.length ? 400 : 200);
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
      const dup = sourceHash && data.results.find((x) => x.sourceHash === sourceHash);
      if (dup) return json({ error: `These exact stats were already entered for ${dup.id}.` }, 409);
      const clean = { id: r.id, score, date: r.date || undefined, potg: r.potg || undefined, box: r.box || undefined, sourceHash };
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
      log = `Removed live stream "${gone ? gone.title : "?"}"`;
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

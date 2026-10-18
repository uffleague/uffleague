// Stores everything entered on the Admin page (Cloudflare Worker + KV): game results, transactions,
// position changes, live streams, the playoff bracket, United Flag Bowl history and an activity log.
//   GET  /                                     -> saved data (everything but the activity log)
//   POST / { action: "login", username, password, name } -> { username, name, token }
//   POST / { action, token, ... }              -> the saved data ("activity" returns the log)
// Secrets (set with `wrangler secret put`): ADMIN_USERNAME and ADMIN_PASSWORD_HASH (SHA-256 hex of the password).
const KEY = "data";
const EMPTY = { results: [], updates: [], positions: {}, streams: [], playoffs: null, bowls: {}, activity: [] };
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

const STREAM_HOSTS = /^https:\/\/(www\.|m\.)?(twitch\.tv|youtube\.com|youtu\.be)\//i;

// Keep only the bracket fields the site uses
function cleanPlayoffs(p) {
  const slot = (v) => str(v, 60) || "";
  const from = (v) => (Number.isInteger(v) && v >= 0 && v < 64 ? v : null);
  return {
    title: str(p && p.title, 80) || "Playoffs",
    logo: typeof (p && p.logo) === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(p.logo) && p.logo.length < 400000 ? p.logo : "",
    rounds: [].concat((p && p.rounds) || []).slice(0, 10).map((r) => ({
      name: str(r && r.name, 40) || "Round",
      games: [].concat((r && r.games) || []).slice(0, 32).map((g) => ({
        a: slot(g && g.a), b: slot(g && g.b),
        sa: str(String((g && g.sa) ?? ""), 4) || "", sb: str(String((g && g.sb) ?? ""), 4) || "",
        adv: g && (g.adv === "a" || g.adv === "b") ? g.adv : "",
        fromA: from(g && g.fromA), fromB: from(g && g.fromB)
      }))
    }))
  };
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (req.method === "GET") return json(publicData(await load(env)));
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
      data.streams = [...data.streams, { id: crypto.randomUUID(), title, url, at: Date.now() }];
      log = `Added live stream "${title}"`;
    } else if (body.action === "removeStream") {
      const gone = data.streams.find((s) => s.id === body.id);
      data.streams = data.streams.filter((s) => s.id !== body.id);
      log = `Removed live stream "${gone ? gone.title : "?"}"`;
    } else if (body.action === "savePlayoffs") {
      data.playoffs = cleanPlayoffs(body.playoffs);
      log = `Saved the playoff bracket "${data.playoffs.title}"`;
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

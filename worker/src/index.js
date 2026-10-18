// Stores game results, transactions and position changes entered on the Admin page (Cloudflare Worker + KV).
//   GET  /                         -> { results, updates, positions }
//   POST / { action: "login", username, password } -> { username, token }
//   POST / { action, token, ... }  -> the saved data
// Secrets (set with `wrangler secret put`): ADMIN_USERNAME and ADMIN_PASSWORD_HASH (SHA-256 hex of the password).
const KEY = "data";
const EMPTY = { results: [], updates: [], positions: {} };
const UPDATE_TYPES = ["sign", "demand", "release", "promotion"];
const TOKEN_HOURS = 12;

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

// Fingerprint of a pasted recap; spacing and blank lines don't count, the words and numbers do
const recapHash = (text) =>
  sha256(String(text).split(/\r?\n/).map((l) => l.trim().replace(/\s+/g, " ")).filter(Boolean).join("\n"));

async function validToken(env, token) {
  const [exp, sig] = String(token || "").split(".");
  return Number(exp) > Date.now() && !!sig && same(sig, await sign(env.ADMIN_PASSWORD_HASH, exp));
}

async function load(env) {
  const data = (await env.UFF.get(KEY, { type: "json" })) || {};
  return { ...EMPTY, ...data };
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (req.method === "GET") return json(await load(env));
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const { ADMIN_USERNAME, ADMIN_PASSWORD_HASH } = env;
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) return json({ error: "Admin login isn't set up yet." }, 500);

    let body;
    try { body = await req.json(); } catch (e) { return json({ error: "Bad request" }, 400); }

    if (body.action === "login") {
      const ok = String(body.username || "").trim().toLowerCase() === ADMIN_USERNAME.toLowerCase() &&
        same(await sha256(String(body.password || "")), ADMIN_PASSWORD_HASH);
      if (!ok) return json({ error: "Wrong username or password." }, 401);
      const exp = Date.now() + TOKEN_HOURS * 3600 * 1000;
      return json({ username: ADMIN_USERNAME, token: `${exp}.${await sign(ADMIN_PASSWORD_HASH, exp)}` });
    }

    if (!(await validToken(env, body.token))) return json({ error: "Your login expired. Log in again." }, 401);
    const data = await load(env);

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
    } else if (body.action === "deleteResult") {
      data.results = data.results.filter((x) => x.id !== body.id);
    } else if (body.action === "saveUpdates") {
      const sourceHash = body.source ? await recapHash(body.source) : undefined;
      const dup = sourceHash && data.updates.find((x) => x.sourceHash === sourceHash);
      if (dup) return json({ error: "These exact transactions were already entered." }, 409);
      const str = (v, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
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
    } else if (body.action === "deleteUpdate") {
      data.updates = data.updates.filter((x) => x.id !== body.id);
    } else if (body.action === "setPosition") {
      const name = String(body.name || "").trim();
      const list = [].concat(body.list || []).filter((p) => ["TE", "LB"].includes(p));
      if (!name) return json({ error: "Pick a player." }, 400);
      Object.keys(data.positions).filter((n) => n.toLowerCase() === name.toLowerCase()).forEach((n) => delete data.positions[n]);
      data.positions[name] = list;
    } else {
      return json({ error: "Unknown action" }, 400);
    }

    await env.UFF.put(KEY, JSON.stringify(data));
    return json(data);
  }
};

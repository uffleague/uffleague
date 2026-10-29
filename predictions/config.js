// Local settings. Each can be changed with an environment variable. The only secret is the PIN pepper (loadPepper).
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const SITE_ROOT = join(HERE, "..");
export const LOCAL_DIR = join(HERE, ".local"); // git-ignored: databases and the PIN pepper

const int = (v, fallback, min, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

export const CONFIG = {
  host: "127.0.0.1", // never anything else: this server is for this computer only
  port: int(process.env.PRED_PORT, 4173, 1024, 65535),
  startBalance: int(process.env.PRED_START_BALANCE, 500, 1, 1000000), // virtual points a new account starts with (once)
  defaultStake: int(process.env.PRED_DEFAULT_STAKE, 50, 1, 1000),
  maxStake: 100,
  minLeaderboard: int(process.env.PRED_MIN_LEADERBOARD, 3, 1, 100),
  // Read-only: the same public GET the site makes on every page load. Nothing is ever written to it.
  liveUrl: "https://uff-admin.uffleague.workers.dev",
  liveCacheMs: 60 * 1000,
  sessionDays: 7,        // a session ends a week after sign-in...
  sessionIdleHours: 24,  // ...or after a day unused
  // Set PRED_SECURE_COOKIES=1 when serving over HTTPS (any production use): cookies then only travel over HTTPS
  secureCookies: process.env.PRED_SECURE_COOKIES === "1"
};

// The live League Admin's staff login, kept only on this computer, so the local server can log staff and admin site
// accounts in to it (Admin's league tabs). Saved with: node predictions/accounts.js set-league-login <username>
// (or PRED_LEAGUE_USERNAME + PRED_LEAGUE_PASSWORD). Never sent to the browser. null = not set up.
export const LEAGUE_LOGIN_FILE = join(LOCAL_DIR, "league-login.json");
export function loadLeagueLogin() {
  if (process.env.PRED_LEAGUE_USERNAME && process.env.PRED_LEAGUE_PASSWORD) return { username: process.env.PRED_LEAGUE_USERNAME, password: process.env.PRED_LEAGUE_PASSWORD };
  try {
    const v = JSON.parse(readFileSync(LEAGUE_LOGIN_FILE, "utf8"));
    return v && v.username && v.password ? { username: String(v.username), password: String(v.password) } : null;
  } catch (e) { return null; }
}

export const dbPath = (demo) => process.env.PRED_DB || join(LOCAL_DIR, demo ? "predictions-demo.db" : "predictions.db");

// The PIN pepper: a secret mixed into every PIN hash and kept outside the database, so a copy of the database alone
// can't be used to try all 100,000 PINs. Made once in predictions/.local/pepper.key (git-ignored) or set as PRED_PEPPER
// (64 hex characters). Losing it means every PIN has to be set again (node predictions/accounts.js set-pin).
export function loadPepper() {
  if (process.env.PRED_PEPPER) {
    if (!/^[0-9a-f]{64}$/i.test(process.env.PRED_PEPPER)) throw new Error("PRED_PEPPER has to be 64 hex characters.");
    return Buffer.from(process.env.PRED_PEPPER, "hex");
  }
  const file = join(LOCAL_DIR, "pepper.key");
  if (!existsSync(file)) {
    mkdirSync(LOCAL_DIR, { recursive: true });
    writeFileSync(file, randomBytes(32).toString("hex"), { mode: 0o600 });
  }
  return Buffer.from(readFileSync(file, "utf8").trim(), "hex");
}

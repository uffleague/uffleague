// Local settings. Each can be changed with an environment variable; none of them are secrets.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const SITE_ROOT = join(HERE, "..");
export const LOCAL_DIR = join(HERE, ".local"); // git-ignored: databases and the local admin password

const int = (v, fallback, min, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

export const CONFIG = {
  host: "127.0.0.1", // never anything else: this server is for this computer only
  port: int(process.env.PRED_PORT, 4173, 1024, 65535),
  startBalance: int(process.env.PRED_START_BALANCE, 1000, 1, 1000000),
  defaultStake: int(process.env.PRED_DEFAULT_STAKE, 50, 1, 1000),
  maxStake: 100,
  minLeaderboard: int(process.env.PRED_MIN_LEADERBOARD, 3, 1, 100),
  // Read-only: the same public GET the site makes on every page load. Nothing is ever written to it.
  liveUrl: "https://uff-admin.uffleague.workers.dev",
  liveCacheMs: 60 * 1000,
  sessionDays: 7
};

export const dbPath = (demo) => process.env.PRED_DB || join(LOCAL_DIR, demo ? "predictions-demo.db" : "predictions.db");

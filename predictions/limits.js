// Rate limits for sensitive actions (redemptions, challenge entries, admin changes): at most `max` per window per key.
// Kept in the auth_throttle table so they hold across restarts.
import { HttpError } from "./errors.js";

export function createLimiter({ db, now = Date.now }) {
  return function hit(key, max, windowMs) {
    const k = `act:${key}`;
    const r = db.prepare("SELECT * FROM auth_throttle WHERE key = ?").get(k) || { failures: 0, window_start: 0 };
    let count = r.failures, start = r.window_start;
    if (now() - start > windowMs) { count = 0; start = now(); }
    if (count >= max) throw new HttpError(429, `That's a lot of requests in a short time. Try again in ${Math.ceil((start + windowMs - now()) / 1000)} seconds.`);
    db.prepare(`INSERT INTO auth_throttle (key, failures, window_start, last_failure, locked_until) VALUES (?, ?, ?, ?, 0)
      ON CONFLICT(key) DO UPDATE SET failures = excluded.failures, window_start = excluded.window_start, last_failure = excluded.last_failure`)
      .run(k, count + 1, start, now());
  };
}

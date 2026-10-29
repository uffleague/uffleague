-- Undoes 003. Points history from the new kinds (challenge awards, admin adjustments, redemptions) can't fit the
-- old ledger, so it's dropped; balances are left as they are. Roles collapse back to is_admin (admin and above).
-- For development only: running 003 again afterwards returns held points on still-open picks a second time
-- (undoing it forgets which picks were already made free).
DROP TRIGGER IF EXISTS audit_no_update;
DROP TRIGGER IF EXISTS audit_no_delete;
DROP INDEX IF EXISTS audit_action;
DROP INDEX IF EXISTS audit_target;
ALTER TABLE audit DROP COLUMN target_id;
ALTER TABLE audit DROP COLUMN target_type;

DROP TRIGGER IF EXISTS ledger_no_update;
DROP TRIGGER IF EXISTS ledger_no_delete;
CREATE TABLE ledger_v2 (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  at INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('grant', 'stake', 'payout', 'refund', 'reversal')),
  market_id INTEGER REFERENCES markets(id),
  prediction_id INTEGER REFERENCES predictions(id),
  round INTEGER NOT NULL DEFAULT 0,
  note TEXT
);
INSERT INTO ledger_v2 (id, user_id, at, delta, balance_after, kind, market_id, prediction_id, round, note)
  SELECT id, user_id, at, delta, balance_after, kind, market_id, prediction_id, round, note FROM ledger
  WHERE kind IN ('grant', 'stake', 'payout', 'refund', 'reversal');
DROP TABLE ledger;
ALTER TABLE ledger_v2 RENAME TO ledger;
CREATE UNIQUE INDEX ledger_once ON ledger(prediction_id, kind, round) WHERE prediction_id IS NOT NULL;
CREATE INDEX ledger_user ON ledger(user_id, id);

ALTER TABLE predictions DROP COLUMN mode;
DROP TABLE IF EXISTS redemptions;
DROP TABLE IF EXISTS rewards;
DROP TABLE IF EXISTS challenge_picks;
DROP TABLE IF EXISTS challenge_entries;
DROP TABLE IF EXISTS challenge_legs;
DROP TABLE IF EXISTS challenges;

ALTER TABLE sessions DROP COLUMN elevated_until;
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
UPDATE users SET is_admin = 1 WHERE role IN ('admin', 'super_admin');
CREATE TRIGGER users_role_fixed BEFORE UPDATE OF is_admin ON users BEGIN SELECT RAISE(ABORT, 'is_admin never changes'); END;
ALTER TABLE users DROP COLUMN last_sign_in_at;
ALTER TABLE users DROP COLUMN staff_secret;
ALTER TABLE users DROP COLUMN status;
ALTER TABLE users DROP COLUMN role_granted_by;
ALTER TABLE users DROP COLUMN role_granted_at;
ALTER TABLE users DROP COLUMN role;

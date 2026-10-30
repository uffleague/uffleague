-- 003: roles and account status, one append-only points ledger, audit targets, free picks,
--      multi-pick challenges, and the rewards shop

/* ---------- Roles: user < staff < admin < super_admin, on the same accounts (no second user table) ---------- */
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'staff', 'admin', 'super_admin'));
ALTER TABLE users ADD COLUMN role_granted_at INTEGER;
ALTER TABLE users ADD COLUMN role_granted_by INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended'));
-- An admin password (Argon2id) that staff and admins enter to unlock admin tools; a PIN alone never does
ALTER TABLE users ADD COLUMN staff_secret TEXT;
ALTER TABLE users ADD COLUMN last_sign_in_at INTEGER;
UPDATE users SET last_sign_in_at = created_at WHERE credential = 'pin';
-- The password-only admin the server used to make by itself is retired (no default admin accounts):
-- admins are now ordinary accounts given a role
UPDATE users SET status = 'suspended' WHERE is_admin = 1;
DROP TRIGGER IF EXISTS users_role_fixed;
ALTER TABLE users DROP COLUMN is_admin;

-- Unlocking admin tools lasts a short while on that one session
ALTER TABLE sessions ADD COLUMN elevated_until INTEGER NOT NULL DEFAULT 0;

/* ---------- Challenges (free to enter: they only ever add points) ---------- */
CREATE TABLE challenges (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'settled', 'cancelled')),
  entry_deadline INTEGER NOT NULL,
  points_per_leg INTEGER NOT NULL CHECK (points_per_leg >= 0),
  perfect_bonus INTEGER NOT NULL CHECK (perfect_bonus >= 0),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  demo INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER,
  settled_at INTEGER,
  cancelled_at INTEGER,
  cancel_note TEXT,
  CHECK (points_per_leg + perfect_bonus > 0)
);
CREATE TABLE challenge_legs (
  id INTEGER PRIMARY KEY,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id),
  position INTEGER NOT NULL,
  market_id INTEGER NOT NULL REFERENCES markets(id),
  UNIQUE (challenge_id, market_id)
);
CREATE TABLE challenge_entries (
  id INTEGER PRIMARY KEY,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'scored', 'void')),
  correct INTEGER, wrong INTEGER, voided INTEGER, award INTEGER,
  settled_at INTEGER,
  UNIQUE (challenge_id, user_id)   -- one entry per person per challenge
);
CREATE TABLE challenge_picks (
  entry_id INTEGER NOT NULL REFERENCES challenge_entries(id),
  leg_id INTEGER NOT NULL REFERENCES challenge_legs(id),
  selection TEXT NOT NULL,
  result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'won', 'lost', 'void')),
  PRIMARY KEY (entry_id, leg_id)
);

/* ---------- Rewards shop ---------- */
CREATE TABLE rewards (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('badge', 'title', 'decoration', 'recognition', 'cosmetic', 'other')),
  icon TEXT NOT NULL DEFAULT 'star',
  image TEXT,
  cost INTEGER NOT NULL CHECK (cost > 0),
  inventory INTEGER CHECK (inventory IS NULL OR inventory >= 0),       -- null = no limit
  per_user_limit INTEGER CHECK (per_user_limit IS NULL OR per_user_limit >= 1),
  requires_approval INTEGER NOT NULL DEFAULT 1,
  requirements TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0,
  demo INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE redemptions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  reward_id INTEGER NOT NULL REFERENCES rewards(id),
  reward_name TEXT NOT NULL,
  cost INTEGER NOT NULL CHECK (cost > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'fulfilled', 'rejected', 'cancelled', 'refunded')),
  idempotency_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  decided_by INTEGER REFERENCES users(id), decided_at INTEGER, decision_note TEXT,
  fulfilled_by INTEGER REFERENCES users(id), fulfilled_at INTEGER, fulfillment_note TEXT,
  refunded_at INTEGER, refund_note TEXT,
  UNIQUE (user_id, idempotency_key)   -- a retried or double-clicked request is the same request
);
CREATE INDEX redemptions_status ON redemptions(status, created_at);
CREATE INDEX redemptions_user ON redemptions(user_id, created_at);

/* ---------- The ledger, rebuilt: transaction ids, before/after, actor, links, idempotency keys; append-only ---------- */
CREATE TABLE ledger_v3 (
  id INTEGER PRIMARY KEY,
  tx_id TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  at INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('grant', 'stake', 'payout', 'refund', 'reversal', 'challenge_award',
    'admin_credit', 'admin_debit', 'admin_set', 'redeem', 'redeem_refund')),
  delta INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  market_id INTEGER REFERENCES markets(id),
  prediction_id INTEGER REFERENCES predictions(id),
  challenge_id INTEGER REFERENCES challenges(id),
  redemption_id INTEGER REFERENCES redemptions(id),
  round INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  actor_id INTEGER REFERENCES users(id),
  idempotency_key TEXT UNIQUE,
  CHECK (balance_after = balance_before + delta)
);
INSERT INTO ledger_v3 (id, tx_id, user_id, at, kind, delta, balance_before, balance_after, market_id, prediction_id, round, note)
  SELECT id, lower(hex(randomblob(16))), user_id, at, kind, delta, balance_after - delta, balance_after, market_id, prediction_id, round, note FROM ledger;
DROP TABLE ledger;
ALTER TABLE ledger_v3 RENAME TO ledger;
CREATE UNIQUE INDEX ledger_once ON ledger(prediction_id, kind, round) WHERE prediction_id IS NOT NULL;
CREATE INDEX ledger_user ON ledger(user_id, id);

/* ---------- Free picks: a market pick no longer holds points; a correct pick earns the market's points ---------- */
ALTER TABLE predictions ADD COLUMN mode TEXT NOT NULL DEFAULT 'stake' CHECK (mode IN ('stake', 'free'));
-- Points held on open picks go back now (one ledger row per person), and those picks are scored the free way
INSERT INTO ledger (tx_id, user_id, at, kind, delta, balance_before, balance_after, note)
  SELECT lower(hex(randomblob(16))), u.id, CAST(strftime('%s', 'now') AS INTEGER) * 1000, 'refund', h.held, u.balance, u.balance + h.held,
    'Picks are free now: points held on open picks returned'
  FROM users u JOIN (SELECT user_id, SUM(stake) AS held FROM predictions WHERE result = 'pending' AND mode = 'stake' GROUP BY user_id) h ON h.user_id = u.id;
UPDATE users SET balance = balance + (SELECT SUM(stake) FROM predictions p WHERE p.user_id = users.id AND p.result = 'pending' AND p.mode = 'stake')
  WHERE id IN (SELECT user_id FROM predictions WHERE result = 'pending' AND mode = 'stake');
UPDATE predictions SET mode = 'free' WHERE result = 'pending';

-- Nobody edits or deletes points history
CREATE TRIGGER ledger_no_update BEFORE UPDATE ON ledger BEGIN SELECT RAISE(ABORT, 'ledger rows are never changed'); END;
CREATE TRIGGER ledger_no_delete BEFORE DELETE ON ledger BEGIN SELECT RAISE(ABORT, 'ledger rows are never deleted'); END;

/* ---------- Audit: what each entry is about; append-only ---------- */
ALTER TABLE audit ADD COLUMN target_type TEXT;
ALTER TABLE audit ADD COLUMN target_id TEXT;
UPDATE audit SET target_type = 'market', target_id = CAST(market_id AS TEXT) WHERE market_id IS NOT NULL;
CREATE INDEX audit_target ON audit(target_type, target_id);
CREATE INDEX audit_action ON audit(action, id);
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT, 'audit entries are never changed'); END;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT, 'audit entries are never deleted'); END;

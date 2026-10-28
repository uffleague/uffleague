-- UFF Predictions, local development database (virtual points only)

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash TEXT NOT NULL,
  pass_salt TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  -- Kept equal to the sum of this user's ledger rows. Only a reversal of a disputed payout can take it below 0.
  balance INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE markets (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('player_ou', 'game_winner')),
  game_id TEXT NOT NULL,
  game_week INTEGER,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  kickoff_at INTEGER,
  player TEXT,
  player_team TEXT,
  player_names TEXT,          -- JSON list of every name this player's box score lines can be under
  stat_key TEXT,
  line REAL,
  stake INTEGER NOT NULL CHECK (stake > 0),
  opens_at INTEGER,
  closes_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'open', 'locked', 'resolved', 'void')),
  hold TEXT CHECK (hold IS NULL OR hold IN ('postponed', 'disputed')),
  settlement_round INTEGER NOT NULL DEFAULT 0,
  demo INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (kind = 'game_winner' OR (player IS NOT NULL AND stat_key IS NOT NULL AND line IS NOT NULL))
);
CREATE INDEX markets_game ON markets(game_id);

CREATE TABLE predictions (
  id INTEGER PRIMARY KEY,
  market_id INTEGER NOT NULL REFERENCES markets(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  selection TEXT NOT NULL,
  stake INTEGER NOT NULL CHECK (stake > 0),
  result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'won', 'lost', 'push', 'void')),
  created_at INTEGER NOT NULL,
  settled_at INTEGER,
  UNIQUE (market_id, user_id)   -- one pick per person per market, no revisions
);
CREATE INDEX predictions_user ON predictions(user_id);

-- Every change to a balance. round = the market's settlement round, so a retried settlement can't pay twice.
CREATE TABLE ledger (
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
CREATE UNIQUE INDEX ledger_once ON ledger(prediction_id, kind, round) WHERE prediction_id IS NOT NULL;
CREATE INDEX ledger_user ON ledger(user_id, id);

CREATE TABLE resolutions (
  id INTEGER PRIMARY KEY,
  market_id INTEGER NOT NULL REFERENCES markets(id),
  round INTEGER NOT NULL,
  outcome TEXT NOT NULL,        -- over | under | a | b | push | void
  stat_value REAL,
  score_a INTEGER,
  score_b INTEGER,
  source TEXT NOT NULL CHECK (source IN ('box_score', 'manual', 'demo_result', 'void')),
  note TEXT,
  by_user INTEGER REFERENCES users(id),
  at INTEGER NOT NULL,
  reversed_at INTEGER,
  reversed_note TEXT,
  UNIQUE (market_id, round)
);

-- Community split after each pick, for the history chart
CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY,
  market_id INTEGER NOT NULL REFERENCES markets(id),
  at INTEGER NOT NULL,
  total INTEGER NOT NULL,
  counts TEXT NOT NULL
);
CREATE INDEX snapshots_market ON snapshots(market_id, at);

CREATE TABLE audit (
  id INTEGER PRIMARY KEY,
  at INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  market_id INTEGER REFERENCES markets(id),
  detail TEXT
);

-- Demo mode only: sample finals an admin posts for the sample games
CREATE TABLE demo_results (
  game_id TEXT PRIMARY KEY,
  score_a INTEGER NOT NULL,
  score_b INTEGER NOT NULL,
  box TEXT NOT NULL,
  by_user INTEGER REFERENCES users(id),
  at INTEGER NOT NULL
);

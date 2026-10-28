-- UFF accounts: username + 5-digit PIN for players, a password for local admins

-- A permanent id for each account (a username is what people see; this never changes)
ALTER TABLE users ADD COLUMN account_id TEXT;
UPDATE users SET account_id = lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' ||
  substr('89ab', 1 + abs(random()) % 4, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)));
CREATE UNIQUE INDEX users_account_id ON users(account_id);
CREATE TRIGGER users_account_id_fixed BEFORE UPDATE OF account_id ON users WHEN OLD.account_id IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'account_id never changes'); END;
-- Roles are set when an account is made; nothing can change them afterwards
CREATE TRIGGER users_role_fixed BEFORE UPDATE OF is_admin ON users
BEGIN SELECT RAISE(ABORT, 'is_admin never changes'); END;

-- pin = players (5 digits); password = local admins. Accounts made before this are password accounts.
ALTER TABLE users ADD COLUMN credential TEXT NOT NULL DEFAULT 'password' CHECK (credential IN ('pin', 'password'));

-- Sessions end at expires_at, or after a while unused (last_seen)
ALTER TABLE sessions ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN last_seen INTEGER NOT NULL DEFAULT 0;
UPDATE sessions SET last_seen = expires_at;

-- Failed sign-ins and sign-ups, by username and by address (key = 'user:<name>', 'ip:<addr>', 'signup:<addr>')
CREATE TABLE auth_throttle (
  key TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL DEFAULT 0,
  last_failure INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0
);

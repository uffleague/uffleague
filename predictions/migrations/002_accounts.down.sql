DROP TABLE IF EXISTS auth_throttle;
ALTER TABLE sessions DROP COLUMN last_seen;
ALTER TABLE sessions DROP COLUMN created_at;
ALTER TABLE users DROP COLUMN credential;
DROP TRIGGER IF EXISTS users_role_fixed;
DROP TRIGGER IF EXISTS users_account_id_fixed;
DROP INDEX IF EXISTS users_account_id;
ALTER TABLE users DROP COLUMN account_id;

-- Auth Kit schema — SQLite
-- For fresh installs, run this file directly.
-- For existing databases, see MIGRATION section.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  firebase_uid TEXT,
  business_id INTEGER DEFAULT NULL,
  role TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

CREATE TABLE IF NOT EXISTS passkeys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL,
  public_key BLOB NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT DEFAULT '',
  device_name TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_passkeys_credential_id ON passkeys(credential_id);

-- ─── MIGRATION (for existing databases — add to db.js after CREATE TABLE) ───
-- try { db.exec('ALTER TABLE users ADD COLUMN firebase_uid TEXT'); } catch (_) {}
-- try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid)'); } catch (_) {}
-- ⚠️ SQLite cannot add UNIQUE constraint in ALTER TABLE — add column first, then index

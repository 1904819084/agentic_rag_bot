CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  feishu_open_id TEXT NOT NULL UNIQUE,
  feishu_union_id TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  feishu_access_token TEXT,
  feishu_refresh_token TEXT,
  feishu_token_expires_at TIMESTAMPTZ,
  feishu_refresh_expires_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS feishu_access_token TEXT;
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS feishu_refresh_token TEXT;
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS feishu_token_expires_at TIMESTAMPTZ;
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS feishu_refresh_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

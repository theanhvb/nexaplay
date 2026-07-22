CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS users_email_trgm_idx ON users USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_display_name_trgm_idx ON users USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_status_role_tier_created_idx ON users(status, role, subscription_tier, created_at DESC);
CREATE INDEX IF NOT EXISTS sessions_user_active_idx ON sessions(user_id, expires_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS profiles_user_idx ON profiles(user_id);

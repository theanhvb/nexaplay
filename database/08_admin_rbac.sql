-- Expand roles without invalidating existing user/admin accounts.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ALTER COLUMN role TYPE varchar(20);
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN('user','admin','super_admin','content_editor','support'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lock_reason text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

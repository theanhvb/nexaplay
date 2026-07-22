ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS source varchar(30) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_slug varchar(180),
  ADD COLUMN IF NOT EXISTS managed_by_admin boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
CREATE INDEX IF NOT EXISTS movies_source_slug_idx ON movies(source,source_slug);

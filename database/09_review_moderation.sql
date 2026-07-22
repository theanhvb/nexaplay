ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'approved', ADD COLUMN IF NOT EXISTS moderated_by varchar(40), ADD COLUMN IF NOT EXISTS moderated_at timestamptz;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_status_check;
ALTER TABLE reviews ADD CONSTRAINT reviews_status_check CHECK(status IN('pending','approved','hidden','rejected'));
CREATE INDEX IF NOT EXISTS reviews_status_created_idx ON reviews(status,created_at DESC);

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS content_title varchar(255),
  ADD COLUMN IF NOT EXISTS content_poster_url text,
  ADD COLUMN IF NOT EXISTS search_document tsvector GENERATED ALWAYS AS (
    to_tsvector('simple',coalesce(content_title,'')||' '||coalesce(profile_name,'')||' '||coalesce(comment,''))
  ) STORED;
CREATE INDEX IF NOT EXISTS reviews_search_document_idx ON reviews USING gin(search_document);
CREATE INDEX IF NOT EXISTS reviews_rating_created_idx ON reviews(rating,created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_content_created_idx ON reviews(content_id,created_at DESC);

CREATE TABLE IF NOT EXISTS review_reports(
  id varchar(40) PRIMARY KEY,
  review_id varchar(40) NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  profile_id varchar(40) NOT NULL,
  reason varchar(30) NOT NULL CHECK(reason IN('spam','abuse','spoiler','harassment','other')),
  detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(review_id,profile_id)
);
CREATE INDEX IF NOT EXISTS review_reports_review_idx ON review_reports(review_id);

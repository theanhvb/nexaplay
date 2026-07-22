-- Non-destructive catalog expansion. Existing movie columns and legacy arrays remain available.
ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS slug varchar(180),
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS country varchar(100),
  ADD COLUMN IF NOT EXISTS language varchar(80),
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS seo_title varchar(255),
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by_id varchar(40),
  ADD COLUMN IF NOT EXISTS updated_by_id varchar(40),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE movies SET slug = id WHERE slug IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS movies_slug_key ON movies(slug);
CREATE INDEX IF NOT EXISTS movies_status_published_at_idx ON movies(status,published_at);
CREATE INDEX IF NOT EXISTS movies_type_year_idx ON movies(content_type,release_year);

ALTER TABLE genres
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS genres_position_idx ON genres(position);

CREATE TABLE IF NOT EXISTS seasons(
  id varchar(40) PRIMARY KEY,
  movie_id varchar(160) NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  number integer NOT NULL CHECK(number > 0), title varchar(255), description text, poster_url text,
  position integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(movie_id,number)
);
CREATE INDEX IF NOT EXISTS seasons_movie_position_idx ON seasons(movie_id,position);

CREATE TABLE IF NOT EXISTS episodes(
  id varchar(40) PRIMARY KEY,
  season_id varchar(40) NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  number integer NOT NULL CHECK(number > 0), title varchar(255) NOT NULL, slug varchar(180) NOT NULL,
  description text, duration_minutes integer, thumbnail_url text,
  status varchar(15) NOT NULL DEFAULT 'draft' CHECK(status IN('draft','processing','scheduled','published','archived')),
  scheduled_publish_at timestamptz, published_at timestamptz, position integer NOT NULL DEFAULT 0,
  view_count bigint NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(season_id,number), UNIQUE(season_id,slug)
);
CREATE INDEX IF NOT EXISTS episodes_season_position_idx ON episodes(season_id,position);

CREATE TABLE IF NOT EXISTS media(
  id varchar(40) PRIMARY KEY, movie_id varchar(160) REFERENCES movies(id) ON DELETE CASCADE,
  episode_id varchar(40) REFERENCES episodes(id) ON DELETE CASCADE,
  type varchar(20) NOT NULL CHECK(type IN('poster','banner','thumbnail','trailer','video')),
  quality varchar(20), storage_provider varchar(30) NOT NULL, storage_key text NOT NULL, url text NOT NULL,
  mime_type varchar(100), file_size bigint, width integer, height integer, duration_seconds integer,
  encode_status varchar(20) NOT NULL DEFAULT 'pending' CHECK(encode_status IN('pending','uploading','queued','processing','completed','failed')),
  encode_progress integer NOT NULL DEFAULT 0 CHECK(encode_progress BETWEEN 0 AND 100), checksum varchar(128), position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_owner_check CHECK ((movie_id IS NOT NULL)::int + (episode_id IS NOT NULL)::int = 1)
);
CREATE INDEX IF NOT EXISTS media_movie_type_idx ON media(movie_id,type);
CREATE INDEX IF NOT EXISTS media_episode_type_idx ON media(episode_id,type);
CREATE INDEX IF NOT EXISTS media_encode_status_idx ON media(encode_status);

CREATE TABLE IF NOT EXISTS subtitles(
  id varchar(40) PRIMARY KEY, movie_id varchar(160) REFERENCES movies(id) ON DELETE CASCADE,
  episode_id varchar(40) REFERENCES episodes(id) ON DELETE CASCADE, language varchar(20) NOT NULL,
  label varchar(80) NOT NULL, storage_key text NOT NULL, url text NOT NULL, format varchar(10) NOT NULL,
  is_default boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subtitle_owner_check CHECK ((movie_id IS NOT NULL)::int + (episode_id IS NOT NULL)::int = 1)
);
CREATE INDEX IF NOT EXISTS subtitles_movie_language_idx ON subtitles(movie_id,language);
CREATE INDEX IF NOT EXISTS subtitles_episode_language_idx ON subtitles(episode_id,language);

CREATE TABLE IF NOT EXISTS actors(id varchar(40) PRIMARY KEY,name varchar(160) NOT NULL,slug varchar(180) UNIQUE NOT NULL,avatar_url text,biography text,birth_date date,country varchar(100));
CREATE INDEX IF NOT EXISTS actors_name_idx ON actors(name);
CREATE TABLE IF NOT EXISTS directors(id varchar(40) PRIMARY KEY,name varchar(160) NOT NULL,slug varchar(180) UNIQUE NOT NULL,avatar_url text,biography text);
CREATE INDEX IF NOT EXISTS directors_name_idx ON directors(name);
CREATE TABLE IF NOT EXISTS tags(id varchar(40) PRIMARY KEY,name varchar(80) NOT NULL,slug varchar(100) UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS movie_genres(movie_id varchar(160) REFERENCES movies(id) ON DELETE CASCADE,genre_id varchar(40) REFERENCES genres(id) ON DELETE CASCADE,PRIMARY KEY(movie_id,genre_id));
CREATE TABLE IF NOT EXISTS movie_actors(movie_id varchar(160) REFERENCES movies(id) ON DELETE CASCADE,actor_id varchar(40) REFERENCES actors(id) ON DELETE CASCADE,character_name varchar(160),position integer NOT NULL DEFAULT 0,PRIMARY KEY(movie_id,actor_id));
CREATE TABLE IF NOT EXISTS movie_directors(movie_id varchar(160) REFERENCES movies(id) ON DELETE CASCADE,director_id varchar(40) REFERENCES directors(id) ON DELETE CASCADE,PRIMARY KEY(movie_id,director_id));
CREATE TABLE IF NOT EXISTS movie_tags(movie_id varchar(160) REFERENCES movies(id) ON DELETE CASCADE,tag_id varchar(40) REFERENCES tags(id) ON DELETE CASCADE,PRIMARY KEY(movie_id,tag_id));

-- Preserve current runtime compatibility while normalizing existing genres.
INSERT INTO movie_genres(movie_id,genre_id)
SELECT m.id,g.id FROM movies m JOIN genres g ON g.name=ANY(m.genres)
ON CONFLICT DO NOTHING;

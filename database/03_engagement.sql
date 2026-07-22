-- pgAdmin: mở Query Tool trên database engagement_db rồi chạy toàn bộ file này.
CREATE TABLE IF NOT EXISTS watchlist_items(id varchar(40) PRIMARY KEY,profile_id varchar(40) NOT NULL,content_id varchar(160) NOT NULL,added_at timestamptz NOT NULL DEFAULT now(),UNIQUE(profile_id,content_id));
CREATE TABLE IF NOT EXISTS watch_progress(id varchar(40) PRIMARY KEY,profile_id varchar(40) NOT NULL,content_id varchar(160) NOT NULL,episode_slug varchar(120),episode_name varchar(120),server_name varchar(120),progress smallint NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),position_seconds int NOT NULL DEFAULT 0,duration_seconds int NOT NULL DEFAULT 1,is_completed boolean NOT NULL DEFAULT false,last_watched_at timestamptz NOT NULL DEFAULT now(),UNIQUE(profile_id,content_id));
CREATE TABLE IF NOT EXISTS watch_events(id bigserial PRIMARY KEY,profile_id varchar(40) NOT NULL,content_id varchar(160) NOT NULL,event_type varchar(20) NOT NULL CHECK(event_type IN('play','progress','pause','seek','complete','skip_intro')),episode_slug varchar(120),progress smallint NOT NULL DEFAULT 0,position_seconds int NOT NULL DEFAULT 0,occurred_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE watchlist_items ALTER COLUMN content_id TYPE varchar(160);
ALTER TABLE watch_progress ALTER COLUMN content_id TYPE varchar(160),ADD COLUMN IF NOT EXISTS episode_slug varchar(120),ADD COLUMN IF NOT EXISTS episode_name varchar(120),ADD COLUMN IF NOT EXISTS server_name varchar(120);
ALTER TABLE watch_events ALTER COLUMN content_id TYPE varchar(160),ADD COLUMN IF NOT EXISTS episode_slug varchar(120);
CREATE INDEX IF NOT EXISTS idx_progress_recent ON watch_progress(profile_id,last_watched_at DESC);CREATE INDEX IF NOT EXISTS idx_events_content_time ON watch_events(content_id,occurred_at DESC);
INSERT INTO watchlist_items VALUES('wat_seed_1','p-minh','m-seoul-after-midnight',now()-interval '2 days'),('wat_seed_2','p-minh','m-last-train',now()-interval '1 day'),('wat_seed_3','p-admin','m-orbit-9',now()) ON CONFLICT DO NOTHING;
INSERT INTO watch_progress(id,profile_id,content_id,progress,position_seconds,duration_seconds,is_completed,last_watched_at) VALUES
('prg_seed_1','p-minh','m-neon-delta',64,4915,7680,false,now()-interval '3 hours'),
('prg_seed_2','p-minh','m-silent-bay',28,1881,6720,false,now()-interval '1 day')
ON CONFLICT DO NOTHING;

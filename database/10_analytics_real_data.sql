ALTER TABLE content_performance ALTER COLUMN content_id TYPE varchar(160);
-- Initial demo rows were never produced by runtime events and must not appear in operational reports.
TRUNCATE TABLE daily_platform_stats, content_performance;

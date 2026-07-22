CREATE TABLE IF NOT EXISTS daily_content_stats(
  stat_date date NOT NULL,
  content_id varchar(160) NOT NULL,
  title varchar(255) NOT NULL,
  view_count bigint NOT NULL DEFAULT 0,
  watch_minutes bigint NOT NULL DEFAULT 0,
  completion_sum numeric(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY(stat_date, content_id)
);
CREATE INDEX IF NOT EXISTS daily_content_stats_range_views_idx ON daily_content_stats(stat_date, view_count DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_target_idx ON admin_audit_logs(target_type,target_id,created_at DESC);

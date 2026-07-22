CREATE TABLE IF NOT EXISTS system_settings(
  key varchar(80) PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by varchar(40),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO system_settings(key,value,description) VALUES
('max_concurrent_devices','3','Số phiên đăng nhập đồng thời tối đa trên một tài khoản'),
('email_notifications','true','Bật thông báo email'),
('push_notifications','true','Bật thông báo đẩy'),
('maintenance_mode','false','Chế độ bảo trì') ON CONFLICT(key) DO NOTHING;

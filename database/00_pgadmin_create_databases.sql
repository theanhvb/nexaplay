-- PGADMIN QUERY TOOL
-- 1. Chọn database mặc định "postgres".
-- 2. Bật Auto-commit (CREATE DATABASE không chạy được trong transaction).
-- 3. Chạy TỪNG lệnh một. Nếu database đã tồn tại, bỏ qua lệnh tương ứng.

CREATE DATABASE identity_db
    WITH OWNER = postgres ENCODING = 'UTF8' TEMPLATE = template0;

CREATE DATABASE catalog_db
    WITH OWNER = postgres ENCODING = 'UTF8' TEMPLATE = template0;

CREATE DATABASE engagement_db
    WITH OWNER = postgres ENCODING = 'UTF8' TEMPLATE = template0;

CREATE DATABASE review_db
    WITH OWNER = postgres ENCODING = 'UTF8' TEMPLATE = template0;

CREATE DATABASE billing_db
    WITH OWNER = postgres ENCODING = 'UTF8' TEMPLATE = template0;

CREATE DATABASE notification_db
    WITH OWNER = postgres ENCODING = 'UTF8' TEMPLATE = template0;

CREATE DATABASE analytics_db
    WITH OWNER = postgres ENCODING = 'UTF8' TEMPLATE = template0;

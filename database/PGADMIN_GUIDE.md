# Import bằng pgAdmin 4

## Bước 1: tạo 7 database

1. Mở pgAdmin và kết nối PostgreSQL server.
2. Chọn database mặc định **postgres** → **Tools → Query Tool**.
3. Đảm bảo Query Tool đang bật **Auto-commit**.
4. Mở `00_pgadmin_create_databases.sql`.
5. Bôi đen và chạy từng lệnh `CREATE DATABASE` riêng biệt.
6. Nếu pgAdmin báo database đã tồn tại, bỏ qua database đó.
7. Nhấn chuột phải **Databases → Refresh**.

Không chạy `CREATE DATABASE` khi Query Tool đang ở transaction thủ công.

## Bước 2: import schema và seed

Với mỗi dòng dưới đây, chọn đúng database → **Tools → Query Tool** → Open File → Execute toàn bộ file:

| Database đang chọn | File cần chạy |
|---|---|
| `identity_db` | `01_identity.sql` |
| `catalog_db` | `02_catalog.sql` |
| `engagement_db` | `03_engagement.sql` |
| `review_db` | `04_review.sql` |
| `billing_db` | `05_billing.sql` |
| `notification_db` | `06_notification.sql` |
| `analytics_db` | `07_analytics.sql` |

Các file đã có `IF NOT EXISTS` và seed `ON CONFLICT DO NOTHING`, nên có thể chạy lại khi lần import trước bị ngắt.

## Bước 3: kiểm tra nhanh

Mở Query Tool đúng trên từng database và chạy:

```sql
-- identity_db
SELECT id, email, role, subscription_tier FROM users;

-- catalog_db
SELECT id, title, status, view_count FROM movies ORDER BY view_count DESC;

-- engagement_db
SELECT * FROM watch_progress ORDER BY last_watched_at DESC;

-- review_db
SELECT content_id, ROUND(AVG(rating), 1), COUNT(*) FROM reviews GROUP BY content_id;

-- billing_db
SELECT code, name, price_amount FROM plans ORDER BY price_amount;

-- notification_db
SELECT user_id, title, read_at FROM notifications ORDER BY created_at DESC;

-- analytics_db
SELECT * FROM daily_platform_stats ORDER BY stat_date DESC LIMIT 7;
```

## Bước 4: cấu hình kết nối service

Nếu PostgreSQL của bạn không dùng mật khẩu `postgres`, sửa `DATABASE_URL` của từng service hoặc các giá trị trong `docker-compose.yml`. Mẫu:

```text
postgresql://TEN_DANG_NHAP:MAT_KHAU@localhost:5432/identity_db
```

Không dùng một URL trỏ vào `movie_platform` cũ vì phiên bản microservice cần 7 database riêng.

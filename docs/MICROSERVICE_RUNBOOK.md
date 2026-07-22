# Microservice runbook

## Service map

| Port | Workspace | Database | Trách nhiệm |
|---:|---|---|---|
| 4000 | `services/api` | none | Gateway, JWT verification, routing, response aggregation |
| 4101 | `services/identity` | `identity_db` | Auth, refresh-token rotation, account, multi-profile |
| 4102 | `services/catalog` | `catalog_db` | Catalog, full-text search, recommendation tương đồng, admin CMS |
| 4103 | `services/engagement` | `engagement_db` | Watchlist, progress, continue watching, history, viewing events |
| 4104 | `services/review` | `review_db` | Rating, review, reaction |
| 4105 | `services/billing` | `billing_db` | Plan, subscription, invoice; provider hiện dùng adapter `demo` |
| 4106 | `services/notification` | `notification_db` | Inbox và preferences |
| 4107 | `services/analytics` | `analytics_db` | Aggregate dashboard, audit log, internal event ingestion |

Không có foreign key hoặc SQL JOIN xuyên database. Các định danh `userId`, `profileId`, `contentId` là logical reference. Gateway chịu trách nhiệm composition cho các màn hình cần dữ liệu từ nhiều service.

## Import PostgreSQL

Các file trong `database/` thay thế bộ SQL tham khảo cũ ở root. Thứ tự bắt buộc:

1. `00_pgadmin_create_databases.sql` (pgAdmin) hoặc `docker-init.sql` (Docker/psql)
2. `01_identity.sql`
3. `02_catalog.sql`
4. `03_engagement.sql`
5. `04_review.sql`
6. `05_billing.sql`
7. `06_notification.sql`
8. `07_analytics.sql`

Docker tự chạy `docker-init.sql` trên volume trống. Nếu dùng pgAdmin, làm theo `database/PGADMIN_GUIDE.md`. Với PostgreSQL cài local và có `psql` trong PATH, tạo database trước rồi chạy:

```powershell
$env:PGPASSWORD = '12345'
.\database\import-all.ps1
```

Nếu tài khoản PostgreSQL local không phải `postgres/postgres`, sửa biến kết nối hoặc dùng Docker. Không ghi credential production vào repository.

## Security contract

- Identity ký access JWT HS256 sống 15 phút; refresh token opaque sống 30 ngày và chỉ lưu SHA-256 digest.
- Gateway xác thực token rồi truyền `x-user-id`, `x-profile-id`, `x-user-role`, `x-session-id` trong mạng nội bộ.
- Không expose trực tiếp port service trong Docker Compose; chỉ Gateway expose port 4000.
- Production phải thay `JWT_SECRET`, `INTERNAL_SECRET`, credential PostgreSQL và đặt TLS tại ingress.
- Các endpoint đăng nhập nên được bổ sung Redis distributed rate-limit trước khi public Internet.

## API có giá trị đã hoạt động

- Đăng ký, đăng nhập, refresh rotation, logout và session bền vững.
- Multi-profile có giới hạn theo gói; đổi profile phát hành JWT mới.
- Catalog phân trang, lọc kids, sort, PostgreSQL full-text search, similar content và admin archive thay vì hard delete.
- Watchlist, resume đa thiết bị, history và event log phục vụ analytics.
- Review/rating có upsert và reaction idempotent.
- Plans, subscription, invoice và cancel-at-period-end; adapter demo là điểm thay bằng VNPay/MoMo webhook.
- In-app notification, unread state và preferences.
- Dashboard đọc dữ liệu aggregate thật và internal ingestion endpoint để nối RabbitMQ/Kafka sau này.

## Production evolution

Mốc tiếp theo hợp lý là thêm RabbitMQ cùng transactional outbox cho `user.registered`, `content.viewed`, `subscription.paid`; sau đó MinIO + FFmpeg worker cho HLS. Không nên triển khai thanh toán thật hoặc DRM trước khi có secrets manager, webhook signature verification, observability và automated backup.

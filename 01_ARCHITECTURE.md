# KIẾN TRÚC HỆ THỐNG — WEBSITE XEM PHIM (MOVIE STREAMING PLATFORM)

> Mô hình: **Microservices** | Mục tiêu: nền tảng xem phim/series đầy đủ tính năng như Netflix/Disney+/FPT Play, có tính năng vượt trội (Watch Party, AI Recommendation, Skip Intro tự động...) và UI/UX cao cấp.

---

## 1. TỔNG QUAN KIẾN TRÚC

```
                                 ┌─────────────────────┐
                                 │   CDN (Cloudflare)   │
                                 └──────────┬───────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     │        Frontend (Next.js SSR/PWA)            │
                     │   Web App | Mobile Web | Smart TV App        │
                     └──────────────────────┬──────────────────────┘
                                            │ HTTPS/GraphQL/REST
                                 ┌──────────┴───────────┐
                                 │   API GATEWAY (Kong)  │
                                 │  Auth, Rate-limit,    │
                                 │  Routing, Aggregation │
                                 └──────────┬───────────┘
        ┌──────────────┬──────────────┬────┴────┬──────────────┬──────────────┐
        │              │              │          │              │              │
   ┌────▼───┐    ┌─────▼────┐   ┌─────▼───┐ ┌───▼────┐   ┌─────▼─────┐  ┌─────▼─────┐
   │  Auth  │    │   User   │   │ Catalog │ │Streaming│   │  Review/  │  │  Payment  │
   │Service │    │ Service  │   │ Service │ │ Service │   │  Rating   │  │/Subscript.│
   └────┬───┘    └─────┬────┘   └─────┬───┘ └───┬────┘   └─────┬─────┘  └─────┬─────┘
        │              │              │          │              │              │
   ┌────▼───┐    ┌─────▼────┐   ┌─────▼───┐ ┌───▼────┐   ┌─────▼─────┐  ┌─────▼─────┐
   │Postgres│    │ Postgres │   │Postgres │ │Postgres │   │ Postgres  │  │ Postgres  │
   │  auth  │    │   user   │   │ catalog │ │streaming│   │  review   │  │  payment  │
   └────────┘    └──────────┘   └─────────┘ └─────────┘   └───────────┘  └───────────┘

        ┌──────────────┬──────────────┬──────────────┬──────────────┐
   ┌────▼──────┐  ┌─────▼─────┐ ┌──────▼─────┐  ┌─────▼─────┐ ┌──────▼──────┐
   │Recommend. │  │  Search   │ │Notification│  │  Social/   │ │  Analytics/ │
   │(AI/ML)    │  │(ElasticS.)│ │  Service   │  │ WatchParty │ │    Admin    │
   └───────────┘  └───────────┘ └────────────┘  └────────────┘ └─────────────┘

   Event Bus / Message Broker: Kafka hoặc RabbitMQ (giao tiếp bất đồng bộ giữa services)
   Cache: Redis (session, hot data, rate-limit, pub/sub cho Watch Party)
   Object Storage: S3/MinIO (video gốc, poster, HLS segments)
   Video pipeline: FFmpeg Worker + Transcoding Queue → CDN
```

**Nguyên tắc cốt lõi:**
- **Database-per-service**: mỗi service sở hữu 1 schema/DB Postgres riêng, không JOIN chéo service — giao tiếp qua API hoặc event.
- **Giao tiếp đồng bộ**: REST/GraphQL qua API Gateway cho request-response.
- **Giao tiếp bất đồng bộ**: Kafka/RabbitMQ cho các sự kiện (user đăng ký → tạo profile mặc định, thanh toán thành công → mở khóa gói, video xem xong → cập nhật recommendation...).
- **BFF (Backend For Frontend)**: 1 tầng GraphQL tổng hợp dữ liệu từ nhiều service cho từng loại client (Web/Mobile/TV).

---

## 2. DANH SÁCH MICROSERVICES

| # | Service | Nhiệm vụ chính | DB/Storage |
|---|---------|-----------------|------------|
| 1 | **Auth Service** | Đăng ký/đăng nhập, JWT, OAuth2 (Google/Facebook), refresh token, 2FA | Postgres |
| 2 | **User Service** | Hồ sơ người dùng, multi-profile (như Netflix), avatar, kids-mode, cài đặt | Postgres |
| 3 | **Catalog Service** | Metadata phim/series (tên, đạo diễn, diễn viên, thể loại, tập, mùa, poster, trailer) | Postgres |
| 4 | **Streaming/Media Service** | Quản lý file video, transcode multi-bitrate (HLS/DASH), DRM, phát trực tuyến | Postgres + S3 |
| 5 | **Engagement Service** | Watchlist, lịch sử xem, "Tiếp tục xem", tiến trình xem đồng bộ đa thiết bị | Postgres |
| 6 | **Review/Rating Service** | Đánh giá sao, bình luận, reply, like/dislike | Postgres |
| 7 | **Payment/Subscription** | Gói cước, thanh toán (VNPay/Momo/Stripe), hóa đơn, khuyến mãi | Postgres |
| 8 | **Recommendation Service** | Gợi ý cá nhân hóa (collaborative filtering + content-based), "Vì bạn đã xem..." | Postgres + Vector DB |
| 9 | **Search Service** | Tìm kiếm full-text, gợi ý tự động, tìm theo diễn viên/thể loại | Elasticsearch |
| 10 | **Notification Service** | Email, push notification, in-app notification (phim mới, tập mới) | Postgres + Redis |
| 11 | **Social/WatchParty Service** | Xem chung đồng bộ, chat realtime, chia sẻ, mời bạn bè | Postgres + Redis Pub/Sub |
| 12 | **Analytics/Admin Service** | Thống kê lượt xem, dashboard quản trị, quản lý nội dung (CMS) | Postgres |

---

## 3. HẠ TẦNG (INFRASTRUCTURE)

- **Container hóa**: Docker cho từng service, orchestrate bằng **Kubernetes** (hoặc Docker Swarm cho quy mô nhỏ hơn).
- **API Gateway**: Kong / Traefik / Nginx + custom middleware auth.
- **Message Broker**: Kafka (khuyến nghị cho quy mô lớn, event sourcing) hoặc RabbitMQ (đơn giản hơn).
- **Cache**: Redis — session, rate limiting, cache catalog "hot", pub/sub cho watch party.
- **Video Storage & Streaming**:
  - Upload gốc → S3/MinIO
  - Transcode: FFmpeg worker (queue-based) → tạo nhiều bitrate (240p–4K) dạng HLS (.m3u8/.ts) hoặc DASH
  - Phân phối qua CDN (Cloudflare Stream / AWS CloudFront)
  - DRM: Widevine/FairPlay cho nội dung bản quyền cao, hoặc token ký (signed URL) hết hạn cho bản demo
- **Search**: Elasticsearch/OpenSearch, đồng bộ dữ liệu từ Catalog Service qua CDC (Debezium) hoặc event.
- **Observability**: Prometheus + Grafana (metrics), ELK/Loki (log tập trung), Jaeger (distributed tracing).
- **CI/CD**: GitHub Actions/GitLab CI, mỗi service có pipeline build → test → docker image → deploy riêng.

---

## 4. LUỒNG DỮ LIỆU MẪU

**Xem phim (happy path):**
1. Client gọi `GET /catalog/movies/{id}` qua Gateway → Catalog Service trả metadata.
2. Client gọi `POST /streaming/{id}/play-session` → Streaming Service kiểm tra quyền (gói cước qua Payment Service hoặc cache), trả về URL manifest HLS đã ký token.
3. Player tải `.m3u8`, phát qua CDN.
4. Mỗi 10–15s, client gửi tiến trình xem → Engagement Service (để "Tiếp tục xem").
5. Khi xem xong → publish event `movie.watched` lên Kafka → Recommendation Service & Analytics Service tiêu thụ event để cập nhật gợi ý và thống kê.

**Watch Party:**
1. User A tạo phòng → Social Service tạo `room_id`, publish qua Redis Pub/Sub.
2. User B/C join qua `room_id` → WebSocket kết nối tới Social Service.
3. Server đồng bộ thời gian phát (play/pause/seek) cho toàn phòng qua WebSocket, chat realtime song song.

---

## 5. GỢI Ý TECH STACK

| Layer | Công nghệ đề xuất |
|---|---|
| Frontend Web | Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui + Zustand/Redux Toolkit |
| Video Player | Video.js hoặc Shaka Player (hỗ trợ HLS/DASH + DRM) |
| Backend Services | NestJS (Node.js/TypeScript) — dễ tổ chức module theo domain, hoặc Go (Gin) cho service cần hiệu năng cao (Streaming) |
| API Gateway | Kong hoặc GraphQL Federation (Apollo Gateway) |
| Database | PostgreSQL (mỗi service 1 DB), Redis (cache), Elasticsearch (search) |
| Message Broker | Kafka / RabbitMQ |
| Video Processing | FFmpeg + BullMQ (queue) |
| Auth | JWT + OAuth2 (Passport.js), Refresh token rotation |
| DevOps | Docker, Kubernetes, GitHub Actions, Terraform (IaC) |
| Realtime | WebSocket (Socket.IO) cho Watch Party & Notification |

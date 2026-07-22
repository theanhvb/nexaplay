# AI IMPLEMENTATION GUIDE — HƯỚNG DẪN CHO AI CODING AGENT

> File này dùng để đưa cho Claude Code / Cursor / AI agent đọc trước khi bắt đầu code, giúp AI hiểu bối cảnh, quy ước và triển khai đúng hướng nhất quán qua nhiều phiên làm việc. Đặt file này ở gốc repo (ví dụ `CLAUDE.md` hoặc `AGENTS.md`).

## 1. BỐI CẢNH DỰ ÁN

Xây dựng nền tảng xem phim trực tuyến (movie streaming platform) theo kiến trúc **microservices**, tham khảo `01_ARCHITECTURE.md`, `02_FEATURES.md`, `03_UIUX_GUIDE.md` đi kèm. Mục tiêu: UI/UX cao cấp ngang Netflix, có tính năng khác biệt (Watch Party, AI Recommendation, Auto Skip Intro).

## 2. CẤU TRÚC MONOREPO ĐỀ XUẤT

```
movie-platform/
├── apps/
│   ├── web/                     # Next.js frontend
│   ├── admin/                   # Admin dashboard (Next.js hoặc Vite React)
│   └── gateway/                 # API Gateway config / BFF GraphQL
├── services/
│   ├── auth-service/
│   ├── user-service/
│   ├── catalog-service/
│   ├── streaming-service/
│   ├── engagement-service/
│   ├── review-service/
│   ├── payment-service/
│   ├── recommendation-service/
│   ├── search-service/
│   ├── notification-service/
│   ├── social-service/
│   └── analytics-service/
├── packages/
│   ├── shared-types/             # TypeScript types/DTO dùng chung
│   ├── ui/                       # Design system component (shadcn-based)
│   └── config/                   # eslint/tsconfig chung
├── database/                     # File SQL schema từng service (đã tạo sẵn — xem thư mục /database)
├── docker-compose.yml
└── README.md
```

Mỗi service trong `services/*` là 1 project **NestJS** độc lập, có `Dockerfile` riêng, kết nối 1 database Postgres riêng (không share DB giữa các service).

## 3. QUY ƯỚC CHUNG (CODING CONVENTIONS)

- **Ngôn ngữ**: TypeScript cho toàn bộ frontend & backend (trừ khi có lý do dùng Go cho streaming-service vì hiệu năng).
- **API style**: REST cho service nội bộ đơn giản (CRUD), GraphQL ở tầng Gateway/BFF để frontend query linh hoạt.
- **Đặt tên bảng DB**: snake_case, số nhiều (vd: `movies`, `watch_sessions`).
- **Mỗi service PHẢI có**: `README.md` riêng, thư mục `migrations/`, file `.env.example`, health-check endpoint `/health`.
- **Giao tiếp giữa service**: ưu tiên event (Kafka/RabbitMQ) cho tác vụ không cần phản hồi ngay (vd: gửi email); dùng REST call trực tiếp qua Gateway cho tác vụ cần phản hồi ngay.
- **Auth**: mọi service (trừ auth-service) chỉ xác thực JWT (không tự xử lý login) — JWT payload chứa `userId`, `profileId`, `role`, `subscriptionTier`.
- **Validation**: dùng `class-validator`/`zod` cho mọi input API.
- **Testing**: mỗi service có unit test cho service layer + ít nhất 1 e2e test cho API chính.

## 4. THỨ TỰ TRIỂN KHAI ĐỀ XUẤT CHO AI

Khi được yêu cầu "xây dựng toàn bộ dự án", hãy triển khai theo thứ tự sau, xác nhận từng bước hoàn chỉnh trước khi qua bước kế (tránh code lan man mất kiểm soát):

1. Setup monorepo (Turborepo/Nx) + docker-compose (Postgres x N, Redis, Kafka/RabbitMQ)
2. `auth-service` (đăng ký/login/JWT) + `user-service` (profile)
3. `catalog-service` (CRUD phim) + seed dữ liệu mẫu
4. Frontend: trang chủ + trang chi tiết phim (dùng dữ liệu từ catalog-service) — áp dụng `03_UIUX_GUIDE.md`
5. `streaming-service` (upload video, transcode giả lập hoặc thật với FFmpeg, phát HLS)
6. Tích hợp video player vào frontend
7. `engagement-service` (watchlist, continue watching) + `review-service`
8. `payment-service` (gói cước — có thể mock cổng thanh toán ban đầu)
9. Admin dashboard (CRUD phim, thống kê cơ bản)
10. Các tính năng nâng cao: `recommendation-service`, `search-service`, `notification-service`, `social-service` (Watch Party)

## 5. YÊU CẦU BẮT BUỘC VỀ DATABASE

- Dùng schema SQL mẫu đã cung cấp trong thư mục `/database/*.sql` làm điểm khởi đầu — có thể mở rộng thêm cột nhưng KHÔNG xóa cấu trúc khóa chính/khóa ngoại đã định nghĩa.
- Dùng migration tool (TypeORM migration / Prisma Migrate / node-pg-migrate) — không sửa DB thủ công ngoài migration.
- Viết seed script cho dữ liệu mẫu (ít nhất 20 phim, 5 thể loại, 3 tài khoản test) để dev/test nhanh.

## 6. YÊU CẦU VỀ API CHO FRONTEND (ĐỂ FRONTEND MÓC SẴN)

- Mỗi service PHẢI xuất bản OpenAPI spec (`/api-docs` qua Swagger) để frontend generate client type-safe (dùng `openapi-typescript` hoặc `orval`).
- Response format thống nhất:
```json
{
  "success": true,
  "data": { },
  "meta": { "page": 1, "totalPages": 10 },
  "error": null
}
```
- Lỗi trả về status code chuẩn HTTP + `error.code` dạng string (vd: `MOVIE_NOT_FOUND`) để frontend xử lý i18n message.

## 7. KHI KHÔNG CHẮC CHẮN

Nếu yêu cầu không rõ ràng (vd: dùng Kafka hay RabbitMQ, MinIO hay S3 thật), AI nên **chọn phương án đơn giản nhất để chạy local trước** (RabbitMQ, MinIO, mock payment gateway), ghi chú rõ trong README rằng có thể thay thế bằng dịch vụ cloud thật khi deploy production.

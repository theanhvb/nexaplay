# BỘ TÀI LIỆU Ý TƯỞNG & THIẾT KẾ — WEBSITE XEM PHIM (MICROSERVICES)

Thứ tự đọc / sử dụng:

1. **01_ARCHITECTURE.md** — Kiến trúc tổng thể microservices, hạ tầng, luồng dữ liệu, tech stack.
2. **02_FEATURES.md** — Danh sách tính năng cơ bản → nâng cao → vượt trội (Watch Party, AI Recommendation, Auto Skip Intro...), lộ trình triển khai theo phase.
3. **03_UIUX_GUIDE.md** — Trang tham khảo (Netflix, Disney+, Apple TV+...), bảng màu/typography, cấu trúc từng trang chính.
4. **04_AI_IMPLEMENTATION_GUIDE.md** — File dùng để đưa cho AI coding agent (Claude Code/Cursor) đọc trước khi code, đặt tên `CLAUDE.md`/`AGENTS.md` ở gốc repo.
5. **05_API_CONTRACTS.md** — Danh sách endpoint mẫu từng service để frontend/backend móc nối API sẵn.
6. **database/*.sql** — Schema PostgreSQL đầy đủ cho từng service (chạy độc lập, mỗi file tương ứng 1 database riêng theo mô hình database-per-service).

## Cách dùng nhanh với AI coding agent

```
1. Copy toàn bộ 6 file + thư mục database/ vào gốc repo dự án.
2. Đổi tên 04_AI_IMPLEMENTATION_GUIDE.md thành CLAUDE.md (nếu dùng Claude Code).
3. Yêu cầu AI: "Đọc CLAUDE.md và các file 01-05, khởi tạo monorepo theo đúng cấu trúc,
   bắt đầu từ Phase 1 (Auth + User + Catalog + Frontend cơ bản)."
4. Chạy các file .sql trong database/ vào từng Postgres instance tương ứng
   (docker-compose sẽ tạo N container Postgres theo số service).
```

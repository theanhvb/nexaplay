# Movie Platform — production-oriented microservices

Nền tảng xem phim gồm React/Vite, API Gateway và 7 microservice độc lập. Mỗi service sở hữu một PostgreSQL database riêng; frontend chỉ giao tiếp với Gateway tại `http://localhost:4000`.

## Chạy nhanh bằng Docker

Yêu cầu Docker Desktop đang chạy. Lần đầu khởi tạo:

```powershell
docker compose up -d --build
npm install
npm run start:web
```

Mở `http://localhost:5173`. Kiểm tra toàn stack tại `http://localhost:4000/health`.

Nếu bạn dùng pgAdmin, làm theo [hướng dẫn import pgAdmin](database/PGADMIN_GUIDE.md). Nếu volume PostgreSQL Docker cũ đã tồn tại, Docker sẽ không tự chạy lại init scripts. Import thủ công bằng:

```powershell
cd database
.\import-all.ps1
```

Hoặc chỉ khi chắc chắn không cần dữ liệu cũ, xóa volume rồi khởi tạo lại: `docker compose down -v` và `docker compose up -d --build`.

## Tài khoản mẫu

| Email | Password | Role | Gói |
|---|---|---|---|
| `admin@movieapp.dev` | `Password123!` | admin | Premium |
| `minh.tran@movieapp.dev` | `Password123!` | user | Basic |
| `lan.pham@movieapp.dev` | `Password123!` | user | Free |

Mật khẩu seed đã được băm bằng scrypt, không lưu plaintext.

## Phát triển không dùng Docker cho Node

Sau khi PostgreSQL đã import đủ database:

```powershell
npm install
npm run dev
```

Lệnh này chạy Gateway, 7 service và web song song. Xem [hướng dẫn kiến trúc và database](docs/MICROSERVICE_RUNBOOK.md) để biết port, quyền sở hữu dữ liệu và quy trình import.

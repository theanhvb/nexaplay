# Movie Platform — production-oriented microservices

## Deploy lên VPS aaPanel (1 CPU / 2 GB RAM)

Cấu hình production chỉ public frontend tại `127.0.0.1:8080`; PostgreSQL, Gateway và 7 service chỉ nằm trong mạng Docker. Lần đầu trên Ubuntu:

```bash
git clone https://github.com/theanhvb/nexaplay.git /opt/nexaplay
cd /opt/nexaplay
chmod +x deploy/*.sh
./deploy/deploy.sh
```

Lần chạy đầu tạo `.env` với secrets ngẫu nhiên rồi dừng lại. Sửa `WEB_ORIGIN` trong `.env` thành domain thật, ví dụ `https://nexaplay.vn`, sau đó chạy lại:

```bash
./deploy/deploy.sh
```

Trong aaPanel, tạo website, bật SSL và reverse proxy tới `http://127.0.0.1:8080`. Mẫu cấu hình nằm tại `deploy/aapanel-nginx.conf`. Mỗi lần cập nhật code chỉ cần chạy lại `./deploy/deploy.sh`.

VPS 2 GB nên có 2 GB swap. Tạo một lần:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Backup thủ công bằng `./deploy/backup.sh`. Có thể thêm cron chạy hằng ngày; script tự xóa bản cũ hơn 7 ngày.

### Publish và tự động cập nhật VPS

Sau khi systemd timer đã được cài trên VPS, từ Windows chỉ cần chạy:

```powershell
.\scripts\publish.ps1 "Mô tả thay đổi"
```

Script chỉ push khi toàn bộ workspace build thành công. VPS kiểm tra GitHub mỗi 2 phút và tự chạy deploy khi nhánh `main` có commit mới. Xem lịch sử bằng `systemctl status nexaplay-deploy.timer` và `journalctl -u nexaplay-deploy.service -n 100`.

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

# PostgreSQL source of truth

Các file SQL trong thư mục này là schema và seed duy nhất đang được code microservice sử dụng. Bộ SQL và seed thử nghiệm cũ đã được loại bỏ khỏi dự án.

Người dùng pgAdmin xem [PGADMIN_GUIDE.md](PGADMIN_GUIDE.md). Import theo đúng database được ghi ở đầu mỗi file. `docker-init.sql` chỉ dành cho Docker/psql và không chạy trong pgAdmin.

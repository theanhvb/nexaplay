#!/usr/bin/env sh
set -eu

PROJECT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$PROJECT_DIR"
mkdir -p backups

STAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT="backups/nexaplay-$STAMP.sql.gz"
docker compose --env-file .env -f docker-compose.prod.yml exec -T postgres \
  pg_dumpall -U postgres | gzip > "$OUTPUT"

# Giữ 7 ngày backup gần nhất.
find backups -type f -name 'nexaplay-*.sql.gz' -mtime +7 -delete
echo "Đã tạo $OUTPUT"

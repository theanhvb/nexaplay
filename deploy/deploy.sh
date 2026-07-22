#!/usr/bin/env sh
set -eu

PROJECT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$PROJECT_DIR"

if [ ! -f .env ]; then
  echo "Chưa có .env. Đang tạo secrets production..."
  umask 077
  DB_SECRET="$(openssl rand -hex 24)"
  JWT_SECRET_VALUE="$(openssl rand -hex 32)"
  INTERNAL_SECRET_VALUE="$(openssl rand -hex 32)"
  cat > .env <<EOF
POSTGRES_PASSWORD=$DB_SECRET
JWT_SECRET=$JWT_SECRET_VALUE
INTERNAL_SECRET=$INTERNAL_SECRET_VALUE
WEB_ORIGIN=http://localhost
WEB_BIND=127.0.0.1
WEB_PORT=8080
EOF
  echo "Đã tạo .env. Hãy sửa WEB_ORIGIN thành domain HTTPS rồi chạy lại script."
  exit 1
fi

if grep -q 'CHANGE_ME\|WEB_ORIGIN=http://localhost' .env; then
  echo "Hãy thay giá trị mẫu và WEB_ORIGIN trong $PROJECT_DIR/.env trước khi deploy."
  exit 1
fi

set -a
. ./.env
set +a

mkdir -p backups
git pull --ff-only origin main
docker compose --parallel 1 --env-file .env -f docker-compose.prod.yml build
docker compose --env-file .env -f docker-compose.prod.yml up -d --remove-orphans
docker image prune -f
docker builder prune -f --keep-storage 750MB

echo "Đang chờ website sẵn sàng..."
attempt=0
until curl -fsS "http://127.0.0.1:${WEB_PORT:-8080}/healthz" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    docker compose --env-file .env -f docker-compose.prod.yml ps
    echo "Website chưa sẵn sàng. Xem log bằng: docker compose --env-file .env -f docker-compose.prod.yml logs --tail=200"
    exit 1
  fi
  sleep 2
done

docker compose --env-file .env -f docker-compose.prod.yml ps
echo "NexaPlay đã chạy tại http://127.0.0.1:${WEB_PORT:-8080}"

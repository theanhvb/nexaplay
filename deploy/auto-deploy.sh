#!/usr/bin/env sh
set -eu

PROJECT_DIR="/opt/nexaplay"
STATE_DIR="/var/lib/nexaplay-deploy"
STATE_FILE="$STATE_DIR/last-success"
LOCK_FILE="/var/lock/nexaplay-deploy.lock"

mkdir -p "$STATE_DIR"
cd "$PROJECT_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Một tiến trình deploy khác đang chạy."
  exit 0
fi

git fetch --quiet origin main
REMOTE_COMMIT="$(git rev-parse origin/main)"
LAST_SUCCESS="$(cat "$STATE_FILE" 2>/dev/null || true)"

if [ "$REMOTE_COMMIT" = "$LAST_SUCCESS" ]; then
  exit 0
fi

echo "Phát hiện phiên bản mới: $REMOTE_COMMIT"
./deploy/deploy.sh
printf '%s\n' "$REMOTE_COMMIT" > "$STATE_FILE"
echo "Auto deploy thành công: $REMOTE_COMMIT"


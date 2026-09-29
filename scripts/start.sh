#!/bin/bash
# 生产服务器
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

PORT="${PORT:-5000}"
echo "Starting production server on http://localhost:${PORT} ..."
exec pnpm exec next start -p "${PORT}"

#!/bin/bash
# 开发服务器
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

PORT="${PORT:-5000}"
echo "Starting dev server on http://localhost:${PORT} ..."
exec pnpm exec next dev -p "${PORT}"

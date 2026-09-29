#!/bin/bash
# 生产构建
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "Building the Next.js project..."
pnpm build

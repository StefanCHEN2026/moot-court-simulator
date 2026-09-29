#!/bin/bash
# 安装依赖（构建/开发前执行）
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile

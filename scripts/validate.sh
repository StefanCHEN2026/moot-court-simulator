#!/bin/bash
# 类型检查 + Lint
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "🔍 Running validate..."
pnpm validate
echo "✅ Validate passed!"

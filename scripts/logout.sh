#!/usr/bin/env bash
# =============================================================================
# 退出 Cloudflare 登录
#
#   scripts/logout.sh
# =============================================================================
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

load_config

step "退出 Cloudflare 登录"
cd "$BACKEND_DIR"
if npx --no-install wrangler logout 2>&1 | sed 's/^/  /'; then
  ok "已退出登录（本地凭据已清除）"
else
  warn "退出失败，可能本来就没登录"
fi

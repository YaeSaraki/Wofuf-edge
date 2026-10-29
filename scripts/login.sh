#!/usr/bin/env bash
# =============================================================================
# 登录 Cloudflare（浏览器授权）
#
#   scripts/login.sh
# =============================================================================
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

load_config
require_cmd node "需要 Node.js"

step "登录 Cloudflare"
note "会打开浏览器让你授权 Cloudflare 账号。"

cd "$BACKEND_DIR"
if npx --no-install wrangler login 2>&1 | sed 's/^/  /'; then
  ok "登录成功"
else
  die "登录失败"
fi

step "当前账号"
npx --no-install wrangler whoami 2>&1 | sed 's/^/  /' || true

note ""
note "提示：登录状态存在 ~/.wrangler/ 里；退出用 scripts/logout.sh"

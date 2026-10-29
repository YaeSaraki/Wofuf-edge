#!/usr/bin/env bash
# =============================================================================
# 上传部署：Worker + 前端
#
#   scripts/upload.sh              # 完整上传（Worker + 前端）
#   scripts/upload.sh worker       # 只传 Worker
#   scripts/upload.sh frontend     # 只传前端
# =============================================================================
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

load_config
TARGET="${1:-all}"

[ -d "$DEPLOY_DIR" ] || die "还没有构建产物，先跑 scripts/build.sh"
require_login

if [ "$TARGET" = "all" ]; then
  step "准备上传"
  note "Worker : ${WORKER_NAME:-wofuf-edge}  （API: ${API_HOST:-?}）"
  note "前端   : ${PAGES_PROJECT:-?}  （${PAGES_HOST:-?}）"
  echo
  ask_yes_no "确认上传？" || { note "已取消"; exit 0; }
fi

if [ "$TARGET" = "all" ] || [ "$TARGET" = "worker" ]; then
  step "上传 Worker"
  cd "$DEPLOY_DIR"

  if [ -f migrations/0001_init.sql ]; then
    sub "应用 D1 迁移"
    npx --no-install wrangler d1 migrations apply "${D1_DATABASE_NAME:-wofuf-db}" --remote 2>&1 | tail -3 | sed 's/^/    /'
  fi

  sub "干跑校验（不发布，先确认配置与打包没问题）"
  if npx --no-install wrangler deploy --dry-run 2>&1 | tail -3 | sed 's/^/    /'; then
    ok "干跑通过"
  else
    warn "干跑没过，仍继续尝试部署（若失败请看上面的报错）"
  fi

  sub "部署 Worker"
  npx --no-install wrangler deploy 2>&1 | tail -8 | sed 's/^/    /'
  ok "Worker 已部署"
fi

if { [ "$TARGET" = "all" ] || [ "$TARGET" = "frontend" ]; } && [ -d "$FRONT_DEPLOY_DIR" ]; then
  step "上传前端（Cloudflare Pages）"
  cd "$WEB_DIR"
  sub "pages deploy"
  npx --no-install wrangler pages deploy . --project-name "${PAGES_PROJECT:-wofuf-web}" 2>&1 | tail -6 | sed 's/^/    /'
  ok "前端已上传"
fi

step "验证"
API="https://${API_HOST:-}"
if [ -n "$API_HOST" ]; then
  if curl -fsS -m 10 "$API/health" >/dev/null 2>&1; then
    ok "API 可用：$API/health"
  else
    warn "API 没响应（$API/health）—— 检查自定义域名是否已绑到 Worker"
  fi
fi
if [ -n "$PAGES_HOST" ]; then
  if curl -fsS -m 10 "https://$PAGES_HOST/" >/dev/null 2>&1; then
    ok "前端可用：https://$PAGES_HOST/"
  else
    warn "前端没响应（https://$PAGES_HOST/）—— 检查 Pages 自定义域名"
  fi
fi

note ""
ok "完成 🎉"

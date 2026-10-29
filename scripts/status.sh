#!/usr/bin/env bash
# =============================================================================
# 状态检查
#
#   scripts/status.sh
# =============================================================================
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

load_config

step "配置"
printf "  %-22s %s\n" "站点"        "${SERVER_NAME:-MCS}"
printf "  %-22s %s\n" "API 域名"    "${API_HOST:-未配置}"
printf "  %-22s %s\n" "前端域名"    "${PAGES_HOST:-未配置}"
printf "  %-22s %s\n" "插件地址"    "${PLUGIN_API_BASE_URL:-未配置}"
printf "  %-22s %s\n" "Turnstile"   "$([ -n "${TURNSTILE_SITE_KEY:-}" ] && [ "${TURNSTILE_SITE_KEY}" != "0x4xxxxxxx" ] && echo '已配置' || echo '未启用')"

step "API"
if [ -n "${API_HOST:-}" ]; then
  for path in /health /api/v1/overview; do
    CODE="$(curl -o /tmp/wofuf_status -s -m 10 -w '%{http_code}' "https://${API_HOST}${path}" 2>/dev/null || true)"
    if [ "$CODE" = "200" ]; then
      ok "$path → 200"
      [ "$path" = "/api/v1/overview" ] && note "$(head -c 220 /tmp/wofuf_status)"
    else
      warn "$path → $CODE"
    fi
  done
else
  warn "没配置 API_HOST"
fi

step "插件"
if [ -n "${PLUGIN_API_BASE_URL:-}" ]; then
  CODE="$(curl -o /dev/null -s -m 10 -w '%{http_code}' "${PLUGIN_API_BASE_URL}/health" 2>/dev/null || true)"
  [ "$CODE" = "200" ] && ok "插件可达：${PLUGIN_API_BASE_URL}/health" || warn "插件没响应（${CODE}）—— 检查 Tunnel/frp 是否在跑"
else
  warn "没配置 PLUGIN_API_BASE_URL"
fi

step "部署"
if command -v npx >/dev/null 2>&1; then
  cd "$BACKEND_DIR"
  npx --no-install wrangler deployments list 2>/dev/null | tail -6 | sed 's/^/  /' || note "（未登录，跳过）"
fi

step "前端产物"
if [ -d "$WEB_DIR" ]; then
  note "$(du -sh "$FRONT_DEPLOY_DIR" | cut -f1)  最后构建：$(date -r "$FRONT_DEPLOY_DIR" '+%Y-%m-%d %H:%M' 2>/dev/null || echo '?')"
else
  warn "还没有前端产物，跑 scripts/build.sh"
fi

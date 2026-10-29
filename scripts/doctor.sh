#!/usr/bin/env bash
# =============================================================================
# 部署体检：把「哪里没配好」一次性列清楚
#
#   scripts/doctor.sh
# =============================================================================
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

load_config
PASS=0
WARN=0
FAIL=0

mark_ok()   { ok   "$*"; PASS=$((PASS + 1)); }
mark_warn() { warn "$*"; WARN=$((WARN + 1)); }
mark_fail() { err  "$*"; FAIL=$((FAIL + 1)); }

# ── 1. 工具链 ──
step "工具链"
if command -v node >/dev/null 2>&1; then
  mark_ok "Node.js $(node -v)"
else
  mark_fail "没有 Node.js（https://nodejs.org）"
fi
if command -v npm >/dev/null 2>&1; then
  mark_ok "npm $(npm -v)"
else
  mark_fail "没有 npm"
fi

# ── 2. 依赖 ──
step "依赖"
[ -d "$PROJECT_ROOT/node_modules" ] || [ -d "$BACKEND_DIR/node_modules" ] && mark_ok "Wofuf-edge 依赖已安装" || mark_fail "Wofuf-edge 依赖未装：cd Wofuf-edge && npm install"
[ -d "$PROJECT_ROOT/node_modules" ] || [ -d "$FRONT_DIR/node_modules" ] && mark_ok "WofuF 依赖已安装" || mark_fail "WofuF 依赖未装：cd WofuF && npm install"

# ── 3. 配置 ──
step "配置"
if [ -f "$PROJECT_ROOT/config.env" ]; then
  mark_ok "配置文件存在：$PROJECT_ROOT/config.env"
else
  mark_fail "缺少配置：cp config.env.example config.env"
fi
"$PROJECT_ROOT/scripts/config.sh" check >/dev/null 2>&1 && mark_ok "配置项校验通过" || mark_warn "配置项有问题（scripts/config.sh check 看详情）"

# ── 4. 登录 ──
step "Cloudflare 登录"
WHOAMI="$(cd "$BACKEND_DIR" && npx --no-install wrangler whoami 2>/dev/null || true)"
if printf '%s' "$WHOAMI" | grep -qi "account"; then
  mark_ok "已登录"
else
  mark_fail "未登录：scripts/login.sh"
fi

# ── 5. Cloudflare 资源 ──
step "Cloudflare 资源"
if printf '%s' "${D1_DATABASE_ID:-}" | grep -qE '^0{8}-'; then
  mark_fail "没填 D1_DATABASE_ID：npx wrangler d1 create wofuf-db"
elif [ -n "${D1_DATABASE_ID:-}" ]; then
  mark_ok "D1 database_id 已配置"
else
  mark_fail "配置里缺 D1_DATABASE_ID"
fi
if printf '%s' "${KV_NAMESPACE_ID:-}" | grep -qE '^0{32}$'; then
  mark_fail "没填 KV_NAMESPACE_ID：npx wrangler kv namespace create CACHE"
elif [ -n "${KV_NAMESPACE_ID:-}" ]; then
  mark_ok "KV namespace id 已配置"
else
  mark_fail "配置里缺 KV_NAMESPACE_ID"
fi

# ── 6. 自定义域名 ──
step "自定义域名"
if [ -n "${API_HOST:-}" ]; then
  CODE="$(curl -o /tmp/wofuf_doctor -s -m 10 -w '%{http_code}' "https://${API_HOST}/health" 2>/dev/null || true)"
  if [ "$CODE" = "200" ]; then
    mark_ok "API 域名可用：https://${API_HOST}/health"
  elif [ "$CODE" = "403" ] || [ "$CODE" = "530" ] || [ "$CODE" = "000" ]; then
    mark_fail "API 域名不通（${CODE}）—— Worker 的 Custom Domains 里加 ${API_HOST}？"
  else
    mark_warn "API 域名返回 $CODE"
  fi
else
  mark_warn "没配置 API_HOST"
fi
if [ -n "${PAGES_HOST:-}" ]; then
  CODE="$(curl -o /dev/null -s -m 10 -w '%{http_code}' "https://${PAGES_HOST}/" 2>/dev/null || true)"
  [ "$CODE" = "200" ] && mark_ok "前端域名可用：https://${PAGES_HOST}/" || mark_warn "前端域名返回 ${CODE}（Pages 的 Custom domains 里加 ${PAGES_HOST}？）"
else
  mark_warn "没配置 PAGES_HOST"
fi

# ── 7. 插件 ──
step "Minecraft 插件"
if [ -n "${PLUGIN_API_BASE_URL:-}" ]; then
  CODE="$(curl -o /dev/null -s -m 10 -w '%{http_code}' "${PLUGIN_API_BASE_URL}/health" 2>/dev/null || true)"
  if [ "$CODE" = "200" ]; then
    mark_ok "插件可达：${PLUGIN_API_BASE_URL}/health"
  else
    mark_fail "插件没响应（${CODE}）—— Tunnel / frp 是否在跑？插件的 webapi context 是否开启？"
  fi
else
  mark_warn "没配置 PLUGIN_API_BASE_URL"
fi

# ── 8. Turnstile ──
step "人机验证"
SITEKEY="${TURNSTILE_SITE_KEY:-}"
HAS_SITEKEY=0
[ -n "$SITEKEY" ] && [ "$SITEKEY" != "0x4xxxxxxx" ] && HAS_SITEKEY=1

# 前端产物里有没有 sitekey（sitekey 是编译期写进 JS 的）
BUILT_SITEKEY=0
if grep -rqE "0x4[A-Za-z0-9_-]{10,}" "$WEB_DIR" 2>/dev/null; then BUILT_SITEKEY=1; fi

SECRET_COUNT=0
if [ -d "$DEPLOY_DIR" ]; then
  SECRET_COUNT="$(cd "$DEPLOY_DIR" && npx --no-install wrangler secret list 2>/dev/null | grep -c TURNSTILE_SECRET || true)"
fi

if [ "$HAS_SITEKEY" -eq 0 ] && [ "$BUILT_SITEKEY" -eq 0 ]; then
  mark_ok "未启用人机验证（前后端都没配，正常）"
elif [ "$HAS_SITEKEY" -eq 1 ] && [ "$BUILT_SITEKEY" -eq 0 ]; then
  mark_warn "config.env 里有 sitekey，但前端产物里没有 → 还没重新构建：./wofuf build"
fi

if [ "$HAS_SITEKEY" -eq 1 ]; then
  mark_ok "sitekey 已配置（${SITEKEY:0:8}…）"
  if [ "${SECRET_COUNT:-0}" -gt 0 ]; then
    mark_ok "Worker 侧 secret 已设置"
  else
    mark_fail "Worker 侧还没设 secret（前端会带令牌但 Worker 不认）"
    note "     cd deploy/worker && npx wrangler secret put TURNSTILE_SECRET"
  fi
else
  if [ "${SECRET_COUNT:-0}" -gt 0 ]; then
    mark_warn "Worker 设了 secret，但前端没有 sitekey → 所有请求会被 403 拒掉"
    note "     去掉 Worker 的 secret：cd deploy/worker && npx wrangler secret delete TURNSTILE_SECRET"
  fi
fi

# ── 9. 产物新鲜度 ──
step "构建产物"
if [ -d "$DEPLOY_DIR" ]; then
  mark_ok "Worker 产物存在"
else
  mark_warn "还没有 Worker 产物：scripts/build.sh"
fi
if [ -d "$WEB_DIR" ]; then
  mark_ok "前端产物存在"
else
  mark_warn "还没有前端产物：scripts/build.sh"
fi

# ── 汇总 ──
step "汇总"
printf "  %s通过 %d%s   %s提醒 %d%s   %s阻断 %d%s\n" \
  "$C_G" "$PASS" "$C_RESET" "$C_Y" "$WARN" "$C_RESET" "$C_R" "$FAIL" "$C_RESET"
if [ "$FAIL" -gt 0 ]; then
  note ""
  err "有 $FAIL 项会挡住部署，按上面的提示处理后重跑 ./wofuf doctor"
  exit 1
fi
ok "体检通过，可以部署：./wofuf deploy"

#!/usr/bin/env bash
# =============================================================================
# 构建：按配置生成 Worker 部署包 + 前端部署包
#
#   scripts/build.sh
#
# 产物：
#   Wofuf-edge/deploy/          Worker（worker.js + wrangler.toml + migrations）
#   Wofuf-edge/deploy-frontend/  前端静态文件
# =============================================================================
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

load_config
require_cmd node "需要 Node.js"

# 主题：先校验再用，免得前端构建出一个白屏站点
UI_THEME_RESOLVED="$(resolve_ui_theme)"

step "1/4 读取配置"
sub "站点      ${SERVER_NAME:-MCS}（${SERVER_CORE:-?} ${SERVER_VERSION:-?}）"
sub "Worker    ${WORKER_NAME:-?}    API: ${API_HOST:-未配置}"
sub "前端      ${PAGES_PROJECT:-?}    ${PAGES_HOST:-未配置}"
sub "插件      ${PLUGIN_API_BASE_URL:-未配置}"
sub "主题      ${UI_THEME_RESOLVED}（可选：${UI_THEMES// /, }）"
if [ -n "${TURNSTILE_SITE_KEY:-}" ] && [ "${TURNSTILE_SITE_KEY}" != "0x4xxxxxxx" ]; then
  sub "Turnstile ${TURNSTILE_SITE_KEY:0:10}…（启用）"
else
  sub "Turnstile 未配置（不启用）"
fi

# ── 2. Worker 部署包 ──
step "2/4 构建 Worker"
mkdir -p "$DEPLOY_DIR/migrations"
rm -rf "$DEPLOY_DIR"/worker.js "$DEPLOY_DIR"/wrangler.toml "$DEPLOY_DIR"/migrations "$DEPLOY_DIR"/assets 2>/dev/null || true
mkdir -p "$DEPLOY_DIR/migrations"
cp "$BACKEND_DIR/migrations"/*.sql "$DEPLOY_DIR/migrations/" 2>/dev/null || true

CORS_ORIGINS="https://${PAGES_HOST:-placeholder},https://${PAGES_PROJECT:-placeholder}.pages.dev"
CORS_ORIGINS="$CORS_ORIGINS,https://${API_HOST:-placeholder}"

sed \
  -e "s|^name = \".*\"|name = \"${WORKER_NAME:-wofuf-edge}\"|" \
  -e "s|^main = \".*\"|main = \"worker.js\"|" \
  -e "s|^PLUGIN_API_BASE_URL = \".*\"|PLUGIN_API_BASE_URL = \"${PLUGIN_API_BASE_URL:-http://127.0.0.1:8080}\"|" \
  -e "s|^CORS_ORIGINS = \".*\"|CORS_ORIGINS = \"$CORS_ORIGINS\"|" \
  -e "s|^TURNSTILE_SITE_KEY = \".*\"|TURNSTILE_SITE_KEY = \"${TURNSTILE_SITE_KEY:-}\"|" \
  -e "s|^TURNSTILE_FAIL_OPEN = \".*\"|TURNSTILE_FAIL_OPEN = \"${TURNSTILE_FAIL_OPEN:-false}\"|" \
  -e "s|^database_id = \".*\"|database_id = \"${D1_DATABASE_ID:-00000000-0000-0000-0000-000000000000}\"|" \
  -e "s|^id = \".*\"|id = \"${KV_NAMESPACE_ID:-00000000000000000000000000000000}\"|" \
  "$BACKEND_DIR/wrangler.toml" > "$DEPLOY_DIR/wrangler.toml"

cd "$BACKEND_DIR"
npx --no-install esbuild src/index.ts \
  --bundle --format=esm --target=es2022 --platform=neutral \
  --conditions=worker,browser --main-fields=module,main \
  --minify --outfile="$DEPLOY_DIR/worker.js" >/dev/null 2>&1 \
  || die "Worker 打包失败"
ok "worker.js  ($(du -h "$DEPLOY_DIR/worker.js" | cut -f1))"

# ── 3. 前端（项目的一部分：frontend/）──
step "3/4 构建前端"
if [ ! -d "$FRONT_DIR" ]; then
  warn "没找到前端目录（$FRONT_DIR）—— 跳过前端构建"
  note "前端应该在 frontend/；若单独开发，用 FRONTEND_DIR=/path/to/frontend 指定"
  FRONT_DIR=""
else
  cd "$FRONT_DIR"
  # 构建日志先落盘：失败时把末尾几行打出来，否则 CI 上只会看到一句"构建失败"
  FRONT_LOG="$DEPLOY_DIR/frontend-build.log"
  if ! VITE_API_BASE_URL="https://${API_HOST}" \
  VITE_TURNSTILE_SITE_KEY="${TURNSTILE_SITE_KEY:-}" \
  VITE_SERVER_NAME="${SERVER_NAME:-MCS}" \
  VITE_SERVER_TAGLINE="${SERVER_TAGLINE:-Minecraft Server}" \
  VITE_SERVER_CORE="${SERVER_CORE:-Paper}" \
  VITE_SERVER_VERSION="${SERVER_VERSION:-26.3}" \
  VITE_SERVER_FOUNDED="${SERVER_FOUNDED:-2024}" \
  VITE_SERVER_INTRO="${SERVER_INTRO:-}" \
  VITE_UI_THEME="$UI_THEME_RESOLVED" \
    npm run build >"$FRONT_LOG" 2>&1; then
    err "---- 前端构建输出（末尾 40 行）----"
    tail -40 "$FRONT_LOG" >&2
    rm -f "$FRONT_LOG"
    die "前端构建失败"
  fi
  rm -f "$FRONT_LOG"

  # 前端产物收进 deploy/web/（部署只认 deploy/ 目录，结构统一）
  rm -rf "$WEB_DIR"
  mkdir -p "$WEB_DIR"
  cp -R "$FRONT_DIR/dist/." "$WEB_DIR/"
  ok "deploy/web/  ($(du -sh "$WEB_DIR" | cut -f1))"
fi

# ── 4. 自检 ──
step "4/4 自检"
if [ -n "$FRONT_DIR" ]; then
  if grep -q "https://${API_HOST}" "$FRONT_DEPLOY_DIR"/assets/*.js 2>/dev/null; then
    ok "前端已指向 API：https://${API_HOST}"
  else
    warn "前端产物里没找到 API 地址，检查一下 API_HOST"
  fi
  [ -f "$FRONT_DEPLOY_DIR/_redirects" ] && ok "SPA 回退规则已带上" || warn "缺少 _redirects"
fi
[ -f "$DEPLOY_DIR/migrations/0001_init.sql" ] && ok "D1 迁移已带上" || warn "缺少 D1 迁移文件"

# 入口文件必须真的在（main 写错时 wrangler deploy 会报 "entry-point file was not found"）
MAIN_FILE="$(grep -E '^main[[:space:]]*=' "$DEPLOY_DIR/wrangler.toml" | head -1 | sed 's/.*"\(.*\)".*/\1/')"
if [ -n "$MAIN_FILE" ] && [ -f "$DEPLOY_DIR/$MAIN_FILE" ]; then
  ok "入口文件就位：$MAIN_FILE"
else
  warn "入口文件缺失：${MAIN_FILE:-（未配置）} —— wrangler deploy 会失败"
fi
if grep -qE 'database_id[[:space:]]*=[[:space:]]*"0{8}-' "$DEPLOY_DIR/wrangler.toml"; then
  warn "D1 id 还是占位符 → config.env 里填 D1_DATABASE_ID"
else
  ok "D1 id 已注入"
fi

note ""
ok "构建完成。下一步：scripts/upload.sh"

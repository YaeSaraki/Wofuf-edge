#!/usr/bin/env bash
# =============================================================================
# 公共函数：路径、配置读取、输出
# =============================================================================

# 项目根（scripts/ 的上一级）
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# 兼容旧名
OPS_ROOT="$PROJECT_ROOT"
REPO_ROOT="$PROJECT_ROOT"
# 后端（Workers + Hono + D1）
BACKEND_DIR="$PROJECT_ROOT/backend"
# 前端是**项目的一部分**：frontend/（要单独开发时可用 FRONTEND_DIR 覆盖）
FRONT_DIR="${FRONTEND_DIR:-$PROJECT_ROOT/frontend}"
# 构建产物：deploy/worker（Worker 包）/ deploy/web（前端静态产物）
DEPLOY_DIR="$PROJECT_ROOT/deploy/worker"
WEB_DIR="$PROJECT_ROOT/deploy/web"
FRONT_DEPLOY_DIR="$WEB_DIR"
# 配置：项目根的 config.env（真实值，gitignore）
CONFIG_FILE="${CONFIG_FILE:-$PROJECT_ROOT/config.env}"

C_RESET=$'\033[0m'; C_B=$'\033[1m'; C_DIM=$'\033[2m'
C_G=$'\033[32m'; C_Y=$'\033[33m'; C_R=$'\033[31m'; C_C=$'\033[36m'; C_M=$'\033[35m'

step() { printf "\n%s▸ %s%s\n" "$C_C" "$*" "$C_RESET"; }
sub()  { printf "  %s→%s %s\n" "$C_DIM" "$C_RESET" "$*"; }
ok()   { printf "  %s✓%s %s\n" "$C_G" "$C_RESET" "$*"; }
# 警告与错误走 stderr：它们是给人看的，不该混进命令替换的输出里
# （warn 曾经走 stdout，被 build.sh 的 $(...) 吞进主题值，首屏直接白屏）
warn() { printf "  %s!%s %s\n" "$C_Y" "$C_RESET" "$*" >&2; }
err()  { printf "  %s✗%s %s\n" "$C_R" "$C_RESET" "$*" >&2; }
die()  { err "$*"; exit 1; }
note() { printf "  %s%s%s\n" "$C_DIM" "$*" "$C_RESET"; }

require_cmd() { command -v "$1" >/dev/null 2>&1 || die "缺少命令：$1（$2）"; }

# 可用的界面主题（构建期由 config.env 的 UI_THEME 指定）
# 真源在这里；frontend/vite.config.ts 与 frontend/src/shared/config/theme.ts
# 各有一份副本，scripts/check-theme.sh 会断言几处不漂移。
UI_THEMES="liquid-glass memphis"
DEFAULT_UI_THEME="memphis"
# resolve_ui_theme 的结果（调用后覆盖）
UI_THEME_RESOLVED="$DEFAULT_UI_THEME"

# 校验 UI_THEME；不合法就退回默认主题并提示
# 结果写进全局变量 UI_THEME_RESOLVED —— 不要改成 stdout 返回：
# 命令替换会把警告一起吞进去，主题值就脏了（曾因此白屏）
resolve_ui_theme() {
  local t="${UI_THEME:-}"
  t="$(printf '%s' "$t" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
  if [ -z "$t" ]; then
    UI_THEME_RESOLVED="$DEFAULT_UI_THEME"
    return 0
  fi
  for known in $UI_THEMES; do
    if [ "$t" = "$known" ]; then
      UI_THEME_RESOLVED="$t"
      return 0
    fi
  done
  warn "UI_THEME=${UI_THEME} 不是已知主题（可选：${UI_THEMES// /, }）→ 退回 ${DEFAULT_UI_THEME}"
  UI_THEME_RESOLVED="$DEFAULT_UI_THEME"
}

ask_yes_no() {
  local prompt="$1" reply
  printf "  %s%s [y/N] %s" "$C_B" "$prompt" "$C_RESET"
  read -r reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

# 读取配置（不存在就从模板复制）
load_config() {
  if [ ! -f "$CONFIG_FILE" ]; then
    if [ -f "$PROJECT_ROOT/config.env.example" ]; then
      cp "$PROJECT_ROOT/config.env.example" "$CONFIG_FILE"
      ok "已从模板创建配置：$CONFIG_FILE"
    else
      die "缺少配置模板：$PROJECT_ROOT/config.env.example"
    fi
  fi
  set -a
  # shellcheck disable=SC1090
  . "$CONFIG_FILE"
  set +a
}

# 读取单个配置项（不加载整个文件）
config_get() {
  local key="$1"
  [ -f "$CONFIG_FILE" ] || return 0
  sed -n "s/^${key}=//p" "$CONFIG_FILE" | head -1 | sed 's/^"//; s/"$//'
}

# 写单个配置项（保留注释与其它行）
config_set() {
  local key="$1" value="$2"
  [ -f "$CONFIG_FILE" ] || cp "$PROJECT_ROOT/config.env.example" "$CONFIG_FILE"
  local escaped="${value//\\/\\\\}"
  escaped="${escaped//\"/\\\"}"
  if grep -q "^${key}=" "$CONFIG_FILE"; then
    # 用分隔符避免值里的 / 干扰
    awk -v k="$key" -v v="\"$escaped\"" '
      $0 ~ "^"k"=" { print k "=" v; next } { print }
    ' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
  else
    printf '%s="%s"\n' "$key" "$escaped" >> "$CONFIG_FILE"
  fi
}

config_unset() {
  local key="$1"
  [ -f "$CONFIG_FILE" ] || return 0
  grep -v "^${key}=" "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
}

# 需要登录 Cloudflare 的脚本统一走这里
require_login() {
  local who
  who="$(cd "$BACKEND_DIR" && npx --no-install wrangler whoami 2>/dev/null)" || true
  if ! printf '%s' "$who" | grep -qi "account"; then
    die "还没登录 Cloudflare。先跑：scripts/login.sh"
  fi
}

#!/usr/bin/env bash
# =============================================================================
# 查看 / 修改配置
#
#   scripts/config.sh show            列出全部配置
#   scripts/config.sh get KEY         看某一项
#   scripts/config.sh set KEY VALUE   改某一项
#   scripts/config.sh unset KEY       删掉某一项
#   scripts/config.sh edit            用编辑器打开
#   scripts/config.sh check           校验配置是否可用
# =============================================================================
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

CMD="${1:-show}"
shift || true

case "$CMD" in
  show)
    step "当前配置（${CONFIG_FILE}）"
    if [ -f "$CONFIG_FILE" ]; then
      grep -vE '^\s*#|^\s*$' "$CONFIG_FILE" | sed 's/^/  /'
    else
      warn "还没有配置文件"
    fi
    ;;

  get)
    KEY="${1:-}"
    [ -n "$KEY" ] || die "用法：config.sh get KEY"
    VALUE="$(config_get "$KEY")"
    printf '%s=%s\n' "$KEY" "$VALUE"
    ;;

  set)
    KEY="${1:-}"; VALUE="${2:-}"
    [ -n "$KEY" ] || die "用法：config.sh set KEY VALUE"
    load_config
    config_set "$KEY" "$VALUE"
    ok "$KEY = $VALUE"
    note "改完记得重新构建部署：scripts/build.sh && scripts/upload.sh"
    ;;

  unset)
    KEY="${1:-}"
    [ -n "$KEY" ] || die "用法：config.sh unset KEY"
    load_config
    config_unset "$KEY"
    ok "已删除 $KEY"
    ;;

  edit)
    load_config
    EDITOR="${EDITOR:-vi}"
    "$EDITOR" "$CONFIG_FILE"
    ok "配置已保存（记得重新 build + upload）"
    ;;

  check)
    load_config
    step "校验配置"
    PROBLEMS=0
    check_one() {
      local label="$1" value="$2" pattern="$3" hint="$4"
      if printf '%s' "$value" | grep -qE "$pattern"; then
        ok "$label = $value"
      else
        warn "$label = ${value:-（空）}  → $hint"
        PROBLEMS=$((PROBLEMS + 1))
      fi
    }
    check_one "SERVER_NAME"     "${SERVER_NAME:-}"     '^[^[:space:]]+$'        '不能为空'
    check_one "WORKER_NAME"     "${WORKER_NAME:-}"     '^[a-z0-9-]+$'           '只能是小写字母、数字、连字符'
    check_one "PAGES_PROJECT"   "${PAGES_PROJECT:-}"   '^[a-z0-9-]+$'           '只能是小写字母、数字、连字符'
    check_one "API_HOST"        "${API_HOST:-}"        '^([a-z0-9-]+\.)+[a-z]{2,}$' '应该是域名，例如 api.example.com'
    check_one "PLUGIN_API_BASE_URL" "${PLUGIN_API_BASE_URL:-}" '^https?://'  '应该是 http(s) 地址'
    if printf '%s' "${TURNSTILE_SITE_KEY:-}" | grep -q '0x4xxxxxxx'; then
      warn "TURNSTILE_SITE_KEY 还是占位符 → 本次构建不启用人机验证"
    elif [ -n "${TURNSTILE_SITE_KEY:-}" ]; then
      ok "TURNSTILE_SITE_KEY = ${TURNSTILE_SITE_KEY:0:8}…（已配置）"
    else
      note "TURNSTILE_SITE_KEY 未设置 → 不启用人机验证"
    fi
    if [ "$PROBLEMS" -gt 0 ]; then
      warn "有 $PROBLEMS 项需要注意"
    else
      ok "配置看起来没问题"
    fi
    ;;

  *)
    die "未知命令：${CMD}（可用：show / get / set / unset / edit / check）"
    ;;
esac

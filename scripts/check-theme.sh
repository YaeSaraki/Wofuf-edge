#!/usr/bin/env bash
# =============================================================================
# 主题一致性断言：真源只有一处，其余副本不许漂移
#
#   scripts/check-theme.sh
#
# 两层：
#   1. 静态：默认主题与主题清单在各个副本之间一致
#      真源 = scripts/lib.sh；副本 = frontend/vite.config.ts、
#      frontend/src/shared/config/theme.ts、frontend/index.html、docs/THEMES.md
#   2. 产物：deploy/web/index.html 里注入的主题值合法，且首屏内联脚本语法没错
#      （语法坏掉 = 首屏脚本不执行 = 白屏）
#
# 退出码：有断言失败 → 1；全部通过 → 0
# =============================================================================
set -uo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

LIB_SH="$PROJECT_ROOT/scripts/lib.sh"
VITE_CONFIG="$PROJECT_ROOT/frontend/vite.config.ts"
THEME_TS="$PROJECT_ROOT/frontend/src/shared/config/theme.ts"
INDEX_HTML="$PROJECT_ROOT/frontend/index.html"
THEMES_MD="$PROJECT_ROOT/docs/THEMES.md"
WEB_HTML="$PROJECT_ROOT/deploy/web/index.html"

FAILED=0
fail() { err "$*"; FAILED=$((FAILED + 1)); }

# 把 "a b c" / ['a', 'b'] / "a\nb" 统一成 "a b c"
normalize_list() { tr -d "\"'" | tr -s ' \n\t,' ' ' | tr -s ' ' | sed 's/^ *//; s/ *$//'; }

step "主题一致性断言"

# ── 取值 ────────────────────────────────────────────────────────────────────
lib_default="$(sed -n 's/^DEFAULT_UI_THEME="\([^"]*\)".*/\1/p' "$LIB_SH" | head -1)"
lib_themes="$(sed -n 's/^UI_THEMES="\(.*\)".*/\1/p' "$LIB_SH" | head -1)"

vite_default="$(sed -n "s/^const DEFAULT_UI_THEME = '\([^']*\)'.*/\1/p" "$VITE_CONFIG" | head -1)"
vite_themes="$(sed -n 's/^const UI_THEMES = \[\(.*\)\].*/\1/p' "$VITE_CONFIG" | head -1)"

ts_default="$(sed -n "s/^export const DEFAULT_THEME: ThemeId = '\([^']*\)'.*/\1/p" "$THEME_TS" | head -1)"
ts_themes="$(sed -n '/^export const THEME_REGISTRY = {/,/^} as const/p' "$THEME_TS" \
  | grep -oE "^  '?[a-z][a-z0-9-]*'?:" | grep -oE "[a-z][a-z0-9-]*" | tr '\n' ' ')"

html_default="$(grep -oE "t\.charAt\(0\) !== '%'\) \? t : '[a-z0-9-]+'" "$INDEX_HTML" \
  | grep -oE "'[a-z0-9-]+'$" | tr -d "'")"

doc_default="$(grep -oE '退回 `[a-z0-9-]+`' "$THEMES_MD" | head -1 | grep -oE '[a-z0-9-]+')"

# ── 1. 静态一致性 ───────────────────────────────────────────────────────────
[ -n "$lib_default" ] || fail "读不到 scripts/lib.sh 的 DEFAULT_UI_THEME"
[ -n "$lib_themes" ] || fail "读不到 scripts/lib.sh 的 UI_THEMES"
[ -n "$vite_default" ] || fail "读不到 frontend/vite.config.ts 的 DEFAULT_UI_THEME"
[ -n "$vite_themes" ] || fail "读不到 frontend/vite.config.ts 的 UI_THEMES"
[ -n "$ts_default" ] || fail "读不到 theme.ts 的 DEFAULT_THEME"
[ -n "$ts_themes" ] || fail "读不到 theme.ts 的 THEME_REGISTRY"
[ -n "$html_default" ] || fail "读不到 frontend/index.html 的兜底主题"
[ -n "$doc_default" ] || fail "读不到 docs/THEMES.md 里写的主题"

if [ "$lib_default" = "$vite_default" ] && [ "$lib_default" = "$ts_default" ] \
  && [ "$lib_default" = "$html_default" ] && [ "$lib_default" = "$doc_default" ]; then
  ok "默认主题一致：$lib_default"
else
  fail "默认主题不一致：lib.sh=$lib_default vite.config.ts=$vite_default theme.ts=$ts_default index.html=$html_default THEMES.md=$doc_default"
fi

lib_themes_n="$(printf '%s' "$lib_themes" | normalize_list | tr ' ' '\n' | sort | tr '\n' ' ' | sed 's/ $//')"
vite_themes_n="$(printf '%s' "$vite_themes" | normalize_list | tr ' ' '\n' | sort | tr '\n' ' ' | sed 's/ $//')"
ts_themes_n="$(printf '%s' "$ts_themes" | normalize_list | tr ' ' '\n' | sort | tr '\n' ' ' | sed 's/ $//')"

if [ "$lib_themes_n" = "$vite_themes_n" ] && [ "$lib_themes_n" = "$ts_themes_n" ]; then
  ok "主题清单一致：$lib_themes_n"
else
  fail "主题清单不一致：lib.sh=$lib_themes_n vite.config.ts=$vite_themes_n theme.ts=$ts_themes_n"
fi

# 默认主题必须在清单里
case " $lib_themes_n " in
  *" $lib_default "*) ok "默认主题在清单内：$lib_default" ;;
  *) fail "默认主题 $lib_default 不在主题清单里（$lib_themes_n）" ;;
esac

# ── 2. 产物 ─────────────────────────────────────────────────────────────────
if [ ! -f "$WEB_HTML" ]; then
  note "没有 $WEB_HTML —— 跳过产物检查（先跑 scripts/build.sh）"
else
  injected="$(grep -oE "var t = '[^']*'" "$WEB_HTML" | head -1 | sed "s/var t = '//; s/'$//")"
  if [ -z "$injected" ]; then
    fail "产物里找不到注入的主题值（var t = '…'）"
  elif [ "$injected" = "%VITE_UI_THEME%" ]; then
    fail "产物里 VITE_UI_THEME 没被替换（还是占位符）"
  elif printf '%s\n' $lib_themes | grep -qx "$injected"; then
    ok "产物注入的主题合法：$injected"
  else
    fail "产物注入的主题不合法：$injected（可选：$lib_themes）"
  fi

  # 首屏内联脚本语法 —— 坏了就是白屏
  # 语法检查走 stdin：node --check -（Node ≥ 10 都支持，实测 20 / 24 均可）。
  # 别用进程替换 <(...)：Linux 上它是 pipe:[...] 的 magic symlink，
  # Node 解析成 /proc/<pid>/fd/pipe:[...] 直接 ENOENT —— macOS 能过、Linux CI 必挂。
  inline_src="$(sed -n '/<script>/,/<\/script>/p' "$WEB_HTML" | sed '1d;$d')"
  if [ -z "$inline_src" ]; then
    fail "产物里找不到首屏内联脚本"
  else
    # 以退出码判定成败，stderr 只当错误信息看
    # （别用「stderr 是否为空」当判据，那会把无害告警误判成语法错误）
    if inline_err="$(printf '%s\n' "$inline_src" | node --check - 2>&1)"; then
      ok "首屏内联脚本语法正常"
    else
      fail "首屏内联脚本语法错误（会白屏）"
      printf '%s\n' "$inline_err" | head -5 >&2
    fi
  fi
fi

# ── 汇总 ────────────────────────────────────────────────────────────────────
if [ "$FAILED" -gt 0 ]; then
  warn "主题断言失败 $FAILED 项"
  exit 1
fi
ok "主题断言全部通过"

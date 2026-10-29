#!/usr/bin/env bash
# =============================================================================
# 更新：拉取最新代码 → 重新构建 → 重新上传
#
#   scripts/update.sh              # 完整更新
#   scripts/update.sh --no-pull    # 只重建+重传
#   scripts/update.sh --check      # 只看有没有新版本
# =============================================================================
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

load_config
MODE="${1:-all}"

step "检查更新"
if [ -d "$REPO_ROOT/.git" ]; then
  cd "$REPO_ROOT"
  if [ "$MODE" = "--check" ]; then
    git fetch --quiet 2>/dev/null || true
    LOCAL="$(git rev-parse --short HEAD 2>/dev/null || echo '?')"
    REMOTE="$(git rev-parse --short '@{u}' 2>/dev/null || echo '?')"
    if [ "$LOCAL" = "$REMOTE" ]; then
      ok "已是最新（${LOCAL}）"
    else
      warn "本地 ${LOCAL}，远程 $REMOTE —— 有新版本"
      note "跑 scripts/update.sh 拉取并部署"
    fi
    exit 0
  fi

  if [ "$MODE" != "--no-pull" ]; then
    sub "git pull"
    if git pull --ff-only 2>&1 | tail -3 | sed 's/^/    /'; then
      ok "代码已更新"
    else
      die "拉取失败（可能有本地改动：git stash 后再试）"
    fi
  fi
else
  note "不是 git 仓库，跳过拉取"
fi

step "重新构建"
"$PROJECT_ROOT/scripts/build.sh"

step "重新上传"
"$PROJECT_ROOT/scripts/upload.sh" all

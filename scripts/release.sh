#!/usr/bin/env bash
# =============================================================================
# 打发布包：前端 + 后端 + 运维脚本 + 文档，打成一个 tar.gz
#
#   scripts/release.sh [版本号]
#
# 产物：dist/wofuf-release-<版本>.tar.gz
# =============================================================================
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

load_config
VERSION="${1:-$(date '+%Y%m%d-%H%M')}"
OUT_DIR="$PROJECT_ROOT/dist"
STAGE="$OUT_DIR/wofuf-release-$VERSION"

step "准备发布包"
rm -rf "$STAGE"
mkdir -p "$STAGE"

copy_tree() {
  local src="$1" dst="$2"
  mkdir -p "$STAGE/$dst"
  (cd "$src" && tar cf - \
    --exclude='node_modules' --exclude='.git' --exclude='.wrangler' \
    --exclude='build' --exclude='dist' --exclude='.gradle' --exclude='.kotlin' \
    --exclude='.DS_Store' --exclude='deploy' --exclude='*.zip' \
    --exclude='.dev.vars' --exclude='config.env' --exclude='dist' \
    .) | (cd "$STAGE/$dst" && tar xf -)
}

# 整个项目（后端 + 前端 deploy-front + ops + docs 都在里面）
copy_tree "$PROJECT_ROOT"   "wofuf-edge"

# 配置模板（不带真实值）
cp "$PROJECT_ROOT/config.env.example" "$STAGE/wofuf-edge/config.env.example"
rm -f "$STAGE/wofuf-edge/config.env"
rm -rf "$STAGE/wofuf-edge/dist" "$STAGE/wofuf-edge/deploy" "$STAGE/wofuf-edge/frontend/dist"

cat > "$STAGE/快速开始.md" <<'QUICKSTART'
# Wofuf Edge 快速开始

```bash
cd wofuf-edge
npm install                     # 后端
cd deploy-front && npm install  # 前端
cd ..

cp config.env.example config.env   # 按需修改
./wofuf.sh doctor      # 体检
./wofuf.sh setup       # 首次部署向导
```

- 后端：`src/`（Workers + Hono + D1）
- 前端：`deploy-front/`（Vue 3 + Vite）
- 运维：``（统一入口 `./wofuf.sh`）

详见 `README.md` 与 `docs/DEPLOY.md`。
QUICKSTART

step "打包"
cd "$OUT_DIR"
tar czf "wofuf-release-$VERSION.tar.gz" "wofuf-release-$VERSION"
ok "发布包：$OUT_DIR/wofuf-release-$VERSION.tar.gz ($(du -h "$OUT_DIR/wofuf-release-$VERSION.tar.gz" | cut -f1))"

note ""
note "包含：wofuf-edge（backend/ + frontend/ + scripts/ + docs/）"

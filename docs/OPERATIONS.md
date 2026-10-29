# 运维手册

前端 + 后端的部署**全部脚本化**，所有个性化信息集中在 **`config.env`** 这一个文件里。

## 统一入口

```bash
./wofuf <命令>          # 项目根目录
```

| 命令 | 作用 |
|---|---|
| `./wofuf doctor` | **部署前体检**：九项检查，告诉你哪里没配好 |
| `./wofuf setup` | 首次部署向导（配置 → 登录 → 构建 → 上传） |
| `./wofuf login` / `logout` | 登录 / 退出 Cloudflare |
| `./wofuf config show\|get\|set\|unset\|edit\|check` | 配置管理 |
| `./wofuf build` | 构建 Worker + 前端 |
| `./wofuf upload` / `upload worker` / `upload frontend` | 上传 |
| `./wofuf deploy` | 构建 + 上传（一条龙） |
| `./wofuf update` / `update --check` / `update --no-pull` | 更新 |
| `./wofuf status` | 当前状态 |
| `./wofuf release [版本]` | 打发布包 |
| `./wofuf help` | 帮助 |

## 配置

`config.env`（项目根，**gitignore**）：

```ini
SERVER_NAME="MCS"                 # 站点名（标题 / Logo / 页脚）
SERVER_TAGLINE="Minecraft Server"
SERVER_CORE="Paper"  SERVER_VERSION="26.3"  SERVER_FOUNDED="2024"
SERVER_INTRO="……"                 # 服务器介绍
WORKER_NAME="wofuf-edge"          # Cloudflare Worker 名
PAGES_PROJECT="wofuf-web"         # Cloudflare Pages 项目名
API_HOST="api.example.com"        # Worker 的自定义域名
PAGES_HOST="www.example.com"      # 前端的 Pages 域名
PLUGIN_API_BASE_URL="https://plugin.example.com"   # 插件只读接口
TURNSTILE_SITE_KEY="0x…"          # 人机验证 sitekey（留空 = 不启用）
D1_DATABASE_NAME="wofuf-db"
D1_DATABASE_ID="…"                # wrangler d1 create 的输出
KV_NAMESPACE_ID="…"               # wrangler kv namespace create 的输出
```

改配置：

```bash
./wofuf config edit          # 编辑器打开
./wofuf config set SERVER_NAME "MyMC"
./wofuf config check         # 校验（域名格式、占位符…）
```

改完**必须**重新构建部署（`VITE_*` 是编译期常量）：

```bash
./wofuf build && ./wofuf upload
```

> ⚠️ 配置里**只放 sitekey**（公开值）。Turnstile 的 **secret** 只能用
> `cd deploy/worker && npx wrangler secret put TURNSTILE_SECRET`，绝不能进这个文件。

## 构建产物

| 路径 | 内容 | 入库？ |
|---|---|---|
| `deploy/worker/` | `worker.js` + `wrangler.toml`（生产）+ `migrations/` | ❌ |
| `deploy/web/` | 前端静态产物（Pages 直接部署这个目录） | ❌ |

## Node 开发环境（npm workspaces）

根 `package.json` 用 workspaces 管理两个包，**一次 `npm install` 装好前后端**：

```bash
npm install                  # backend/ + frontend/ 一起装
npm run typecheck             # 前后端类型检查
npm run build                 # 前后端构建
npm run dev:api               # 本地 Worker（:8787）
npm run dev:web               # 本地前端（:5173，/api 代理到 :8787）
```

## 一次性准备

```bash
npm install                      # 后端
npm install     # 前端
cp config.env.example config.env
./wofuf config edit
```

## 体检

```bash
./wofuf doctor
```

九项：工具链 / 依赖 / 配置 / Cloudflare 登录 / D1·KV id / 自定义域名 / 插件可达性 /
人机验证一致性 / 构建产物。有阻断项时退出码为 1。

## 上传

```bash
./wofuf upload             # Worker + 前端（先问一次确认）
./wofuf upload worker      # 只传 Worker
./wofuf upload frontend    # 只传前端
```

Worker 侧先应用 D1 迁移再部署；前端走 `wrangler pages deploy frontend/dist`。
结束后自动探测 API 与前端是否可用。

## 更新

```bash
./wofuf update             # 拉最新代码 → 重建 → 重传
./wofuf update --check     # 只看有没有新版本
./wofuf update --no-pull   # 不拉代码，只重建 + 重传
```

## 发布包

```bash
./wofuf release v1.0.0     # dist/wofuf-release-v1.0.0.tar.gz
```

包含 `src/` + `frontend/` + `scripts/` + `docs/` + `config.env.example`，
**不含**依赖、真实配置与构建产物。接收方解压后：

```bash
cd wofuf-edge
npm install && npm install
cp config.env.example config.env && vi config.env
./wofuf doctor && ./wofuf setup
```

## 手动步骤（脚本不会替你做的）

1. **Worker 自定义域名**：Dashboard → `wofuf-edge` → Settings → Domains & Routes
   → Custom Domains → Add → 填 `API_HOST`；
2. **Pages 自定义域名**：Dashboard → `wofuf-web` → Custom domains → Add → 填 `PAGES_HOST`；
3. **密钥**：`cd deploy/worker && npx wrangler secret put PLUGIN_API_SECRET`；
4. **插件**：Meowo 插件 `config.yml` 里 `webapi.secret` 与上面一致，`contexts.webapi: true`；
5. **隧道**：插件 8080 端口经 Cloudflare Tunnel / frp 暴露到 `PLUGIN_API_BASE_URL`。

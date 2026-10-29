# Wofuf Edge

> Minecraft 服务器管理平台的**无服务器后端** —— Cloudflare Workers + Hono + D1。
> 只读、无状态、常驻零服务器。

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)

```
Minecraft 服务器 ──Tunnel/frp──▶ plugin.example.com
                                        │
                              Cron Trigger（每 5 分钟）
                                        ▼
     前端（Pages）──HTTPS──▶ Workers(Hono) ──▶ D1（SQLite）──▶ 读取
```

---

## 它是什么

- **只读的数据映射服务**：把 Minecraft 服务器的在线玩家、统计、成就、皮肤映射成 JSON；
- **零服务器**：Cloudflare Workers 跑代码，D1 存数据，Cron 定时采集；
- **无状态**：没有登录、没有会话、没有用户、没有论坛 —— 唯一的写入是采集器落库；
- **少依赖**：不用 Redis / Kafka / Eureka / Gateway / MySQL / MinIO。

## 技术栈

| 关注点 | 选型 | 替代了 |
|---|---|---|
| HTTP | Hono（`H1`） | Spring MVC + Spring Cloud Gateway |
| 数据库 | D1（SQLite） | MySQL + JPA/Hibernate |
| 缓存 | Cache API + KV | Caffeine / Redis |
| 定时任务 | Cron Trigger | `@Scheduled` |
| 认证 | 无（公开只读） | JWT + 会话表 + BCrypt |
| 人机验证 | Cloudflare Turnstile（可选） | — |

## 快速开始

```bash
npm install
cp config.env.example config.env    # 填配置
./wofuf doctor                             # 体检：哪里没配好一目了然
./wofuf setup                              # 首次部署向导
```

## 运维入口

所有部署操作都收在一个脚本里：

```bash
./wofuf help        # 命令总览
./wofuf doctor      # 部署前体检
./wofuf setup       # 首次部署向导
./wofuf deploy      # 构建 + 上传
./wofuf status      # 当前状态
./wofuf update      # 更新
./wofuf config edit # 改配置（唯一需要改的文件：config.env）
```

详见 [`docs/OPERATIONS.md`](docs/OPERATIONS.md)。

## API

所有响应都是 `{success, code, data, message}`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 存活检查（不需要密钥） |
| GET | `/api/v1/overview` | 主页聚合：服务器状态 + 玩家规模 + 最近活跃 + 昨日在线 |
| GET | `/api/v1/players` | 在线玩家列表 |
| GET | `/api/v1/players/playerNameOrUuid/{nameOrUuid}` | 玩家档案 |
| GET | `/api/v1/players/statistics/{uuid}` | 玩家统计 |
| GET | `/api/v1/players/advancements/{uuid}` | 玩家成就 |
| GET | `/api/v1/players/skins/{uuid}` | 玩家皮肤 |
| GET | `/api/v1/players/yesterday` | 昨日在线玩家 |
| GET | `/api/v1/players/random-profile?count=` | 随机玩家 |
| GET | `/api/v1/players/search?query=&limit=` | 搜索玩家 |
| GET | `/api/v1/players/server-status` | 服务器状态（在线人数 / TPS / 心跳） |

### 插件侧契约

Worker 通过 `PLUGIN_API_BASE_URL` 拉取 Minecraft 插件的只读接口（**一次快照**）：

```
GET {PLUGIN_API_BASE_URL}/api/v1/snapshot
X-Meow-Secret: <共享密钥>
```

```json
{
  "generatedAt": 1793205583619,
  "server": { "onlinePlayers": 1, "maxPlayers": 20, "tps": 20.0, "heartbeatStatus": true, "updateTime": 1793205583619 },
  "players": [{
    "uuid": "…", "name": "Steve", "firstLogin": 0, "lastLogin": 0, "totalPlaytimeSeconds": 0,
    "statistics": { "BOAT_ONE_CM": { "category": "UNTYPED", "key": "BOAT_ONE_CM", "value": 1234 } },
    "advancements": [{ "key": "story/root", "done": true, "completed": [], "remaining": [] }],
    "skin": { "type": "classic", "url": "https://…", "capeUrl": "" }
  }]
}
```

密钥不一致 → 401；插件不可达 → 采集跳过（页面仍显示上次的数据）。

## 目录结构

```
wofuf-edge/
├── wofuf                   # ★ 统一入口：./wofuf doctor / build / deploy / …
├── backend/                # 后端：Cloudflare Workers + Hono + D1
│   ├── src/
│   │   ├── index.ts          #   路由 + CORS + Turnstile + Cron 入口
│   │   ├── env.ts            #   绑定与配置
│   │   ├── core/             #   纯逻辑：Result / ApiResponse / uuid
│   │   ├── infra/            #   平台相关：D1 仓储、缓存、插件客户端、Turnstile
│   │   ├── modules/players/  #   业务：玩家域模型 + 用例
│   │   └── scheduler/        #   Cron 采集
│   ├── migrations/          #   D1 迁移（版本化）
│   ├── wrangler.toml        #   Worker 配置模板（生产值由 config.env 注入）
│   └── package.json         #   @wofuf/backend
├── frontend/               # 前端：Vue 3 + Vite（Cloudflare Pages）
│   ├── src/                #   modules/{app,players} + shared
│   ├── public/             #   静态资源 + _redirects（SPA 回退）
│   ├── vite.config.ts      #   dev 代理 → 本地 Worker :8787
│   └── package.json        #   wofuf-web
├── deploy/                 # 构建产物（gitignore）
│   ├── worker/             #   worker.js + wrangler.toml（生产）+ migrations/
│   └── web/                #   前端静态产物（Pages 部署这个目录）
├── scripts/                # 运维与构建脚本
│   ├── lib.sh              #   公共函数
│   ├── build.sh upload.sh config.sh doctor.sh
│   └── login.sh logout.sh update.sh status.sh release.sh
├── docs/                   # ARCHITECTURE.md / DEPLOY.md / OPERATIONS.md
├── config.env.example      # 配置模板（config.env 是真实值，gitignore）
├── .github/workflows/ci.yml
└── package.json            # npm workspaces 根：一次 npm install 装好前后端
```

**Node 开发环境**：根目录用 **npm workspaces** 管理两个包 ——

```bash
npm install                 # 一次装好 backend/ 与 frontend/
npm run typecheck            # 前后端一起类型检查
npm run build                # 前后端一起构建
npm run dev:api              # 本地 Worker（wrangler dev :8787）
npm run dev:web              # 本地前端（vite :5173，/api 代理到 :8787）
```

**Cloudflare 部署**：产物统一落在 `deploy/`，部署命令只认这一个目录 ——

```bash
./wofuf build      # -> deploy/worker/ + deploy/web/
./wofuf upload     # deploy/worker → wrangler deploy；deploy/web → pages deploy
```

## 开发

```bash
npm install
cp backend/.dev.vars.example backend/.dev.vars   # 本地密钥
cd backend && npx wrangler d1 migrations apply wofuf-db --local && cd ..
npx wrangler dev
```

## 发布

```bash
./wofuf doctor   # 体检
./wofuf deploy   # 构建 + 上传
./wofuf release  # 打发布包
```

## License

MIT

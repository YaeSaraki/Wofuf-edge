# 架构

## 分层

后端 `backend/src/`：

```
src/
├── index.ts          HTTP 边界：路由、CORS、Turnstile、错误映射、Cron 入口
├── env.ts            绑定与配置（类型化）
├── core/             与 Kotlin 版 shared/ 对应的纯逻辑
│   ├── result.ts     Result / UseCaseError（业务错误不抛异常，交给边界映射）
│   ├── http.ts       ApiResponse 信封 + 错误码 → HTTP 状态码
│   └── ids.ts        uuid v7（时间有序）
├── infra/            与平台打交道的部分
│   ├── db/           D1 仓储（原生 SQL，无 ORM）
│   ├── cache.ts      Cache API（边缘）+ KV（跨区域）
│   ├── crypto/       —— 已随「去状态化」删除
│   ├── plugin-client.ts  插件客户端（一次快照优先，逐玩家回退）
│   └── turnstile.ts  人机验证（令牌一次性 → KV 记已验证）
├── modules/players/  玩家域模型 + 用例（唯一的有业务含义的部分）
└── scheduler/        Cron 采集
```

前端 `frontend/`（**同一个项目里**，不是外部依赖）：

```
frontend/
├── src/modules/{app,players}              业务模块（auth/forum/admin 已删除）
├── src/shared/{config,infra,services,utils}     站点配置、API 客户端、i18n
├── src/views/                                    页面（ServerStats / Player / About）
├── public/_redirects                             SPA 回退（Pages 需要）
└── vite.config.ts                                dev 代理 → 本地 Worker :8787
```

站点个性化（名字、版本、介绍、域名、sitekey）**全部来自 `config.env`**，
构建时以 `VITE_*` 注入 → `frontend/src/shared/config/site.ts`。

## 数据流

```
        ┌──────────────────────────────┐
        │ Minecraft 服务器              │
        │  Meowo 插件 :8080（只读接口）  │
        └──────────────┬───────────────┘
                       │ HTTPS（X-Meow-Secret）
                       │ Cloudflare Tunnel / frp
        ┌──────────────▼───────────────┐
        │ Workers · Hono               │
        │  Cron Trigger（*/5 * * * *）   │
        │  ├─ PluginClient.fetchSnapshot│
        │  ├─ 皮肤 URL → base64        │
        │  └─ persistCollectedPlayers  │
        └──────────────┬───────────────┘
                       │ SQL
        ┌──────────────▼───────────────┐
        │ D1（SQLite）                   │
        │  players / players_daily_online│
        │  server_status                 │
        └──────────────┬───────────────┘
                       │ GET（只读）
        ┌──────────────▼───────────────┐
        │ 前端（Pages / 静态托管）        │
        └──────────────────────────────┘
```

## 几个关键决定

**为什么是快照而不是实时读**
Bukkit API 不是线程安全的。HTTP 线程直接读 Bukkit 就是在等一次竞态。主线程每
`webapi.snapshot-interval-seconds` 秒构建一次不可变快照，HTTP 线程只读已发布的值。

**为什么皮肤只给 URL**
下载图片是网络 I/O，不该占主线程。插件只给纹理 URL，由 Worker 下载并 base64 落库。

**为什么 D1 而不是 MySQL**
Workers 没有长连接，连接池没有意义；D1 是 SQLite，零运维；本项目的数据量（玩家档案）
远小于免费额度。代价是要手写 SQL、用 `migrations/` 版本化。

**为什么没有鉴权**
后端是**完全公开只读**的：能读到的都是公开的服务器数据。去掉登录/会话/用户之后，
攻击面从「鉴权 + 越权」收敛成「只读接口」，复杂度降了一大截。需要挡爬虫时用 Turnstile。

**为什么错误码要映射 HTTP 状态**
业务错误（`PLAYER_NOT_FOUND_ERROR` 等）在边界层统一映射成 404/400/403/409，
前端不用解析文案就知道该做什么。

## 状态在哪里

| 状态 | 位置 | 说明 |
|---|---|---|
| 玩家档案 | D1 `players` | 唯一的业务数据 |
| 每日在线 | D1 `players_daily_online` | 快照副产物 |
| 服务器状态 | D1 `server_status` | 单行 |
| 边缘缓存 | Cache API / KV | 可丢（丢了就回源 D1） |
| 会话 / 用户 | — | **不存在**（去状态化） |

## 演进边界

想加功能时先问一句：**它是状态吗？**
- 是 → 需要考虑存储位置（能放 D1 吗？多副本一致吗？要不要过期？）
- 不是 → 直接加在 `modules/` 里，用例返回 `Result`，边界层映射。

**不要引入**：登录、会话、用户、论坛、后台管理、Redis、Kafka。

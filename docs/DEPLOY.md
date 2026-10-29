# 部署

## 0. 前置

- Node.js ≥ 20
- 一个 Cloudflare 账号（zone `meovo.cc` 在同一账号里）
- 一台跑 Minecraft 的机器（插件 + Tunnel 或 frp）

## 1. 克隆与配置

```bash
git clone <repo> wofuf-edge && cd wofuf-edge
npm install                          # 一次装好 backend + frontend（workspaces）
cp config.env.example config.env
./wofuf config edit      # 填域名、D1/KV id、sitekey…
```

## 2. 登录 Cloudflare

```bash
./wofuf login
```

## 3. 创建 Cloudflare 资源

```bash
cd deploy/worker
npx wrangler d1 create wofuf-db          # → database_id 填回 config.env
npx wrangler kv namespace create CACHE   # → id 填回 config.env
```

## 4. 自定义域名（重要）

`*.workers.dev` 在国内被 DNS 污染，浏览器连不上（超时 / Network Error）。
必须给 Worker 绑一个自己的域名：

```
Dashboard → Workers & Pages → wofuf-edge → Settings → Domains & Routes
  → Custom Domains → Add → api.example.com → Add
```

> 如果 `api.example.com` 下已经有一条指向源站的 DNS 记录，先删掉再加 —— 同名冲突会静默失败。

前端同理：

```
Dashboard → Workers & Pages → wofuf-web → Custom domains → Add → www.example.com
```

## 5. 插件侧

Meowo 插件的 `config.yml`：

```yaml
contexts:
  webapi: true
webapi:
  bind: "127.0.0.1"
  port: 8080
  secret: "<与 Worker 的 PLUGIN_API_SECRET 一致>"
```

Worker 侧：

```bash
cd deploy && npx wrangler secret put PLUGIN_API_SECRET
```

插件端口通过 **Cloudflare Tunnel** 或 **frp** 暴露到 `PLUGIN_API_BASE_URL`：

```bash
# Cloudflare Tunnel
cloudflared tunnel create wofuf
cloudflared tunnel route dns wofuf plugin.example.com
# ingress: hostname: plugin.example.com -> service: http://127.0.0.1:8080
cloudflared tunnel run wofuf
```

## 6. 构建与上传

```bash
./wofuf doctor     # 体检：九项，全绿再传
./wofuf deploy     # build + upload
```

`deploy` 做三件事：
1. 应用 D1 迁移（`wrangler d1 migrations apply --remote`）；
2. 部署 Worker（`wrangler deploy`）；
3. 上传前端（`wrangler pages deploy`）。

## 7. 验证

```bash
curl https://api.example.com/health
curl https://api.example.com/api/v1/overview
curl https://www.example.com/
```

## 常见问题

| 症状 | 原因 |
|---|---|
| 前端报 `timeout of 10000ms exceeded` | `workers.dev` 被污染 → 换自定义域名 |
| 前端报 `Network Error` | 域名没解析 → 自定义域名没绑好，或 DNS 记录冲突 |
| `InvalidOperation: A failing result needs to contain an error message` | 前端没指向 API（`VITE_API_BASE_URL` 空）→ 重新构建 |
| 采集全是 0 | 插件不可达 / 密钥不一致（401）→ `wrangler tail` 看日志 |
| 部署报 `error 10082` | 自定义域名路由缺 `zone_name`，或 zone 与 Worker 不同账号 |
| `EACCES: mkdir .wrangler` | 目录属主不对 → `sudo chown -R $USER deploy` |

## 自动化（可选）

GitHub Actions + `CF_API_TOKEN` 可以在 push tag 时自动部署：

```yaml
- run: npx wrangler deploy
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
```

密钥放仓库的 Settings → Secrets，**不要**写进 workflow 文件。

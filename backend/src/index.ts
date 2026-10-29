/**
 * Wofuf Edge —— Cloudflare Workers + Hono 的**无状态只读** API。
 *
 * 定位：只做「服务器数据 → 客户端」的映射 + 主页聚合。
 * 已被裁剪的能力（代码不再维护，见 document/agents/Wofuf-edge/MIGRATION-PLAN.md）：
 * - 用户注册 / 登录 / 刷新 / 注销 / 鉴权（JWT、会话表、口令哈希全部删除）
 * - 论坛（后端本来就不构建，前端路由已下掉）
 *
 * 替代：infra-gateway（Spring Cloud Gateway）+ infra-discovery（Eureka）
 *      + modules-users + modules-players + MySQL + MinIO + Caffeine + @Scheduled。
 *
 * 路由与响应信封与旧版保持一致（`{success, code, data, message}`），
 * 前端 `VITE_API_BASE_URL` 指过来即可，无需改动业务代码。
 */
import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { cors } from 'hono/cors'
import { z } from 'zod'
import type { Env } from './env'
import { apiError, apiSuccess, respond, statusFromCode } from './core/http'
import { UseCaseError } from './core/result'
import { PlayersUseCases } from './modules/players/useCases'
import { verifyTurnstile } from './infra/turnstile'
import { PlayersRepo } from './infra/db/players.repo'
import { persistCollectedPlayers, runCollect, todayInShanghai, type CollectedPlayer } from './scheduler/collect'

const app = new Hono<{ Bindings: Env }>()

/**
 * CORS：只放行自己的前端域名。
 *
 * `*` 对一个公开只读接口不算漏洞，但既然前端域名是固定的，就写死——
 * 少一条"谁都能调"的边，也省掉浏览器端的猜测。
 *
 * 来源列表来自 `CORS_ORIGINS`（逗号分隔），加新前端域名只改配置、不用改代码。
 */
const corsOrigins = (env: string | undefined): string[] =>
  (env ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)

app.use(
  '*',
  cors({
    // 只有在白名单里的来源才拿到 Access-Control-Allow-Origin；其余的浏览器会拦掉。
    origin: (origin, c) => {
      const allowed = corsOrigins(c.env.CORS_ORIGINS)
      return allowed.includes(origin) ? origin : ''
    },
    // 带自定义头（CF-Turnstile-Response）会触发 CORS 预检，
    // 不在 allowHeaders 里放行的话，预检失败 → 浏览器直接拦掉整个请求。
    allowHeaders: ['Content-Type', 'CF-Turnstile-Response'],
    allowMethods: ['GET', 'OPTIONS'],
    maxAge: 86400,
  }),
)

/**
 * 人机验证（可选）。
 *
 * 配置了 `TURNSTILE_SECRET` 才启用；没配置就直接放行。
 * 预检请求（OPTIONS）不参与验证，否则浏览器的 CORS 预检会先被拦掉。
 */
app.use('/api/*', async (c, next) => {
  // secret 与 sitekey 同时存在才启用；只配一边不会锁死站点。
  if (!c.env.TURNSTILE_SECRET || !c.env.TURNSTILE_SITE_KEY) return next()
  if (c.req.method === 'OPTIONS') return next()

  const failOpen = c.env.TURNSTILE_FAIL_OPEN === 'true'
  const token = c.req.header('CF-Turnstile-Response')
  if (!token) {
    if (failOpen) {
      console.warn('[turnstile] 请求没有令牌，按 TURNSTILE_FAIL_OPEN 放行')
      return next()
    }
    return c.json(
      apiError(new UseCaseError('TURNSTILE_REQUIRED_ERROR', '缺少人机验证令牌')),
      403,
    )
  }

  const passed = await verifyTurnstile(c.env, token, c.req.header('CF-Connecting-IP'))
  if (!passed) {
    if (failOpen) {
      console.warn('[turnstile] 令牌校验失败，按 TURNSTILE_FAIL_OPEN 放行')
      return next()
    }
    return c.json(apiError(new UseCaseError('TURNSTILE_FAILED_ERROR', '人机验证未通过')), 403)
  }

  return next()
})

/* ============================ 基础 ============================ */

/**
 * `/` — 挂着前端时交给前端（首页），否则回一句服务信息。
 */
app.get('/', (c) => {
  const assets = c.env.ASSETS
  if (assets) return assets.fetch(c.req.raw)
  return c.json({
    service: 'wofuf-edge',
    runtime: 'cloudflare-workers',
    framework: 'hono',
    mode: 'stateless-readonly',
    version: '0.2.0',
  })
})

app.get('/api/v1', (c) => c.json(apiSuccess('Wofuf API v1')))

app.get('/health', async (c) => {
  const row = await c.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>()
  return c.json({ status: row?.ok === 1 ? 'ok' : 'degraded', runtime: 'cloudflare-workers' })
})

/* ============================ 主页 ============================ */

/**
 * 主页聚合：一次请求拿齐首页需要的全部数据
 * （服务器状态 + 玩家规模 + 最近活跃玩家 + 昨日在线）。
 */
app.get('/api/v1/overview', async (c) => {
  const status = await PlayersUseCases.getServerStatus(c, c.env)
  const [total, recent, yesterday] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) AS total FROM players').first<{ total: number }>(),
    c.env.DB.prepare('SELECT player_name AS name FROM players ORDER BY last_login DESC LIMIT 5').all<{
      name: string
    }>(),
    PlayersUseCases.getYesterdayOnline(c.env, todayInShanghai(-1)),
  ])

  return c.json(
    apiSuccess({
      serverStatus: status.ok ? status.value : null,
      playerCount: total?.total ?? 0,
      recentPlayers: recent.results.map((row) => row.name),
      yesterdayOnline: yesterday.ok ? yesterday.value.playerNames : [],
    }),
  )
})

/* ============================ 玩家 ============================ */

app.get('/api/v1/players/playerNameOrUuid/:playerNameOrUuid', async (c) => {
  const result = await PlayersUseCases.getPlayer(c.env, c.req.param('playerNameOrUuid'))
  if (!result.ok) return respond(c, result)

  const player = result.value
  return respond(c, {
    ok: true as const,
    value: {
      id: player.player_id,
      name: player.player_name,
      firstLogin: player.first_login,
      lastLogin: player.last_login,
      totalPlaytimeSeconds: player.total_playtime,
      updateTime: player.update_time,
    },
  })
})

app.get('/api/v1/players/statistics/:playerUuid', async (c) => {
  return respond(c, await PlayersUseCases.getStatistics(c.env, c.req.param('playerUuid')))
})

app.get('/api/v1/players/advancements/:playerUuid', async (c) => {
  return respond(c, await PlayersUseCases.getAdvancements(c.env, c.req.param('playerUuid')))
})

app.get('/api/v1/players/skins/:playerUuid', async (c) => {
  return respond(c, await PlayersUseCases.getSkin(c.env, c.req.param('playerUuid')))
})

app.get('/api/v1/players/yesterday', async (c) => {
  return respond(c, await PlayersUseCases.getYesterdayOnline(c.env, todayInShanghai(-1)))
})

app.get('/api/v1/players/random-profile', async (c) => {
  const count = Number(c.req.query('count') ?? '1')
  const result = await PlayersUseCases.getRandom(c.env, Number.isFinite(count) ? count : 1)
  if (!result.ok) return respond(c, result)
  // 与旧版 GetPlayerRandomController 保持一致：返回玩家对象数组
  return respond(c, {
    ok: true as const,
    value: result.value.map((player) => ({
      id: player.id,
      name: player.name,
      firstLogin: player.firstLogin,
      lastLogin: player.lastLogin,
      totalPlaytimeSeconds: player.totalPlaytimeSeconds,
      updateTime: player.updateTime,
    })),
  })
})

app.get('/api/v1/players/search', async (c) => {
  const query = c.req.query('query') ?? ''
  const limit = Number(c.req.query('limit') ?? '20')
  return respond(c, await PlayersUseCases.search(c.env, query, Number.isFinite(limit) ? limit : 20))
})

app.get('/api/v1/players/server-status', async (c) => {
  return respond(c, await PlayersUseCases.getServerStatus(c, c.env))
})

/* ====================== 本地调试（需 ENABLE_DEV_ROUTES=true） ====================== */

/**
 * 模拟插件推送采集数据。
 * 生产环境由 Cron Trigger -> PluginClient -> Tunnel 完成；本地 workerd 无法访问
 * 127.0.0.1（workerd 禁止回环地址出网），故提供该注入路由做端到端联调。
 */
app.post('/__dev/collect', async (c) => {
  if (c.env.ENABLE_DEV_ROUTES !== 'true') {
    return c.json(apiError(new UseCaseError('NOT_FOUND_ERROR', 'Not found')), 404)
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    players?: CollectedPlayer[]
    serverStatus?: {
      onlinePlayers: number
      maxPlayers: number
      tps: number
      heartbeatStatus: boolean
      updateTime: number
    }
  }

  const day = todayInShanghai()
  const count = await persistCollectedPlayers(c.env, day, body.players ?? [])

  if (body.serverStatus) {
    await PlayersRepo.saveServerStatus(c.env.DB, {
      online_players: body.serverStatus.onlinePlayers,
      max_players: body.serverStatus.maxPlayers,
      tps: body.serverStatus.tps,
      heartbeat_status: body.serverStatus.heartbeatStatus ? 1 : 0,
      update_time: body.serverStatus.updateTime,
    })
    await caches.default.delete(
      new Request('https://wofuf-edge.internal/api/v1/players/server-status'),
    )
  }

  return c.json({ success: true, count, day })
})

/* ============================ 错误处理 ============================ */

/**
 * 未匹配的路径：如果挂着前端静态资源，就交给它（Vue Router 的 history 路由需要 SPA 回退），
 * 否则照常 404。
 */
app.notFound((c) => {
  const assets = c.env.ASSETS
  if (assets) return assets.fetch(c.req.raw)
  return c.json(apiError(new UseCaseError('NOT_FOUND_ERROR', 'Resource not found')), 404)
})

app.onError((error, c) => {
  if (error instanceof UseCaseError) {
    return c.json(apiError(error), statusFromCode(error.code) as ContentfulStatusCode)
  }
  console.error('[wofuf-edge] unhandled error', error)
  return c.json(apiError(new UseCaseError('INTERNAL_ERROR', 'Internal server error')), 500)
})

/* ============================ 定时任务 ============================ */

export default {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(runCollect(env))
  },
}

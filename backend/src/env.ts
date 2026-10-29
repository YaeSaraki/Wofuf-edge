/**
 * Worker 运行时绑定与配置。
 *
 * 对应原 Spring Boot 的 application.yml：
 * - `plugin.api.*`      -> PLUGIN_API_BASE_URL / PLUGIN_API_SECRET / BACKUP_SKIN_URL
 * - MySQL datasource    -> D1 binding `DB`
 * - Caffeine cache      -> KV binding `CACHE` + Cache API
 *
 * 注意：项目已去掉登录/会话/用户等**有状态**能力（无 JWT、无会话表、无口令哈希），
 * 后端退化为「服务器数据的只读映射服务」。
 */
export type Env = {
  /** D1 数据库 */
  DB: D1Database
  /** KV 命名空间（缓存） */
  CACHE: KVNamespace
  /** MeovO 插件 HTTP API（Cloudflare Tunnel 暴露后的公网地址） */
  PLUGIN_API_BASE_URL: string
  /** 与插件 `secret-key` 一致的共享密钥 */
  PLUGIN_API_SECRET: string
  /** 皮肤备用地址 */
  BACKUP_SKIN_URL: string
  /** 允许跨域的前端来源（逗号分隔）。留空 = 不允许任何跨域来源。 */
  CORS_ORIGINS?: string
  /**
   * Turnstile 的 secret。留空 = 不启用人机验证（接口直接放行）。
   * 用 `wrangler secret put TURNSTILE_SECRET` 设置，不要写进 wrangler.toml。
   */
  TURNSTILE_SECRET?: string
  /**
   * Turnstile 的 sitekey（公开值）。
   *
   * **必须和 secret 同时存在才启用验证**：只配 secret 会把没带令牌的前端全站打成 403，
   * 这是最容易被踩的一步。两者都齐才说明「前端也会带令牌」。
   */
  TURNSTILE_SITE_KEY?: string
  /**
   * 人机验证失败时是否放行。
   *
   * `true` = 脚本被拦截/网络不通时站点照常可用（但等于没有防护）；
   * `false` = 严格，没有令牌就 403。
   */
  TURNSTILE_FAIL_OPEN?: string
  /** 本地调试开关：开启 /__dev/* 路由（生产环境不要设置） */
  ENABLE_DEV_ROUTES?: string
  /**
   * 前端静态资源（Workers Static Assets）。
   *
   * 只有「前端与 API 同域同 Worker」的部署方式才有这个绑定；没有它时，未匹配的路径照常 404。
   */
  ASSETS?: Fetcher
}

export const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * 缓存层 —— 替代 Caffeine（服务器状态 5 分钟 / 昨日在线 24 小时 / 采集冷却 5 分钟）。
 *
 * - Cache API：边缘数据中心级缓存，命中即 0 成本读 D1；用 `caches.default`。
 * - KV：跨数据中心的最终兜底（Caffeine 语义是「进程内」，KV 语义是「全局」，
 *   对 server status / yesterday 这类读多写少的数据更合适）。
 */
import type { Context } from 'hono'
import type { Env } from '../env'

const cacheRequest = (key: string): Request => new Request(`https://wofuf-edge.internal${key}`)

export const cachedJson = async <T>(
  c: Context,
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> => {
  const cache = caches.default
  const request = cacheRequest(key)

  const hit = await cache.match(request)
  if (hit) {
    return (await hit.json()) as T
  }

  const value = await loader()
  const response = new Response(JSON.stringify(value), {
    headers: {
      'content-type': 'application/json',
      'cache-control': `public, max-age=${ttlSeconds}`,
    },
  })
  c.executionCtx.waitUntil(cache.put(request, response.clone()))
  return value
}

/** KV 兜底：把冷数据放进 KV，避免每次回源 D1 */
export const kvCachedJson = async <T>(
  env: Env,
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> => {
  const cached = await env.CACHE.get(key, 'json')
  if (cached !== null) return cached as T

  const value = await loader()
  await env.CACHE.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, ttlSeconds) })
  return value
}

export const kvInvalidate = async (env: Env, key: string): Promise<void> => {
  await env.CACHE.delete(key)
}

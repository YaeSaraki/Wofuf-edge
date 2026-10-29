/**
 * Cloudflare Turnstile 校验。
 *
 * API 是公开只读的接口，Turnstile 用来把爬虫挡在门外：前端拿一次性令牌，
 * Worker 用 secret 校验它。
 *
 * **没有配置 `TURNSTILE_SECRET` 就整套不启用**（直接放行），所以本地开发、
 * 预览环境不需要任何额外设置。
 */
import type { Env } from '../env'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** 令牌是一次性的：Cloudflare 只允许校验一次，重复校验返回 timeout-or-duplicate */
const VERIFIED_TTL_SECONDS = 300

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * 校验一个 Turnstile 令牌。
 *
 * 同一串请求会复用同一个令牌，而令牌只能被官方校验一次，所以这里把「已通过」
 * 的结果记在 KV 里（TTL 与令牌有效期一致），后续请求直接放行。
 */
export const verifyTurnstile = async (
  env: Env,
  token: string,
  remoteIp?: string,
): Promise<boolean> => {
  const secret = env.TURNSTILE_SECRET
  // secret 与 sitekey 必须**同时**存在：只配 secret 会让没带令牌的前端全站 403。
  if (!secret || !env.TURNSTILE_SITE_KEY) return true

  const key = `turnstile:${await sha256Hex(token)}`
  const verified = await env.CACHE.get(key)
  if (verified) return true

  const body = new URLSearchParams({ secret, response: token })
  if (remoteIp) body.set('remoteip', remoteIp)

  try {
    const response = await fetch(VERIFY_URL, { method: 'POST', body })
    if (!response.ok) {
      console.warn(`[turnstile] 校验请求失败：HTTP ${response.status}`)
      return false
    }

    const result = (await response.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (!result.success) {
      console.warn('[turnstile] 校验未通过：', result['error-codes'] ?? [])
      return false
    }

    await env.CACHE.put(key, '1', { expirationTtl: VERIFIED_TTL_SECONDS })
    return true
  } catch (error) {
    console.warn('[turnstile] 校验异常：', (error as Error).message)
    return false
  }
}

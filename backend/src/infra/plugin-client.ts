/**
 * Meowo 插件 HTTP 客户端 —— 替代原 `PluginApiClientImpl` / `MeovoClient`（RestTemplate）。
 *
 * 关键约束：Workers 运行在 Cloudflare 边缘，**无法访问 127.0.0.1:8080**。
 * 必须把插件的 HTTP 端口通过 Cloudflare Tunnel 暴露为公网地址，
 * 再由本客户端按 Cron 拉取（详见 document/agents/Wofuf-edge/MIGRATION-PLAN.md）。
 *
 * 认证：插件强制校验 `X-Meow-Secret` 共享密钥（走公网后 IP 白名单不再足够）。
 *
 * 契约（与 Meowo 的 meowo-webapi context 对齐）：
 *   GET /api/v1/snapshot 一次拿到全部：服务器状态 + 每个玩家的统计/成就/皮肤 URL
 */
import type { Env } from '../env'

export type PluginStatistic = {
  category: string
  key: string
  value: number
}

export type PluginAdvancement = {
  key: string
  done: boolean
  completed: string[]
  remaining: string[]
}

export type PluginSkin = {
  type: string
  url: string
  capeUrl: string
}

export type PluginPlayerSnapshot = {
  uuid: string
  name: string
  firstLogin: number
  lastLogin: number
  totalPlaytimeSeconds: number
  statistics: Record<string, PluginStatistic>
  advancements: PluginAdvancement[]
  skin: PluginSkin
}

export type PluginServerStatus = {
  onlinePlayers: number
  maxPlayers: number
  tps: number
  heartbeatStatus: boolean
  updateTime: number
}

export type PluginWorldSnapshot = {
  generatedAt: number
  server: PluginServerStatus
  players: PluginPlayerSnapshot[]
}

/** 兼容旧 MeovO 插件的返回形状（仅在缺少 snapshot 接口时使用）。 */
export type LegacyPlayer = {
  uuid: string
  name: string
  online: boolean
  world: string
  firstLogin: number
  lastLogin: number
  totalPlaytimeSeconds: number
}

const json = async <T>(env: Env, path: string): Promise<T | null> => {
  const url = `${env.PLUGIN_API_BASE_URL.replace(/\/$/, '')}${path}`
  try {
    const response = await fetch(url, {
      headers: {
        'X-Meow-Secret': env.PLUGIN_API_SECRET ?? '',
        'X-MeovO-Secret': env.PLUGIN_API_SECRET ?? '',
        Accept: 'application/json',
      },
    })
    if (!response.ok) {
      console.warn(`[plugin] ${path} -> HTTP ${response.status}`)
      return null
    }
    return (await response.json()) as T
  } catch (error) {
    console.warn(`[plugin] ${path} failed: ${(error as Error).message}`)
    return null
  }
}

const bytesToBase64 = async (bytes: ArrayBuffer): Promise<string> => {
  const view = new Uint8Array(bytes)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export const PluginClient = {
  /**
   * 首选接口：一次请求拿到全部数据（省掉每个玩家 4 次往返）。
   */
  async fetchSnapshot(env: Env): Promise<PluginWorldSnapshot | null> {
    const snapshot = await json<PluginWorldSnapshot>(env, '/api/v1/snapshot')
    if (!snapshot || !Array.isArray(snapshot.players) || !snapshot.server) return null
    return snapshot
  },

  /** 兼容路径：旧插件（逐玩家拉取）。 */
  async fetchOnlinePlayers(env: Env): Promise<LegacyPlayer[]> {
    const result = await json<LegacyPlayer[]>(env, '/api/v1/players')
    return Array.isArray(result) ? result : []
  },

  async fetchStatistics(env: Env, uuid: string): Promise<Record<string, PluginStatistic>> {
    const result = await json<{ statistics: Record<string, PluginStatistic> }>(
      env,
      `/api/v1/statistics/${uuid}`,
    )
    return result?.statistics ?? {}
  },

  async fetchAdvancements(env: Env, uuid: string): Promise<PluginAdvancement[]> {
    const result = await json<{ advancements: PluginAdvancement[] }>(
      env,
      `/api/v1/advancements/${uuid}`,
    )
    return result?.advancements ?? []
  },

  async fetchSkin(env: Env, uuid: string): Promise<PluginSkin | null> {
    const meta = await json<PluginSkin>(env, `/api/v1/skins/${uuid}`)
    if (!meta) return null
    return { type: meta.type ?? 'default', url: meta.url ?? '', capeUrl: meta.capeUrl ?? '' }
  },

  async fetchServerStatus(env: Env): Promise<PluginServerStatus | null> {
    return json<PluginServerStatus>(env, '/api/v1/server/status')
  },

  /**
   * 皮肤图片下载 + base64。
   * 插件只给纹理 URL（它不该在主线程做网络 I/O），下载放在 Worker 侧。
   */
  async downloadAsBase64(url: string): Promise<string | null> {
    if (!url) return null
    if (url.startsWith('data:')) {
      const comma = url.indexOf(',')
      return comma >= 0 ? url.slice(comma + 1) : null
    }
    if (!/^https?:\/\//i.test(url)) return url

    try {
      const response = await fetch(url)
      if (!response.ok) return null
      return await bytesToBase64(await response.arrayBuffer())
    } catch (error) {
      console.warn(`[plugin] skin download failed: ${(error as Error).message}`)
      return null
    }
  },
}

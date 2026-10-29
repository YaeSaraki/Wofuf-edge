/**
 * 玩家数据采集 —— 替代 Kotlin 侧 `CollectPlayerDataScheduler`（@Scheduled fixedDelay）。
 *
 * 原实现用两个 @Scheduled + 内存队列 + Caffeine 冷却来节流：
 * - `collectOnlinePlayers` 每 60 秒拉一次在线玩家
 * - `popCollectedPlayer` 每 600 秒弹出一个玩家做深度采集
 *
 * Workers 上改为 Cloudflare Cron Trigger（分钟级）+ 采集去重表，
 * 由 `collect_runs` 保证同一玩家的深度采集在冷却窗口内只做一次。
 */
import { PlayersRepo, type PlayerUpsert } from '../infra/db/players.repo'
import { PluginClient } from '../infra/plugin-client'
import type { Env } from '../env'

/** 以 Asia/Shanghai 为业务时区取当天日期字符串 */
export const todayInShanghai = (offsetDays = 0): string => {
  const now = new Date(Date.now() + offsetDays * 86400_000)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return parts
}

const COLLECT_COOLDOWN_MS = 5 * 60 * 1000

/** 采集结果（与传输方式解耦，便于测试与复用） */
export type CollectedPlayer = {
  playerId: string
  playerName: string
  firstLogin: number
  lastLogin: number
  totalPlaytimeSeconds: number
  statistics: unknown
  advancements: unknown
  skinType: string
  skinImage: string
  skinCape: string
}

/** 把采集结果落库（幂等：同一玩家重复采集只会 UPDATE） */
export const persistCollectedPlayers = async (
  env: Env,
  day: string,
  players: CollectedPlayer[],
): Promise<number> => {
  for (const player of players) {
    const statistics = (player.statistics ?? {}) as Record<string, unknown>
    const advancements = (player.advancements ?? []) as unknown[]

    if (Object.keys(statistics).length === 0 || advancements.length === 0) {
      console.warn(`[collect] skip ${player.playerName}: empty statistics/advancements`)
      continue
    }

    const upsert: PlayerUpsert = {
      playerId: player.playerId,
      playerName: player.playerName,
      firstLogin: player.firstLogin,
      lastLogin: player.lastLogin,
      totalPlaytimeSeconds: player.totalPlaytimeSeconds,
      updateTime: Date.now(),
      advancementsJson: JSON.stringify(advancements),
      statisticsJson: JSON.stringify(statistics),
      skinType: player.skinType,
      skinImage: player.skinImage,
      skinCape: player.skinCape,
    }

    await PlayersRepo.upsert(env.DB, upsert)
    await PlayersRepo.recordDailyOnline(env.DB, day, upsert)
  }

  return players.length
}

export const runCollect = async (env: Env): Promise<void> => {
  const day = todayInShanghai()
  const collected: CollectedPlayer[] = []

  // 首选：一次快照接口（Meowo meowo-webapi）
  const snapshot = await PluginClient.fetchSnapshot(env)
  let status: Awaited<ReturnType<typeof PluginClient.fetchServerStatus>> = null

  if (snapshot) {
    status = snapshot.server
    for (const player of snapshot.players) {
      if (!player.uuid || !player.name) continue

      const skinImage = player.skin?.url
        ? ((await PluginClient.downloadAsBase64(player.skin.url)) ??
          (env.BACKUP_SKIN_URL ? await PluginClient.downloadAsBase64(env.BACKUP_SKIN_URL) : null) ??
          '')
        : ''
      const skinCape = player.skin?.capeUrl
        ? ((await PluginClient.downloadAsBase64(player.skin.capeUrl)) ?? '')
        : ''

      collected.push({
        playerId: player.uuid,
        playerName: player.name,
        firstLogin: player.firstLogin ?? 0,
        lastLogin: player.lastLogin ?? 0,
        totalPlaytimeSeconds: player.totalPlaytimeSeconds ?? 0,
        statistics: player.statistics ?? {},
        advancements: player.advancements ?? [],
        skinType: player.skin?.type ?? 'default',
        skinImage,
        skinCape,
      })
    }
  } else {
    // 兼容路径：旧插件逐玩家拉取
    const online = await PluginClient.fetchOnlinePlayers(env)
    for (const player of online) {
      if (!player.uuid || !player.name) continue

      const statistics = await PluginClient.fetchStatistics(env, player.uuid)
      const advancements = await PluginClient.fetchAdvancements(env, player.uuid)
      const skin = await PluginClient.fetchSkin(env, player.uuid)

      collected.push({
        playerId: player.uuid,
        playerName: player.name,
        firstLogin: player.firstLogin ?? 0,
        lastLogin: player.lastLogin ?? 0,
        totalPlaytimeSeconds: player.totalPlaytimeSeconds ?? 0,
        statistics,
        advancements,
        skinType: skin?.type ?? 'default',
        skinImage: skin?.url ? ((await PluginClient.downloadAsBase64(skin.url)) ?? '') : '',
        skinCape: skin?.capeUrl ? ((await PluginClient.downloadAsBase64(skin.capeUrl)) ?? '') : '',
      })
    }
    status = await PluginClient.fetchServerStatus(env)
  }

  const count = await persistCollectedPlayers(env, day, collected)

  if (status) {
    await PlayersRepo.saveServerStatus(env.DB, {
      online_players: status.onlinePlayers ?? 0,
      max_players: status.maxPlayers ?? 0,
      tps: status.tps ?? 20,
      heartbeat_status: status.heartbeatStatus ? 1 : 0,
      update_time: status.updateTime ?? Date.now(),
    })
  }

  // 服务器状态在边缘缓存了 5 分钟，采集后主动失效，避免读到旧值
  if (status) {
    await caches.default.delete(
      new Request('https://wofuf-edge.internal/api/v1/players/server-status'),
    )
  }

  console.log(`[collect] finished, ${count} online players, day=${day}`)
}

export const COLLECT_INTERVAL_MS = COLLECT_COOLDOWN_MS

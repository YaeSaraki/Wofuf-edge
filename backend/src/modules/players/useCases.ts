/**
 * 玩家用例 —— 对应 Kotlin 侧 `useCases/{getPlayer,getPlayerStatistics,getPlayerAdvancements,
 * getPlayerSkin,getPlayerYesterdayOnline,getPlayerRandom,searchPlayers,GetServerStatus}`。
 */
import { Err, Ok, type Result } from '../../core/result'
import { PlayersRepo, type PlayerRow } from '../../infra/db/players.repo'
import { cachedJson } from '../../infra/cache'
import type { Env } from '../../env'
import type { Context } from 'hono'
import { PlayerAdvancement, PlayerStatistic, PlayerSkin, ServerStatus } from './domain'

export type PlayerSummary = {
  id: string
  name: string
  firstLogin: number
  lastLogin: number
  totalPlaytimeSeconds: number
  updateTime: number
}

const parseJsonMap = <T>(raw: string | null): Record<string, T> => {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, T>
    return parsed ?? {}
  } catch {
    return {}
  }
}

const parseJsonList = <T>(raw: string | null): T[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const PlayersUseCases = {
  async getPlayer(env: Env, nameOrUuid: string): Promise<Result<PlayerRow>> {
    const key = nameOrUuid?.trim() ?? ''
    if (!key) return Err('PLAYER_NAME_OR_UUID_EMPTY_ERROR', 'Player name or uuid is empty')

    const player = await PlayersRepo.findByIdOrName(env.DB, key)
    if (!player) return Err('PLAYER_NOT_FOUND_ERROR', `Player ${key} not found`)
    return Ok(player)
  },

  async getStatistics(
    env: Env,
    playerUuid: string,
  ): Promise<Result<{ statistics: Record<string, { category: string; key: string; value: number }> }>> {
    const player = await PlayersRepo.findById(env.DB, playerUuid)
    if (!player) return Err('PLAYER_NOT_FOUND_ERROR', `Player ${playerUuid} not found`)

    const raw = parseJsonMap<PlayerStatistic['props']>(player.statistics_json)
    const statistics: Record<string, { category: string; key: string; value: number }> = {}
    for (const [key, value] of Object.entries(raw)) {
      const statistic = PlayerStatistic.create(value)
      if (statistic.ok) {
        statistics[key] = {
          category: statistic.value.props.category,
          key: statistic.value.props.key,
          value: statistic.value.props.value,
        }
      }
    }
    return Ok({ statistics })
  },

  async getAdvancements(
    env: Env,
    playerUuid: string,
  ): Promise<Result<{ advancements: Array<{ key: string; done: boolean; completed: string[]; remaining: string[] }> }>> {
    const player = await PlayersRepo.findById(env.DB, playerUuid)
    if (!player) return Err('PLAYER_NOT_FOUND_ERROR', `Player ${playerUuid} not found`)

    const raw = parseJsonList<PlayerAdvancement['props']>(player.advancements_json)
    const advancements = raw
      .map((item) => PlayerAdvancement.create(item))
      .filter((item) => item.ok)
      .map((item) => ({
        key: item.value.props.key,
        done: item.value.props.done,
        completed: item.value.props.completed,
        remaining: item.value.props.remaining,
      }))

    return Ok({ advancements })
  },

  async getSkin(
    env: Env,
    playerUuid: string,
  ): Promise<Result<{ type: string; skin: string; cape: string }>> {
    const player = await PlayersRepo.findById(env.DB, playerUuid)
    if (!player) return Err('PLAYER_NOT_FOUND_ERROR', `Player ${playerUuid} not found`)

    const skin = PlayerSkin.create({
      type: player.skin_type ?? 'default',
      skin: player.skin_image ?? '',
      cape: player.skin_cape ?? '',
    })
    if (!skin.ok) return Err(skin.error.code, skin.error.message)

    return Ok({
      type: skin.value.type,
      skin: skin.value.skin,
      cape: skin.value.cape,
    })
  },

  /** 昨日在线：来自 players_daily_online 快照（替代原 24 小时内存缓存） */
  async getYesterdayOnline(env: Env, yesterday: string): Promise<Result<{ playerNames: string[] }>> {
    const names = await PlayersRepo.yesterdayPlayerNames(env.DB, yesterday)
    return Ok({ playerNames: names })
  },

  /**
   * 在线玩家列表。
   *
   * 判定口径与采集器一致：最近一次 Cron 快照里出现过 = 在线。
   * 窗口取 2 个采集周期（5 分钟 × 2），容忍偶发的一次采集失败。
   */
  async getOnlinePlayers(env: Env): Promise<Result<PlayerSummary[]>> {
    const windowMs = 10 * 60 * 1000
    const rows = await PlayersRepo.recentlySeenPlayers(env.DB, Date.now() - windowMs)
    return Ok(
      rows.map((row) => ({
        id: row.player_id,
        name: row.player_name,
        firstLogin: row.first_login,
        lastLogin: row.last_login,
        totalPlaytimeSeconds: row.total_playtime,
        updateTime: row.update_time,
      })),
    )
  },

  async getRandom(env: Env, count: number): Promise<Result<PlayerSummary[]>> {
    const size = Math.min(Math.max(count || 1, 1), 50)
    const players = await PlayersRepo.random(env.DB, size)
    return Ok(players.map((player) => ({
      id: player.player_id,
      name: player.player_name,
      firstLogin: player.first_login,
      lastLogin: player.last_login,
      totalPlaytimeSeconds: player.total_playtime,
      updateTime: player.update_time,
    })))
  },

  async search(
    env: Env,
    query: string,
    limit: number,
  ): Promise<Result<{ players: Array<{ id: string; name: string; lastLogin: number }> }>> {
    const keyword = query?.trim() ?? ''
    if (!keyword) return Err('SEARCH_QUERY_EMPTY_ERROR', 'Search query cannot be empty')

    const size = Math.min(Math.max(limit || 20, 1), 100)
    const players = await PlayersRepo.search(env.DB, keyword, size)
    return Ok({ players })
  },

  /** 服务器状态：5 分钟缓存（替代原 ServerStatusCache 的 Caffeine 5 分钟 TTL） */
  async getServerStatus(c: Context, env: Env): Promise<Result<{
    onlinePlayers: number
    maxPlayers: number
    tps: string
    heartbeatStatus: boolean
    updateTime: number
  }>> {
    const status = await cachedJson(
      c,
      '/api/v1/players/server-status',
      300,
      async () => {
        const row = await PlayersRepo.getServerStatus(env.DB)
        return row ?? {
          online_players: 0,
          max_players: 0,
          tps: 20,
          heartbeat_status: 0,
          update_time: 0,
        }
      },
    )

    const domain = ServerStatus.create({
      onlinePlayers: status.online_players,
      maxPlayers: status.max_players,
      tps: status.tps,
      heartbeatStatus: status.heartbeat_status === 1,
      updateTime: status.update_time,
    })
    if (!domain.ok) return Err(domain.error.code, domain.error.message)

    return Ok({
      onlinePlayers: domain.value.props.onlinePlayers,
      maxPlayers: domain.value.props.maxPlayers,
      tps: domain.value.tpsString,
      heartbeatStatus: domain.value.props.heartbeatStatus,
      updateTime: domain.value.props.updateTime,
    })
  },
}

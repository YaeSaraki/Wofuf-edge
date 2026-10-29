import type {RequestOptions} from '@SU/async/RequestOptions.ts'
import type {Player} from '@M/players/dtos/Player.ts'
import type {PlayerSkin} from '@M/players/dtos/PlayerSkin.ts'
import type {PlayerUuid} from '@M/players/dtos/PlayerUuid.ts'
import type {PlayerNameList} from '@M/players/dtos/PlayerName.ts'
import type {PlayerSearchResponse} from '@M/players/dtos/PlayerSearch.ts'
import type {ServerStatus} from '@M/players/dtos/ServerStatus.ts'
import type {ApiResponse} from '@S/infra/api/v1/models/ApiResponse.ts'
import {Result} from '@S/core/Result.ts'
import {http} from '@S/infra/api/http.ts'
import {cacheService} from '@S/infra/cache'
import {renderAvatar as renderAvatarUtil} from '@S/utils/renderUTil.ts'


export interface IPlayerService {
  /* ---------------- 随机玩家 ---------------- */
  getRandomPlayerProfile(
    params?: { limit?: number },
    options?: RequestOptions,
  ): Promise<Result<PlayerNameList>>

  /* ---------------- 获取玩家信息 ---------------- */
  getPlayerProfile(playerNameOrUuid: string, options?: RequestOptions): Promise<Result<Player>>

  /* ---------------- 昨日在线玩家 ---------------- */
  getPlayerYesterdayOnline(options?: RequestOptions): Promise<Result<PlayerNameList>>

  /* ---------------- 获取玩家皮肤 ---------------- */
  getPlayerSkin(playerUuid: PlayerUuid, options?: RequestOptions): Promise<Result<PlayerSkin>>

  /* ---------------- 搜索玩家 ---------------- */
  searchPlayers(query: string, limit?: number, options?: RequestOptions): Promise<Result<PlayerSearchResponse>>

  /* ---------------- 获取服务器状态 ---------------- */
  getServerStatus(forceRefresh?: boolean, options?: RequestOptions): Promise<Result<ServerStatus>>
}

export class PlayerService implements IPlayerService {
  private static readonly CACHE_MODULE = 'player_service'

  /* ---------------- 随机玩家 ---------------- */
  public async getRandomPlayerProfile(
    params?: { limit?: number },
    options?: RequestOptions,
  ): Promise<Result<PlayerNameList>> {
    const limit = params?.limit || 10
    const cacheKey = `random_limit_${limit}`

    return cacheService.withCacheAndDeduplication<Result<PlayerNameList>>(
      PlayerService.CACHE_MODULE,
      cacheKey,
      async () => {
        try {
          const response = await http.get<ApiResponse<PlayerNameList>>('/api/v1/players/random-profile', {
            signal: options?.signal,
            params,
          })

          if (response.data.success) {
            return Result.success<PlayerNameList>(response.data.data)
          }
          return Result.failure<PlayerNameList>(response.data.message)
        } catch (error) {
          return Result.failure<PlayerNameList>(
            error instanceof Error ? error.message : '获取随机玩家资料失败'
          )
        }
      }
    )
  }

  /* ---------------- 获取玩家信息 ---------------- */
  public async getPlayerProfile(
    playerNameOrUuid: string,
    options?: RequestOptions,
  ): Promise<Result<Player>> {
    const cacheKey = `profile_${playerNameOrUuid}`

    return cacheService.withCacheAndDeduplication<Result<Player>>(
      PlayerService.CACHE_MODULE,
      cacheKey,
      async () => {
        try {
          const response = await http.get<ApiResponse<Player>>(
            `/api/v1/players/playerNameOrUuid/${playerNameOrUuid}`,
            {
              signal: options?.signal,
            },
          )

          if (response.data.success) {
            return Result.success<Player>(response.data.data)
          }
          return Result.failure<Player>(response.data.message)
        } catch (error) {
          return Result.failure<Player>(
            error instanceof Error ? error.message : '获取玩家资料失败'
          )
        }
      }
    )
  }

  /* ---------------- 昨日在线玩家 ---------------- */
  public async getPlayerYesterdayOnline(options?: RequestOptions): Promise<Result<PlayerNameList>> {
    const cacheKey = 'yesterday'

    return cacheService.withCacheAndDeduplication<Result<PlayerNameList>>(
      PlayerService.CACHE_MODULE,
      cacheKey,
      async () => {
        try {
          const response = await http.get<ApiResponse<PlayerNameList>>('/api/v1/players/yesterday', {
            signal: options?.signal,
          })

          if (response.data.success) {
            return Result.success<PlayerNameList>(response.data.data)
          }
          return Result.failure<PlayerNameList>(response.data.message)
        } catch (error) {
          return Result.failure<PlayerNameList>(
            error instanceof Error ? error.message : '获取昨日在线玩家失败'
          )
        }
      }
    )
  }

  /* ---------------- 获取玩家皮肤 ---------------- */
  public async getPlayerSkin(
    playerUuid: PlayerUuid,
    options?: RequestOptions,
  ): Promise<Result<PlayerSkin>> {
    const cacheKey = `skin_${playerUuid}`

    return cacheService.withCacheAndDeduplication<Result<PlayerSkin>>(
      PlayerService.CACHE_MODULE,
      cacheKey,
      async () => {
        try {
          const response = await http.get<ApiResponse<PlayerSkin>>(
            `/api/v1/players/skins/${playerUuid}`,
            {
              signal: options?.signal,
            },
          )

          if (response.data.success) {
            return Result.success<PlayerSkin>(response.data.data)
          }
          return Result.failure<PlayerSkin>(response.data.message)
        } catch (error) {
          return Result.failure<PlayerSkin>(
            error instanceof Error ? error.message : '获取玩家皮肤失败'
          )
        }
      }
    )
  }

  /* ---------------- 搜索玩家 ---------------- */
  public async searchPlayers(
    query: string,
    limit: number = 20,
    options?: RequestOptions,
  ): Promise<Result<PlayerSearchResponse>> {
    // 不缓存搜索结果，每次都是实时搜索
    try {
      const response = await http.get<ApiResponse<PlayerSearchResponse>>('/api/v1/players/search', {
        signal: options?.signal,
        params: { query, limit },
      })

      if (response.data.success) {
        return Result.success<PlayerSearchResponse>(response.data.data)
      }
      return Result.failure<PlayerSearchResponse>(response.data.message)
    } catch (error) {
      return Result.failure<PlayerSearchResponse>(
        error instanceof Error ? error.message : '搜索玩家失败'
      )
    }
  }

  /* ---------------- 获取服务器状态 ---------------- */
  public async getServerStatus(
    forceRefresh: boolean = false,
    options?: RequestOptions,
  ): Promise<Result<ServerStatus>> {
    const cacheKey = `server_status_${forceRefresh}`

    return cacheService.withCacheAndDeduplication<Result<ServerStatus>>(
      PlayerService.CACHE_MODULE,
      cacheKey,
      async () => {
        try {
          const response = await http.get<ApiResponse<ServerStatus>>(
            `/api/v1/players/server-status?forceRefresh=${forceRefresh}`,
            {
              signal: options?.signal,
            }
          )

          if (response.data.success) {
            return Result.success<ServerStatus>(response.data.data)
          }
          return Result.failure<ServerStatus>(response.data.message)
        } catch (error) {
          return Result.failure<ServerStatus>(
            error instanceof Error ? error.message : '获取服务器状态失败'
          )
        }
      }
    )
  }

  public async renderAvatar(skinBase64: string, size: number): Promise<string> {
    const cacheKey = `avatar_${skinBase64.substring(0, 32)}_${size}`

    return cacheService.withCacheAndDeduplication<string>(
      PlayerService.CACHE_MODULE,
      cacheKey,
      async () => {
        return renderAvatarUtil(skinBase64, size)
      }
    )
  }
}

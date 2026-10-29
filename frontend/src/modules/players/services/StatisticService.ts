import type {RequestOptions} from '@SU/async/RequestOptions.ts'
import type {PlayerUuid} from '@M/players/dtos/PlayerUuid.ts'
import type {ApiResponse} from '@S/infra/api/v1/models/ApiResponse.ts'
import type {StatisticGroup} from '@M/players/dtos/StatisticGroup.ts'
import type {PlayerStatisticList} from '@M/players/dtos/PlayerStatistic.ts'
import {statisticGroups} from '@M/players/config/statisticGroups.ts'
import {Result} from '@S/core'
import {http} from '@S/infra/api/http.ts'

export interface IStatisticService {
  /* ---------------- 分组统计 ---------------- */
  calculateGroupTotals: (statistics: Record<string, { value: number }>) => StatisticGroup[]

  /* ---------------- 获得玩家统计 ---------------- */
  getPlayerStatistics(
    playerName: string,
    options?: RequestOptions & {
      category?: string
      categories?: string[]
      key?: string
      keys?: string[]
    },
  ): Promise<Result<PlayerStatisticList>>
}

export class StatisticService implements StatisticService {
  private _cachedStatisticsMap = new Map<PlayerUuid, PlayerStatisticList>()

  /* ---------------- 玩家统计 ---------------- */
  public async getPlayerStatistics(
    playerUuid: string,
    options?: RequestOptions & {
      category?: string
      categories?: string[]
      key?: string
      keys?: string[]
    },
  ): Promise<Result<PlayerStatisticList>> {
    if (this._cachedStatisticsMap.has(playerUuid)) {
      return Result.success<PlayerStatisticList>(this._cachedStatisticsMap.get(playerUuid)!)
    }
    const response = await http.get<ApiResponse<PlayerStatisticList>>(
      `/api/v1/players/statistics/${playerUuid}`,
      {
        signal: options?.signal,
        params: options,
      },
    )
    if (response.data.success) {
      this._cachedStatisticsMap.set(playerUuid, response.data.data)
      return Result.success<PlayerStatisticList>(response.data.data)
    }
    return Result.failure<PlayerStatisticList>(response.data.message)
  }

  // 计算分组统计的总数
  calculateGroupTotals = (statistics: Record<string, { value: number }>) => {
    return statisticGroups.map((group) => {
      const total = group.statistics.reduce((sum, statKey) => {
        if (statistics[statKey]) {
          sum += statistics[statKey].value
        }
        return sum
      }, 0)
      return {
        ...group,
        total,
      }
    })
  }
}

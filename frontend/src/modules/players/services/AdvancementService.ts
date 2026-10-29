import {imageImportService} from '@S/services/ImageImporter'
import type {PlayerUuid} from '@M/players/dtos/PlayerUuid.ts'
import {challenge, goal} from '@M/players/config/AdvancementSpecial.ts'
import {advancementsGroups} from '@M/players/config/AdvancementGroups.ts'
import type {PlayerAdvancement, PlayerAdvancementList} from '@M/players/dtos/PlayerAdvancement.ts'

import type {ApiResponse} from '@S/infra/api/v1/models/ApiResponse.ts'
import {cacheService} from '@S/infra/cache'
import {translate} from '@S/services/i18n'
import {http} from '@S/infra/api/http.ts'
import {Result} from '@S/core/Result.ts'

import type {RequestOptions} from '@SU/async/RequestOptions.ts'

export interface AdvancementGroupTotal {
  total: number
  completed: number
  percentage: number
}

export interface ParsedAdvancementKey {
  category: string
  name: string
}

export interface IAdvancementService {
  getTotalAdvancementCount: () => number
  isRecipeAdvancement: (advancement: PlayerAdvancement) => boolean
  filterNonRecipeAdvancements: (advancements: PlayerAdvancement[]) => PlayerAdvancement[]
  filterNonGroupedAdvancements: (advancements: PlayerAdvancement[]) => PlayerAdvancement[]
  calculateAdvancementGroupTotals: (advancements: PlayerAdvancement[]) => AdvancementGroupTotal[]
  getAdvancementsByGroup: (
    advancements: PlayerAdvancement[],
    groupId: string,
  ) => PlayerAdvancement[]
  getUngroupedAdvancements: (advancements: PlayerAdvancement[]) => PlayerAdvancement[]
  parseAdvancementKey: (key: string) => ParsedAdvancementKey

  getPlayerAdvancements: (
    playerUuid: PlayerUuid,
    options?: RequestOptions,
  ) => Promise<Result<PlayerAdvancementList>>

  getAdvancementImagePath: (advancement: PlayerAdvancement) => string
  getAdvancementFramePath: (advancement: PlayerAdvancement) => string
  getDefaultAdvancementImage: () => string

  translateAdvancement: (advancement: PlayerAdvancement) => string
}

export class AdvancementService implements IAdvancementService {
  private static readonly CACHE_MODULE = 'advancement_service'
  private static readonly DEFAULT_EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg', 'gif'] as const
  private static readonly BASE_ADVANCEMENT_PATH = '/src/modules/players/assets/image/advancement/'
  private static readonly BASE_BG_PATH = 'modules/players/assets/image/advancement/bg/'
  private readonly ALL_GROUPED_ADVANCEMENT_KEYS: Set<string>
  private readonly _advancementImages: Record<string, string>

  constructor() {
    this.ALL_GROUPED_ADVANCEMENT_KEYS = new Set(
      advancementsGroups.flatMap((group) => group.advancements),
    )

    this._advancementImages = import.meta.glob(
      [
        '/src/modules/players/assets/image/advancement/**/*.png',
        '/src/modules/players/assets/image/advancement/**/*.webp',
        '/src/modules/players/assets/image/advancement/**/*.jpg',
        '/src/modules/players/assets/image/advancement/**/*.jpeg',
        '/src/modules/players/assets/image/advancement/**/*.gif',
      ],
      {
        eager: true,
        query: '?url',
        import: 'default',
      },
    )
  }

  // ==================== 玩家成就相关 ====================

  public async getPlayerAdvancements(
    playerUuid: PlayerUuid,
    options?: RequestOptions,
  ): Promise<Result<PlayerAdvancementList>> {
    // 尝试从CacheService获取
    const cacheKey = `advancements_${playerUuid}`
    const cached = cacheService.get<PlayerAdvancementList>(
      AdvancementService.CACHE_MODULE,
      cacheKey,
    )

    if (cached) {
      return Result.success<PlayerAdvancementList>(cached)
    }

    try {
      const response = await http.get<ApiResponse<PlayerAdvancementList>>(
        `/api/v1/players/advancements/${playerUuid}`,
        {
          signal: options?.signal,
        },
      )

      if (response.data.success) {
        // 保存到CacheService
        cacheService.set(AdvancementService.CACHE_MODULE, cacheKey, response.data.data)
        return Result.success<PlayerAdvancementList>(response.data.data)
      }

      return Result.failure<PlayerAdvancementList>(response.data.message)
    } catch (error) {
      return Result.failure<PlayerAdvancementList>(
        error instanceof Error ? error.message : '获取成就数据失败',
      )
    }
  }

  // ==================== 成就统计与过滤 ====================

  public getTotalAdvancementCount(): number {
    return this.ALL_GROUPED_ADVANCEMENT_KEYS.size
  }

  public isRecipeAdvancement(advancement: PlayerAdvancement): boolean {
    return advancement?.key?.startsWith('recipes/') ?? false
  }

  public filterNonRecipeAdvancements(advancements: PlayerAdvancement[]): PlayerAdvancement[] {
    return Array.isArray(advancements)
      ? advancements.filter((adv) => !this.isRecipeAdvancement(adv))
      : []
  }

  public filterNonGroupedAdvancements(advancements: PlayerAdvancement[]): PlayerAdvancement[] {
    return Array.isArray(advancements)
      ? advancements.filter((adv) => this.ALL_GROUPED_ADVANCEMENT_KEYS.has(adv.key))
      : []
  }

  public calculateAdvancementGroupTotals = (advancements: PlayerAdvancement[]) => {
    const nonRecipeAdvancements = this.filterNonRecipeAdvancements(advancements)

    return advancementsGroups.map((group) => {
      const {advancements: groupAdvKeys} = group
      const total = groupAdvKeys.length

      const completedAdvKeys = new Set(
        nonRecipeAdvancements.filter((adv) => adv.done).map((adv) => adv.key),
      )

      const completed = groupAdvKeys.filter((key) => completedAdvKeys.has(key)).length
      return {
        ...group,
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      }
    })
  }

  public getAdvancementsByGroup(
    advancements: PlayerAdvancement[],
    groupId: string,
  ): PlayerAdvancement[] {
    if (!Array.isArray(advancements) || !groupId) return []

    const group = advancementsGroups.find((g) => g.category === groupId)
    if (!group) return []

    const nonRecipeAdvancements = this.filterNonRecipeAdvancements(advancements)
    return nonRecipeAdvancements.filter((adv) => group.advancements.includes(adv.key))
  }

  public getUngroupedAdvancements(advancements: PlayerAdvancement[]): PlayerAdvancement[] {
    if (!Array.isArray(advancements)) return []

    const nonRecipeAdvancements = this.filterNonRecipeAdvancements(advancements)
    return nonRecipeAdvancements.filter((adv) => !this.ALL_GROUPED_ADVANCEMENT_KEYS.has(adv.key))
  }

  public parseAdvancementKey(key: string): ParsedAdvancementKey {
    const parts = key.split('/')

    if (parts.length >= 2) {
      return {
        category: parts[0] || 'other',
        name: parts.slice(1).join('_'),
      }
    }

    return {category: 'other', name: key}
  }

  // ==================== 图片处理 ====================

  public getDefaultAdvancementImage(): string {
    return (
      imageImportService.getImageUrl(`${AdvancementService.BASE_BG_PATH}Advancement-normal.webp`) ||
      ''
    )
  }

  public getAdvancementImagePath(advancement: PlayerAdvancement): string {
    const {category, name} = this.parseAdvancementKey(advancement.key)
    const baseName = `${AdvancementService.BASE_ADVANCEMENT_PATH}${category}/${name}`

    for (const ext of AdvancementService.DEFAULT_EXTENSIONS) {
      const fullPath = `${baseName}.${ext}`
      const found = this._advancementImages[fullPath]

      if (found) {
        return found
      }
    }

    return this.getDefaultAdvancementImage()
  }

  public getAdvancementFramePath(advancement: PlayerAdvancement): string {
    const {key, done} = advancement
    let imageName: string

    if (challenge.includes(key)) {
      imageName = done ? 'Advancement-challenge-completed.png' : 'Advancement-challenge.webp'
    } else if (goal.includes(key)) {
      imageName = done ? 'Advancement-goal-completed.png' : 'Advancement-goal.webp'
    } else {
      imageName = done ? 'Advancement-normal-completed.webp' : 'Advancement-normal.webp'
    }

    const imagePath = `${AdvancementService.BASE_BG_PATH}${imageName}`
    return imageImportService.getImageUrl(imagePath) || this.getDefaultAdvancementImage()
  }

  // ==================== 翻译成就子项目 ====================
  public translateAdvancement = (advancement: PlayerAdvancement) => {
    const {category, name} =
      advancement.key.split('/').length >= 2
        ? {
          category: advancement.key.split('/')[0],
          name: advancement.key.split('/').slice(1).join('_'),
        }
        : {category: '', name: advancement.key}

    return translate('players', `advancements.${category ? category + '.' : ''}${name}`)
  }
}

/**
 * 玩家搜索结果 DTO
 */

export interface PlayerSearchResult {
  id: string
  name: string
  lastLogin: number
}

export interface PlayerSearchResponse {
  players: PlayerSearchResult[]
}

export interface PlayerStatistic {
  category: string
  key: string
  value: number
}

export interface PlayerStatisticList {
  statistics: Record<string, PlayerStatistic>
}

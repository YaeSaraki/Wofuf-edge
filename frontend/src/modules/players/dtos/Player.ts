import type {PlayerName} from '@M/players/dtos/PlayerName.ts'
import type {PlayerUuid} from '@M/players/dtos/PlayerUuid.ts'

export interface Player {
  id: PlayerUuid
  name: PlayerName
  firstLogin: number
  lastLogin: number
  totalPlaytimeSeconds: number
  updateTime: number
}

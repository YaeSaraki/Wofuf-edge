/**
 * 玩家域 —— 对应 Kotlin 侧 `modules.players.domain`（Player + PlayerSkin/PlayerStatistic/PlayerAdvancement/ServerStatus）。
 */
import { Err, Ok, type Result } from '../../core/result'

export const PlayerName = {
  create(value: string): Result<string> {
    const trimmed = value?.trim() ?? ''
    if (trimmed.length === 0) return Err('PLAYER_NAME_EMPTY_ERROR', 'Player name cannot be null or blank')
    if (trimmed.length > 16) return Err('PLAYER_NAME_INVALID_ERROR', 'Player name exceeds 16 characters')
    return Ok(trimmed)
  },
}

export type PlayerSkinProps = { type: string; skin: string; cape: string }

export class PlayerSkin {
  readonly props: PlayerSkinProps

  private constructor(props: PlayerSkinProps) {
    this.props = props
  }

  get type(): string {
    return this.props.type
  }

  get skin(): string {
    return this.props.skin
  }

  get cape(): string {
    return this.props.cape
  }

  static create(props: PlayerSkinProps): Result<PlayerSkin> {
    return Ok(new PlayerSkin({
      type: props.type ?? 'default',
      skin: props.skin ?? '',
      cape: props.cape ?? '',
    }))
  }

  static get defaultProps(): PlayerSkin {
    return new PlayerSkin({ type: 'default', skin: '', cape: '' })
  }
}

export type PlayerStatisticProps = { key: string; category: string; value: number }

export class PlayerStatistic {
  readonly props: PlayerStatisticProps

  private constructor(props: PlayerStatisticProps) {
    this.props = props
  }

  static create(props: PlayerStatisticProps): Result<PlayerStatistic> {
    if (!props.key) return Err('PLAYER_STATISTIC_KEY_EMPTY_ERROR', 'Statistic key cannot be blank')
    return Ok(new PlayerStatistic(props))
  }
}

export type PlayerAdvancementProps = {
  key: string
  done: boolean
  completed: string[]
  remaining: string[]
}

export class PlayerAdvancement {
  readonly props: PlayerAdvancementProps

  private constructor(props: PlayerAdvancementProps) {
    this.props = props
  }

  static create(props: PlayerAdvancementProps): Result<PlayerAdvancement> {
    if (!props.key) return Err('PLAYER_ADVANCEMENT_KEY_EMPTY_ERROR', 'Advancement key cannot be blank')
    return Ok(new PlayerAdvancement({
      ...props,
      completed: props.completed ?? [],
      remaining: props.remaining ?? [],
    }))
  }
}

export type PlayerProps = {
  playerId: string
  playerName: string
  firstLogin: number
  lastLogin: number
  totalPlaytimeSeconds: number
  updateTime: number
  statistics: Record<string, PlayerStatistic>
  advancements: Record<string, PlayerAdvancement>
  playerSkin: PlayerSkin
}

export class Player {
  readonly props: PlayerProps

  private constructor(props: PlayerProps) {
    this.props = props
  }

  get playerId(): string {
    return this.props.playerId
  }

  get playerName(): string {
    return this.props.playerName
  }

  get firstLogin(): number {
    return this.props.firstLogin
  }

  get lastLogin(): number {
    return this.props.lastLogin
  }

  get totalPlaytimeSeconds(): number {
    return this.props.totalPlaytimeSeconds
  }

  get updateTime(): number {
    return this.props.updateTime
  }

  get playerSkin(): PlayerSkin {
    return this.props.playerSkin
  }

  static create(props: PlayerProps): Result<Player> {
    const name = PlayerName.create(props.playerName)
    if (!name.ok) return Err<Player>(name.error.code, name.error.message)
    return Ok(new Player({ ...props, playerName: name.value }))
  }
}

export type ServerStatusProps = {
  onlinePlayers: number
  maxPlayers: number
  tps: number
  heartbeatStatus: boolean
  updateTime: number
}

export class ServerStatus {
  readonly props: ServerStatusProps

  private constructor(props: ServerStatusProps) {
    this.props = props
  }

  static create(props: ServerStatusProps): Result<ServerStatus> {
    if (props.onlinePlayers < 0 || props.maxPlayers < 0) {
      return Err('SERVER_STATUS_INVALID_ERROR', 'Player counts cannot be negative')
    }
    if (props.tps < 0) return Err('SERVER_STATUS_TPS_INVALID_ERROR', 'TPS cannot be negative')
    return Ok(new ServerStatus(props))
  }

  get tpsString(): string {
    return this.props.tps.toFixed(2)
  }
}

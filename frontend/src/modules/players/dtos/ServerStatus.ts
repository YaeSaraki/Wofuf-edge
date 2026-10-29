/**
 * Server status DTO representing Minecraft server status
 */
export interface ServerStatus {
  onlinePlayers: number
  maxPlayers: number
  tps: string
  heartbeatStatus: boolean
  updateTime: number
}

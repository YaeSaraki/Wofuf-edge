/**
 * 玩家仓储 —— 替代 `PlayerRepo` / `PlayerJpaRepo`（JPA/MySQL）。
 *
 * 注意 SQL 方言差异：
 * - MySQL `ORDER BY RAND() LIMIT n` -> SQLite `ORDER BY RANDOM() LIMIT n`
 * - `LONGTEXT` -> `TEXT`
 * - `LocalDateTime` -> epoch millis `INTEGER`
 */
export type PlayerRow = {
  player_id: string
  player_name: string
  first_login: number
  last_login: number
  total_playtime: number
  update_time: number
  advancements_json: string | null
  statistics_json: string | null
  skin_type: string | null
  skin_image: string | null
  skin_cape: string | null
  created_at: number
  updated_at: number
}

export type PlayerSummaryRow = {
  id: string
  name: string
  lastLogin: number
}

export type ServerStatusRow = {
  online_players: number
  max_players: number
  tps: number
  heartbeat_status: number
  update_time: number
}

export type PlayerUpsert = {
  playerId: string
  playerName: string
  firstLogin: number
  lastLogin: number
  totalPlaytimeSeconds: number
  updateTime: number
  advancementsJson: string | null
  statisticsJson: string | null
  skinType: string | null
  skinImage: string | null
  skinCape: string | null
}

export const PlayersRepo = {
  async findByIdOrName(db: D1Database, nameOrUuid: string): Promise<PlayerRow | null> {
    return db
      .prepare('SELECT * FROM players WHERE player_id = ? OR player_name = ? LIMIT 1')
      .bind(nameOrUuid, nameOrUuid)
      .first<PlayerRow>()
  },

  async findById(db: D1Database, playerId: string): Promise<PlayerRow | null> {
    return db.prepare('SELECT * FROM players WHERE player_id = ?').bind(playerId).first<PlayerRow>()
  },

  async search(db: D1Database, query: string, limit: number): Promise<PlayerSummaryRow[]> {
    const { results } = await db
      .prepare(
        `SELECT player_id AS id, player_name AS name, last_login AS lastLogin
         FROM players
         WHERE player_name LIKE ? ESCAPE '\\'
         ORDER BY last_login DESC
         LIMIT ?`,
      )
      .bind(`%${escapeLike(query)}%`, limit)
      .all<PlayerSummaryRow>()
    return results
  },

  async random(db: D1Database, count: number): Promise<PlayerRow[]> {
    const { results } = await db
      .prepare('SELECT * FROM players ORDER BY RANDOM() LIMIT ?')
      .bind(count)
      .all<PlayerRow>()
    return results
  },

  async upsert(db: D1Database, data: PlayerUpsert): Promise<void> {
    const now = Date.now()
    await db
      .prepare(
        `INSERT INTO players (player_id, player_name, first_login, last_login, total_playtime,
                              update_time, advancements_json, statistics_json,
                              skin_type, skin_image, skin_cape, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(player_id) DO UPDATE SET
           player_name       = excluded.player_name,
           first_login       = excluded.first_login,
           last_login        = excluded.last_login,
           total_playtime    = excluded.total_playtime,
           update_time       = excluded.update_time,
           advancements_json = excluded.advancements_json,
           statistics_json   = excluded.statistics_json,
           skin_type         = excluded.skin_type,
           skin_image        = excluded.skin_image,
           skin_cape         = excluded.skin_cape,
           updated_at        = excluded.updated_at`,
      )
      .bind(
        data.playerId,
        data.playerName,
        data.firstLogin,
        data.lastLogin,
        data.totalPlaytimeSeconds,
        data.updateTime,
        data.advancementsJson,
        data.statisticsJson,
        data.skinType,
        data.skinImage,
        data.skinCape,
        now,
        now,
      )
      .run()
  },

  async recordDailyOnline(db: D1Database, day: string, player: PlayerUpsert): Promise<void> {
    await db
      .prepare(
        `INSERT INTO players_daily_online
           (day, player_id, player_name, first_login, last_login, total_playtime, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(day, player_id) DO UPDATE SET
           last_login     = excluded.last_login,
           total_playtime = excluded.total_playtime,
           updated_at     = excluded.updated_at`,
      )
      .bind(
        day,
        player.playerId,
        player.playerName,
        player.firstLogin,
        player.lastLogin,
        player.totalPlaytimeSeconds,
        Date.now(),
      )
      .run()
  },

  async yesterdayPlayerNames(db: D1Database, day: string): Promise<string[]> {
    const { results } = await db
      .prepare('SELECT player_name FROM players_daily_online WHERE day = ? ORDER BY last_login DESC')
      .bind(day)
      .all<{ player_name: string }>()
    return results.map((row) => row.player_name)
  },

  async saveServerStatus(db: D1Database, status: ServerStatusRow): Promise<void> {
    await db
      .prepare(
        `INSERT INTO server_status (id, online_players, max_players, tps, heartbeat_status, update_time)
         VALUES (1, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           online_players   = excluded.online_players,
           max_players      = excluded.max_players,
           tps              = excluded.tps,
           heartbeat_status = excluded.heartbeat_status,
           update_time      = excluded.update_time`,
      )
      .bind(
        status.online_players,
        status.max_players,
        status.tps,
        status.heartbeat_status,
        status.update_time,
      )
      .run()
  },

  async getServerStatus(db: D1Database): Promise<ServerStatusRow | null> {
    return db.prepare('SELECT * FROM server_status WHERE id = 1').first<ServerStatusRow>()
  },
}

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (m) => `\\${m}`)

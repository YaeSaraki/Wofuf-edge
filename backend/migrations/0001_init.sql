-- =====================================================================
-- Wofuf Edge · D1 (SQLite) Schema
-- 替代原 MySQL + JPA（ddl-auto: update）
--
-- 范围：无状态只读服务。只保留「服务器数据映射」所需的表：
--   players              玩家档案（统计/成就/皮肤）
--   players_daily_online 每日在线快照（昨日在线列表）
--   server_status        服务器状态（在线人数 / TPS / 心跳）
--
-- 已裁剪：users / auth_sessions / auth_refresh_tokens / auth_token_versions
--         （项目不再有登录、会话与用户态）
-- =====================================================================

-- ---------------------------- 玩家 ----------------------------
CREATE TABLE IF NOT EXISTS players (
    player_id         TEXT PRIMARY KEY,
    player_name       TEXT NOT NULL UNIQUE,
    first_login       INTEGER NOT NULL DEFAULT 0,
    last_login        INTEGER NOT NULL DEFAULT 0,
    total_playtime    INTEGER NOT NULL DEFAULT 0,
    update_time       INTEGER NOT NULL DEFAULT 0,
    advancements_json TEXT,
    statistics_json   TEXT,
    skin_type         TEXT,
    skin_image        TEXT,
    skin_cape         TEXT,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_players_name     ON players(player_name);
CREATE INDEX IF NOT EXISTS idx_players_lastlogin ON players(last_login DESC);

-- 每日在线快照（跨副本 / 跨重启共享，替代原 YesterdayOnlineCache 内存缓存）
CREATE TABLE IF NOT EXISTS players_daily_online (
    day               TEXT NOT NULL,   -- YYYY-MM-DD (UTC+8)
    player_id         TEXT NOT NULL,
    player_name       TEXT NOT NULL,
    first_login       INTEGER NOT NULL DEFAULT 0,
    last_login        INTEGER NOT NULL DEFAULT 0,
    total_playtime    INTEGER NOT NULL DEFAULT 0,
    updated_at        INTEGER NOT NULL,
    PRIMARY KEY (day, player_id)
);
CREATE INDEX IF NOT EXISTS idx_daily_online_day ON players_daily_online(day);

-- -------------------------- 服务器状态 --------------------------
CREATE TABLE IF NOT EXISTS server_status (
    id               INTEGER PRIMARY KEY CHECK (id = 1),
    online_players   INTEGER NOT NULL DEFAULT 0,
    max_players      INTEGER NOT NULL DEFAULT 0,
    tps              REAL    NOT NULL DEFAULT 20.0,
    heartbeat_status INTEGER NOT NULL DEFAULT 0,
    update_time      INTEGER NOT NULL DEFAULT 0
);

-- =====================================================================
-- 裁剪有状态能力：移除用户与会话相关表。
-- （若从零初始化，0001 已不含这些表，此迁移为幂等空操作）
-- =====================================================================
DROP TABLE IF EXISTS auth_refresh_tokens;
DROP TABLE IF EXISTS auth_sessions;
DROP TABLE IF EXISTS auth_token_versions;
DROP TABLE IF EXISTS users;

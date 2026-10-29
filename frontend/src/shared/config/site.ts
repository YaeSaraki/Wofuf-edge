/**
 * 站点个性化配置。
 *
 * 全部来自构建期注入的环境变量（`VITE_SERVER_*`），由 `config.env` 统一管理——
 * 换名字、换版本、换文案不用改源码。
 *
 * 每个值都有默认值：没配置时也能正常构建运行。
 */
const env = import.meta.env

export const siteConfig = {
  /** 站点名（页面标题、导航栏 Logo、页脚） */
  name: (env.VITE_SERVER_NAME as string | undefined) ?? 'MCS',
  /** 副标题 */
  tagline: (env.VITE_SERVER_TAGLINE as string | undefined) ?? 'Minecraft Server',
  /** 服务器核心 */
  core: (env.VITE_SERVER_CORE as string | undefined) ?? 'Paper',
  /** 服务器版本 */
  version: (env.VITE_SERVER_VERSION as string | undefined) ?? '26.3',
  /** 成立年份 */
  founded: (env.VITE_SERVER_FOUNDED as string | undefined) ?? '2024',
  /** 服务器介绍（留空则用 i18n 里的默认文案） */
  intro: (env.VITE_SERVER_INTRO as string | undefined) ?? '',
  /** API 地址（留空 = 与前端同源） */
  apiBaseUrl: (env.VITE_API_BASE_URL as string | undefined) ?? '',
}

export type SiteConfig = typeof siteConfig

// 块翻译
import {registerTranslations} from '@S/services/i18n'
import {
  advancementsItemTranslation,
} from '@M/players/config/translation/advancementsTranslation.ts'
import {statisticsTranslation} from '@M/players/config/translation/statisticsTranslation.ts'
import {advancementsTranslation} from '@M/players/config/translation/advancementsItemTranslation.ts'

const index = {
  // 服务器统计
  world_time: {
    zh: '世界历时',
    en: 'World Time',
  },
  players_online: {
    zh: '在线玩家',
    en: 'Players Online',
  },
  // 昨日登录玩家
  yesterday_online_players: {
    zh: '昨日登录玩家',
    en: 'Yesterday Online Players',
  },
  'loading-yesterday-online': {
    zh: '加载昨日登录玩家中喵…',
    en: 'Loading yesterday online players...',
  },
  'error.loading-advancements': {
    zh: '加载成就中喵…',
    en: 'Loading advancements...',
  },
  // 头像 alt 文本
  'alt.avatar': {
    zh: '的头像',
    en: 'Avatar',
  },
  // 玩家信息
  'player.playtime': {
    zh: '游玩时间',
    en: 'Play Time',
  },
  'player.last-login': {
    zh: '上次登录',
    en: 'Last Login',
  },
  'player.register-time': {
    zh: '注册时间',
    en: 'Register Time',
  },

  // 错误信息
  'error.loading-stats': {
    zh: '加载统计数据失败',
    en: 'Failed to load statistics',
  },
  'error.loading-profile': {
    zh: '加载玩家资料失败',
    en: 'Failed to load player profile',
  },
  'yesterday-online-empty': {
    zh: '昨日没有玩家在线',
    en: 'No players were online yesterday',
  },
  'error.loading-yesterday-online': {
    zh: '加载昨日在线列表失败',
    en: 'Failed to load yesterday online list',
  },

  // 接口级兜底文案：请求本身失败（网络异常之类）时用
  // 后端给了错误码的话，优先用全局映射（app 命名空间的 error.*）
  'error.player-random': {
    zh: '获取随机玩家资料失败',
    en: 'Failed to load a random player profile',
  },
  'error.player-profile': {
    zh: '获取玩家资料失败',
    en: 'Failed to load player profile',
  },
  'error.player-yesterday': {
    zh: '获取昨日在线玩家失败',
    en: 'Failed to load yesterday online players',
  },
  'error.player-skin': {
    zh: '获取玩家皮肤失败',
    en: 'Failed to load player skin',
  },
  'error.player-search': {
    zh: '搜索玩家失败',
    en: 'Failed to search players',
  },
  'error.server-status': {
    zh: '获取服务器状态失败',
    en: 'Failed to load server status',
  },
  'error.advancements': {
    zh: '获取成就数据失败',
    en: 'Failed to load advancements',
  },

  // 玩家搜索
  'search.placeholder': {
    zh: '搜索玩家名称',
    en: 'Search player name',
  },
  'search.result-count': {
    zh: '找到 {count} 位玩家',
    en: 'Found {count} players',
  },
  'search.no-match': {
    zh: '未找到匹配 "{query}" 的玩家',
    en: 'No players found matching "{query}"',
  },
  'search.failed': {
    zh: '搜索失败',
    en: 'Search failed',
  },

  // 相对时间
  'time.today': {zh: '今天', en: 'today'},
  'time.yesterday': {zh: '昨天', en: 'yesterday'},
  'time.days-ago': {zh: '{count} 天前', en: '{count} days ago'},
  'time.weeks-ago': {zh: '{count} 周前', en: '{count} weeks ago'},

  // 无障碍文本
  'alt.player-avatar': {
    zh: '{name} 的头像',
    en: "{name}'s avatar",
  },
}

// 注册块翻译
registerTranslations('players', index)
registerTranslations('players', advancementsTranslation)
registerTranslations('players', advancementsItemTranslation)
registerTranslations('players', statisticsTranslation)

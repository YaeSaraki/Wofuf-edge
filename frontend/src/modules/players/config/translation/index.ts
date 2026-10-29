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
  'error.loading-yesterday-online': {
    zh: '加载昨日在线列表失败',
    en: 'Failed to load yesterday online list',
  },
}

// 注册块翻译
registerTranslations('players', index)
registerTranslations('players', advancementsTranslation)
registerTranslations('players', advancementsItemTranslation)
registerTranslations('players', statisticsTranslation)

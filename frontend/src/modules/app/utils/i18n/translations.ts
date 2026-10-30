// app模块翻译
import {registerTranslations} from '@S/services/i18n'

const translations = {
  // 导航栏
  'nav.status': {zh: '状态', en: 'Status'},
  'nav.about': {zh: '关于', en: 'About'},
  'nav.settings': {zh: '设置', en: 'Settings'},

  // 页脚
  'footer.copyright': {
    zh: '© 2026 MCS · Minecraft Server',
    en: '© 2026 MCS · Minecraft Server',
  },

  // 页面标题
  'page.about': {zh: '关于页面', en: 'About Page'},
  'page.home': {zh: '首页', en: 'Home Page'},

  // 操作按钮
  'actions.retry': {zh: '重试', en: 'Retry'},

  // 设置
  'settings.language': {zh: '语言', en: 'Language'},
  'settings.theme': {zh: '主题', en: 'Theme'},
  'settings.themeLight': {zh: '日间', en: 'Light'},
  'settings.themeDark': {zh: '夜间', en: 'Dark'},
  'settings.themeSystem': {zh: '自动', en: 'Auto'},
  'settings.themeFollowSystem': {zh: '主题跟随系统', en: 'Theme follows system'},

  // 通用
  'common.close': {zh: '关闭', en: 'Close'},
  'common.loading': {zh: '加载中...', en: 'Loading...'},
  'common.error': {zh: '出错了', en: 'Error'},
  'common.success': {zh: '成功', en: 'Success'},

  // 错误文案（全局）：后端错误码 → 文案，见 shared/infra/api/apiErrors.ts
  'error.turnstileRequired': {
    zh: '缺少人机验证令牌，请完成人机验证',
    en: 'Human verification is required. Please complete the check.',
  },
  'error.turnstileFailed': {zh: '人机验证未通过', en: 'Human verification failed.'},
  'error.notFound': {zh: '没有找到对应的数据', en: 'The requested data was not found.'},
  'error.internal': {zh: '服务器内部错误，请稍后重试', en: 'Internal server error. Please try again.'},
  'error.retry': {zh: '操作失败，请稍后重试', en: 'Something went wrong. Please try again.'},
  'error.apiNotJson': {
    zh: 'API 返回的不是 JSON（{url}）。请确认 VITE_API_BASE_URL 指向 Worker，且 API 已部署。',
    en: 'The API did not return JSON ({url}). Check that VITE_API_BASE_URL points at the Worker and the API is deployed.',
  },
  'error.apiRequestFailed': {
    zh: 'API 请求失败（HTTP {status}）：{url}',
    en: 'API request failed (HTTP {status}): {url}',
  },
  // 人机验证提示：直接写进页面上的字
  'error.turnstileHint': {
    zh: '人机验证：请点击下方复选框',
    en: 'Human verification: please tick the checkbox below.',
  },
  'error.turnstileTimeout': {
    zh: '人机验证未完成（可能需要点击复选框，或脚本被拦截器挡了）',
    en: 'Human verification was not completed (you may need to tick the checkbox, or a blocker stopped the script).',
  },
  'error.turnstileScriptFailed': {
    zh: '人机验证脚本加载失败（可能被广告拦截器或网络挡住）',
    en: 'The human verification script failed to load (an ad blocker or the network may have stopped it).',
  },

  // 状态页
  'status.yesterdayOnline': {zh: '昨日在线', en: 'Yesterday Online'},
  'status.description': {zh: '欢迎来到 MCS 服务器状态页面', en: 'Welcome to MCS Server Status Page'},
  'status.playerSearch': {zh: '玩家搜索', en: 'Player Search'},
  'status.serverOnline': {zh: '服务器在线', en: 'Server Online'},
  'status.serverOffline': {zh: '服务器离线', en: 'Server Offline'},
  'status.online': {zh: '在线', en: 'Online'},
  'status.offline': {zh: '离线', en: 'Offline'},
  'status.serverInfo': {zh: '服务器信息', en: 'Server Information'},
  'status.onlinePlayers': {zh: '在线玩家', en: 'Online Players'},
  'status.heartbeat': {zh: '心跳检测', en: 'Heartbeat'},
  'status.lastUpdate': {zh: '最后更新', en: 'Last Update'},
  'status.version': {zh: '版本', en: 'Version'},
  'status.uptime': {zh: '在线时间', en: 'Uptime'},
  'status.tps': {zh: 'TPS', en: 'TPS'},
  'status.ping': {zh: '延迟', en: 'Ping'},
  'status.players': {zh: '在线玩家', en: 'Online Players'},
  'status.system': {zh: '系统状态', en: 'System Status'},
  'status.stats': {zh: '服务器统计', en: 'Server Statistics'},
  'status.hero.title1': {zh: 'Minecraft', en: 'Minecraft'},
  'status.hero.title2': {zh: '服务器状态', en: 'Server Status'},
  'status.hero.subtitle': {zh: '实时监控服务器性能 · 时刻掌握服务器状态', en: 'Real-time server monitoring · Always know your server status'},
  'status.section.search': {zh: '搜索', en: 'Search'},
  'status.section.stats': {zh: '统计', en: 'Stats'},
  'status.section.realtime': {zh: '实时', en: 'Live'},
  'status.section.playerSearch': {zh: '玩家搜索', en: 'Player Search'},
  'status.section.yesterdayOnline': {zh: '昨日在线玩家', en: 'Yesterday Online Players'},
  'status.section.serverStatus': {zh: '服务器状态', en: 'Server Status'},
  'status.loading': {zh: '正在获取服务器状态...', en: 'Fetching server status...'},
  'status.tpsLabel': {zh: '服务器 TPS', en: 'Server TPS'},
  'status.autoRefresh': {zh: '每5分钟自动刷新', en: 'Auto-refresh every 5m'},
  'status.retry': {zh: '重试', en: 'Retry'},
  'status.info.title': {zh: '服务器信息', en: 'Server Information'},
  'status.info.version': {zh: '服务器版本', en: 'Server Version'},
  'status.info.uptime': {zh: '在线时间', en: 'Uptime'},
  'status.info.tps': {zh: 'TPS', en: 'TPS'},
  'status.info.latency': {zh: '延迟', en: 'Latency'},
  'status.players.title': {zh: '在线玩家', en: 'Online Players'},
  'status.players.count': {zh: '玩家数量', en: 'Player Count'},
  'status.players.name': {zh: '玩家名称', en: 'Player Name'},
  'status.players.level': {zh: '等级', en: 'Level'},
  'status.players.joined': {zh: '加入时间', en: 'Joined'},
  'status.system.title': {zh: '系统状态', en: 'System Status'},
  'status.system.server': {zh: '服务器', en: 'Server'},
  'status.system.database': {zh: '数据库', en: 'Database'},
  'status.system.discord': {zh: 'Discord机器人', en: 'Discord Bot'},
  'status.system.website': {zh: '网站', en: 'Website'},
  'status.system.online': {zh: '在线', en: 'Online'},
  'status.system.offline': {zh: '离线', en: 'Offline'},
  'status.system.unknown': {zh: '未知', en: 'Unknown'},
  'status.stats.title': {zh: '服务器统计', en: 'Server Statistics'},
  'status.stats.totalPlayers': {zh: '总玩家数', en: 'Total Players'},
  'status.stats.worldSize': {zh: '世界大小', en: 'World Size'},
  'status.stats.version': {zh: '服务器版本', en: 'Server Version'},
  'status.stats.core': {zh: '服务器核心', en: 'Server Core'},
  'status.stats.founded': {zh: '成立年份', en: 'Founded'},
  'status.yesterday.title': {zh: '昨日在线', en: 'Yesterday Online'},
  'status.quickLinks.title': {zh: '快速链接', en: 'Quick Links'},
  'status.quickLinks.rules': {zh: '服务器规则', en: 'Server Rules'},
  'status.quickLinks.store': {zh: '服务器商店', en: 'Server Store'},

  // 关于页
  'about.description': {zh: '了解 MCS 服务器的故事和团队', en: 'Learn about MCS Servers story and team'},
  'about.heroTitle': {zh: '关于我们', en: 'About Us'},
  'about.heroSubtitle': {zh: '一个专注于提供优质游戏体验的 Minecraft 服务器', en: 'A Minecraft server dedicated to providing quality gaming experiences'},
  'about.badge.intro': {zh: '简介', en: 'Intro'},
  'about.badge.stats': {zh: '数据', en: 'Stats'},
  'about.badge.contact': {zh: '联系', en: 'Contact'},
  'about.intro': {zh: '服务器介绍', en: 'Server Introduction'},
  'about.introText1': {zh: 'MCS 是一个基于 Paper 26.3 核心的 Minecraft 服务器，成立于 2024 年。我们致力于为玩家提供稳定、流畅、有趣的游戏环境。', en: 'MCS is a Minecraft server based on Paper 26.3 core, established in 2024. We are committed to providing players with a stable, smooth, and fun gaming environment.'},
  'about.stats.title': {zh: '服务器数据', en: 'Server Statistics'},
  'about.stats.version': {zh: '游戏版本', en: 'Game Version'},
  'about.stats.core': {zh: '服务器核心', en: 'Server Core'},
  'about.stats.uptime': {zh: '在线时间', en: 'Uptime'},
  'about.stats.founded': {zh: '成立年份', en: 'Founded'},
  'about.contact.title': {zh: '联系我们', en: 'Contact Us'},
  'about.contact.description': {zh: '有任何问题或建议，欢迎通过邮件联系我们', en: 'If you have any questions or suggestions, please feel free to contact us via email'},
  'about.contact.email': {zh: '发送邮件', en: 'Send Email'},
}

// 注册app模块翻译
registerTranslations('app', translations)

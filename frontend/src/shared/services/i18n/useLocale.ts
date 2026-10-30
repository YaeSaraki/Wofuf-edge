// 国际化组合式函数
import {computed, ref} from 'vue'
import {translate} from '@S/services/i18n/index.ts'

// 支持的语言
export type Locale = 'zh' | 'en'

// 默认语言
const defaultLocale: Locale = 'zh'

// 当前语言
// 优先用用户上次的选择（setLocale 写进去的），没有才看浏览器语言。
// 少了这一步，用户切到英文、刷新一下页面，语言又弹回浏览器语言。
const currentLocale = ref<Locale>(getSavedLocale() || getBrowserLocale() || defaultLocale)

// 设置语言
export function setLocale(locale: Locale) {
  currentLocale.value = locale
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('locale', locale)
  }
}

// 获取当前语言
export function getLocale(): Locale {
  return currentLocale.value
}

// 读取上次选的语言（存的值不认识就当没有）
function getSavedLocale(): Locale | null {
  // 非浏览器环境（脚本、测试）没有 localStorage
  if (typeof localStorage === 'undefined') return null
  const saved = localStorage.getItem('locale')
  return saved === 'zh' || saved === 'en' ? saved : null
}

// 国际化组合式函数
export function useLocale() {
  return {
    locale: computed(() => currentLocale.value),
    setLocale,
    translate,
  }
}

// 获取浏览器首选语言
function getBrowserLocale(): Locale {
  // 非浏览器环境（脚本、测试）没有 navigator
  if (typeof navigator === 'undefined') return defaultLocale

  // 获取浏览器语言
  const browserLang = navigator.language || defaultLocale

  // 简化语言代码（例如：zh-CN -> zh，en-US -> en）
  const simplifiedLang = browserLang.split('-')[0]

  // 映射到你的支持的语言
  return mapToSupportedLocale(simplifiedLang || defaultLocale)
}

// 映射到支持的语言
function mapToSupportedLocale(lang: string): Locale {
  const supportedLocales = ['en', 'zh'] as const

  // 检查是否直接支持
  if (supportedLocales.includes(lang as Locale)) {
    return lang as Locale
  }

  // 语言别名映射
  const localeMap: Record<string, Locale> = {
    'zh-CN': 'zh',
    'zh-TW': 'zh',
    'zh-HK': 'zh',
    'en-US': 'en',
    'en-GB': 'en',
  }

  return localeMap[lang] || defaultLocale
}

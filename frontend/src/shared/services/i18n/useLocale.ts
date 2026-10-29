// 国际化组合式函数
import {computed, ref} from 'vue'
import {translate} from '@S/services/i18n/index.ts'

// 支持的语言
export type Locale = 'zh' | 'en'

// 默认语言
const defaultLocale: Locale = 'zh'

// 当前语言
const currentLocale = ref<Locale>(getBrowserLocale() || defaultLocale)

// 设置语言
export function setLocale(locale: Locale) {
  currentLocale.value = locale
  localStorage.setItem('locale', locale)
}

// 获取当前语言
export function getLocale(): Locale {
  return currentLocale.value
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

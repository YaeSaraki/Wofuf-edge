// i18n核心功能
import type {ModuleTranslations, Translations} from './types.ts'
import {getLocale, type Locale} from './useLocale.ts'

// 组件要用当前语言时从这儿取，别直接 import 内部文件
export {getLocale, setLocale, useLocale} from './useLocale.ts'
export type {Locale} from './useLocale.ts'

/** 插值参数：条目里的 {name} 会被同名参数替换 */
export type TranslationParams = Record<string, string | number>

// 所有模块的翻译集合
const moduleTranslations: ModuleTranslations = {}

// 注册模块翻译
export function registerTranslations(moduleName: string, translations: Translations): void {
  if (!moduleTranslations[moduleName]) {
    moduleTranslations[moduleName] = {}
  }

  // 合并翻译，避免覆盖
  Object.assign(moduleTranslations[moduleName], translations)
}

// // 获取指定模块的翻译
// export function getModuleTranslations(moduleName: string): Translations {
//   return moduleTranslations[moduleName] || {}
// }
//
// // 获取所有翻译
// export function getAllTranslations(): ModuleTranslations {
//   return moduleTranslations
// }


/**
 * 这个键有没有翻译。
 *
 * `translate()` 找不到时会**原样返回键本身**（比如 `stats.item.AVIATE_ONE_CM`），
 * 界面上就会出现一串没人看得懂的键名。要把这种"没有名字"的条目藏起来，
 * 就得先能问出"到底有没有名字"——这正是这个函数存在的理由。
 */
export function hasTranslation(moduleName: string, key: string): boolean {
  const module = moduleTranslations[moduleName]
  if (!module) return false
  const entry = module[key]
  if (!entry) return false
  return Boolean(entry.zh || entry.en)
}

/**
 * 把条目里的 {name} 占位符换成 params 里的值。
 *
 * 没提供对应参数的占位符**原样保留** —— 界面上直接就能看出漏传了什么，
 * 总比悄悄渲染成空字符串好。
 */
function interpolate(text: string, params?: TranslationParams): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  )
}

export function translate(moduleName: string, key: string, params?: TranslationParams): string {
  const locale = getLocale()
  const defaultLocale: Locale = 'en'

  const module = moduleTranslations[moduleName]

  if (module == undefined) {
    const guessKey: string = moduleName.split('.').slice(1).join('.') || moduleName.split('.')[0] || ''
    for (const moduleName in moduleTranslations) {
      const translations = moduleTranslations[moduleName]
      if (translations == undefined) {
        continue
      }
      if (translations[guessKey] && translations[guessKey] != undefined) {
        console.log(`Translation key found but module name not match: ${moduleName}.${guessKey}`)
        return interpolate(
          translations[guessKey][locale] || translations[guessKey][defaultLocale],
          params,
        )
      }
    }
    // 未找到翻译
    console.warn(`Translation not found: ${moduleName}`)
    return key
  }

  if (module[key]) {
    return interpolate(module[key][locale] || module[key][defaultLocale], params)
  }
  // 未找到翻译
  console.warn(`Translation not found: ${moduleName}.${key}`)
  return key
}

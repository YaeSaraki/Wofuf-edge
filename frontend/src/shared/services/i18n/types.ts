// 翻译项接口
export interface TranslationItem {
  zh: string
  en: string
}

// 翻译集合接口
export interface Translations {
  [key: string]: TranslationItem
}

// 模块翻译接口
export interface ModuleTranslations {
  [moduleName: string]: Translations
}

// 翻译键类型
export type TranslationKey = string

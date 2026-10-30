/**
 * 界面主题（视觉风格）注册表。
 *
 * ⚠️ 和 light/dark/system 是两件事：
 *    · 明暗模式 = 浅色 / 深色（运行时可切，存 localStorage）
 *    · 界面主题 = 液态玻璃 / Memphis（**构建期**决定，改 config.env 的 UI_THEME）
 *
 * 主题值来自构建期注入的 VITE_UI_THEME（scripts/build.sh 从 config.env 传进来）。
 * 没配或配错了 → 退回默认主题，不会白屏。
 *
 * 新增主题：见 shared/themes/_template.css
 */

export interface ThemeDefinition {
  /** 主题 id：同时是 html[data-theme] 的值 */
  id: string
  /** 展示名 */
  label: string
  /** 一句话说明 */
  description: string
}

export const THEME_REGISTRY = {
  // 键带连字符，必须加引号（'liquid-glass' 不能写成 liquid-glass:）
  'liquid-glass': {
    id: 'liquid-glass',
    label: '液态玻璃',
    description: '液态玻璃 · 火焰橙主色',
  },
  memphis: {
    id: 'memphis',
    label: 'Memphis 孟菲斯',
    description: '波点 · 撞色 · 硬投影（默认）',
  },
} as const satisfies Record<string, ThemeDefinition>

export type ThemeId = keyof typeof THEME_REGISTRY

/** 所有可用主题 id（给配置校验用） */
export const themeIds = Object.keys(THEME_REGISTRY) as ThemeId[]

export const DEFAULT_THEME: ThemeId = 'memphis'

/** 把外部输入规整成合法主题 id */
export function resolveThemeId(raw: string | undefined | null): ThemeId {
  const value = (raw ?? '').trim().toLowerCase()
  return value in THEME_REGISTRY ? (value as ThemeId) : DEFAULT_THEME
}

/** 当前站点启用的主题（构建期定死） */
export const activeTheme: ThemeId = resolveThemeId(import.meta.env.VITE_UI_THEME)

/**
 * 把主题写到 <html> 上。
 * index.html 里还有一段内联脚本会提前做同样的事（避免首屏闪一下默认主题），
 * 这里再设一次是为了 SPA 内部切页、以及 html 被替换后的兜底。
 */
export function applyTheme(id: ThemeId = activeTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = id
}

import {existsSync, readFileSync} from 'node:fs'
import {fileURLToPath, URL} from 'node:url'

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// ── 界面主题 ────────────────────────────────────────────────────────────────
// 真源在 scripts/lib.sh（UI_THEMES / DEFAULT_UI_THEME）；下面这份是副本，
// scripts/check-theme.sh 会断言几处不漂移 —— 加主题时记得一起改。
const UI_THEMES = ['liquid-glass', 'memphis']
const DEFAULT_UI_THEME = 'memphis'

/**
 * 从仓库根的 config.env 读 UI_THEME。
 * config.env 不入库，是唯一定制点；读不到（CI 或没初始化）就当没配。
 */
function readConfiguredTheme(): string {
  const envFile = fileURLToPath(new URL('../config.env', import.meta.url))
  if (!existsSync(envFile)) return ''
  const line = readFileSync(envFile, 'utf8')
    .split('\n')
    .find((l) => l.trimStart().startsWith('UI_THEME='))
  if (!line) return ''
  return line
    .slice(line.indexOf('=') + 1)
    .trim()
    .replace(/^["']|["']$/g, '')
}

/**
 * 解析构建期要用的主题 id：非法值退回默认主题，不会白屏。
 * 优先级：构建脚本显式注入 > 根 config.env > 内置默认。
 */
function resolveUiTheme(): string {
  const raw = (process.env.VITE_UI_THEME ?? readConfiguredTheme()).trim().toLowerCase()
  if (!raw) return DEFAULT_UI_THEME
  if (!UI_THEMES.includes(raw)) {
    console.warn(
      `[vite] UI_THEME="${raw}" 不是已知主题（可选：${UI_THEMES.join(', ')}）→ 退回 ${DEFAULT_UI_THEME}`,
    )
    return DEFAULT_UI_THEME
  }
  return raw
}

// 注入 VITE_UI_THEME：index.html 的 %VITE_UI_THEME% 与前端 import.meta.env 都读它
process.env.VITE_UI_THEME = resolveUiTheme()

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@/views': fileURLToPath(new URL('./src/**/views', import.meta.url)),
      '@/components': fileURLToPath(new URL('./src/**/components', import.meta.url)),
      '@M': fileURLToPath(new URL('./src/modules', import.meta.url)),
      '@S': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@SU': fileURLToPath(new URL('./src/shared/utils', import.meta.url)),
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    // 本地开发把 /api 代理到本地跑着的 Worker（npx wrangler dev，默认 8787 端口）
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})

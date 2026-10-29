/**
 * 主题管理 Composable
 * 支持手动切换和系统跟随两种模式
 */

import { ref, watch, onMounted, onUnmounted } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

// 全局状态
const currentTheme = ref<ThemeMode>('system')
const isDark = ref(false)

// 初始化主题
function initTheme() {
  // 从 localStorage 读取保存的主题设置
  const savedTheme = localStorage.getItem('theme') as ThemeMode | null
  
  if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
    currentTheme.value = savedTheme
  }
  
  applyTheme()
}

// 应用主题
function applyTheme() {
  if (currentTheme.value === 'system') {
    // 跟随系统
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  } else {
    isDark.value = currentTheme.value === 'dark'
  }
  
  // 更新 document 的 dark class
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// 设置主题
function setTheme(theme: ThemeMode) {
  currentTheme.value = theme
  localStorage.setItem('theme', theme)
  applyTheme()
}

// 切换主题 (light <-> dark)
function toggleTheme() {
  if (currentTheme.value === 'system') {
    // 如果当前是跟随系统，切换到当前系统主题的反向
    setTheme(isDark.value ? 'light' : 'dark')
  } else {
    setTheme(currentTheme.value === 'dark' ? 'light' : 'dark')
  }
}

// 监听系统主题变化
let systemThemeMediaQuery: MediaQueryList | null = null

function handleSystemThemeChange() {
  if (currentTheme.value === 'system') {
    applyTheme()
  }
}

// 导出 composable
export function useTheme() {
  onMounted(() => {
    initTheme()
    
    // 监听系统主题变化
    systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemThemeMediaQuery.addEventListener('change', handleSystemThemeChange)
  })
  
  onUnmounted(() => {
    if (systemThemeMediaQuery) {
      systemThemeMediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  })
  
  return {
    currentTheme,
    isDark,
    setTheme,
    toggleTheme,
    initTheme,
  }
}

// 导出单例状态供直接访问
export { currentTheme, isDark, setTheme, toggleTheme, initTheme }

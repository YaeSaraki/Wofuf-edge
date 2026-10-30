<script lang="ts" setup>
import { siteConfig } from '@S/config/site.ts'
import Menubar from 'primevue/menubar'
import { useRouter } from 'vue-router'
import { getLocale, setLocale, useLocale } from '@S/services/i18n/useLocale.ts'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { MenuItem } from 'primevue/menuitem'
import DraggablePopup from '@S/components/DraggablePopup.vue'
import { useTheme, type ThemeMode } from '@S/composables/useTheme.ts'

const router = useRouter()
const { translate } = useLocale()
const { currentTheme, isDark, setTheme } = useTheme()

// 响应式检测
const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024
}

// 切换语言
const toggleLanguage = (lang: 'zh' | 'en') => {
  setLocale(lang)
  closeSettingsPopup()
}

// 切换主题
const toggleThemeMode = (theme: ThemeMode) => {
  setTheme(theme)
}

// 导航项（桌面端浮动菜单）
const desktopItems = computed<MenuItem[]>(() => [
  {
    label: translate('app', 'nav.status'),
    icon: 'pi pi-home',
    command: () => router.push('/'),
  },
  {
    label: translate('app', 'nav.about'),
    icon: 'pi pi-info-circle',
    command: () => router.push('/about'),
  },
])

// 移动端抽屉导航项
const drawerNavItems = computed(() => [
  { path: '/', icon: 'pi pi-home', label: translate('app', 'nav.status') },
  { path: '/about', icon: 'pi pi-info-circle', label: translate('app', 'nav.about') },
])

const currentPath = computed(() => router.currentRoute.value.path)

// 桌面端浮动菜单
const popupMenuRef = ref<HTMLElement | null>(null)
const showCloseButton = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null

const menuPosition = ref({
  x: typeof window !== 'undefined' ? window.innerWidth / 2 - 160 : 100,
  y: typeof window !== 'undefined' ? window.innerHeight / 100 : 100,
})

const dragState = ref({
  isDragging: false,
  startX: 0,
  startY: 0,
  offsetX: 0,
  offsetY: 0,
})

const menuStyle = computed(() => {
  const menuWidth = popupMenuRef.value?.offsetWidth || 320
  const menuHeight = popupMenuRef.value?.offsetHeight || 200

  let x = menuPosition.value.x
  let y = menuPosition.value.y

  if (dragState.value.isDragging && dragState.value.offsetX !== 0) {
    x = dragState.value.offsetX
    y = dragState.value.offsetY
  }

  if (typeof window !== 'undefined') {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (x + menuWidth > viewportWidth) x = viewportWidth - menuWidth - 10
    if (x < 10) x = 10
    if (y + menuHeight > viewportHeight) y = viewportHeight - menuHeight - 10
    if (y < 10) y = 10
  }

  return {
    left: `${x}px`,
    top: `${y}px`,
    transform: dragState.value.isDragging ? 'scale(0.98)' : 'scale(1)',
    backdropFilter: dragState.value.isDragging ? 'blur(4px)' : 'blur(3px)',
  }
})

// 移动端抽屉拖拽状态
const drawerRef = ref<HTMLElement | null>(null)
const drawerExpanded = ref(true) // 默认展开
const drawerDragState = ref({
  isDragging: false,
  startY: 0,
  startHeight: 0,
  currentHeight: 0,
})

// 抽屉高度范围
const drawerMinHeight = 40 // 最小高度：只显示小白条
const drawerMaxHeight = ref(120) // 最大高度：默认值，会在 mounted 时更新

const drawerHeight = computed(() => {
  if (drawerDragState.value.isDragging) {
    return Math.max(drawerMinHeight, Math.min(drawerMaxHeight.value, drawerDragState.value.currentHeight))
  }
  return drawerExpanded.value ? drawerMaxHeight.value : drawerMinHeight
})

const drawerStyle = computed(() => ({
  height: `${drawerHeight.value}px`,
  transition: drawerDragState.value.isDragging ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
}))

// 抽屉拖拽处理
const handleDrawerDragStart = (event: MouseEvent | TouchEvent) => {
  event.preventDefault()

  const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0]?.clientY || 0

  drawerDragState.value = {
    isDragging: true,
    startY: clientY,
    startHeight: drawerHeight.value,
    currentHeight: drawerHeight.value,
  }

  document.addEventListener('mousemove', handleDrawerDragMove)
  document.addEventListener('touchmove', handleDrawerDragMove)
  document.addEventListener('mouseup', handleDrawerDragEnd)
  document.addEventListener('touchend', handleDrawerDragEnd)
  document.body.style.userSelect = 'none'
}

const handleDrawerDragMove = (event: MouseEvent | TouchEvent) => {
  if (!drawerDragState.value.isDragging) return
  event.preventDefault()

  const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0]?.clientY || 0
  const deltaY = drawerDragState.value.startY - clientY // 向上拖动为正

  drawerDragState.value.currentHeight = drawerDragState.value.startHeight + deltaY
}

const handleDrawerDragEnd = () => {
  if (!drawerDragState.value.isDragging) return

  document.removeEventListener('mousemove', handleDrawerDragMove)
  document.removeEventListener('touchmove', handleDrawerDragMove)
  document.removeEventListener('mouseup', handleDrawerDragEnd)
  document.removeEventListener('touchend', handleDrawerDragEnd)
  document.body.style.userSelect = ''

  // 根据拖动后的高度判断展开还是收起
  const threshold = (drawerMaxHeight.value + drawerMinHeight) / 2
  drawerExpanded.value = drawerDragState.value.currentHeight >= threshold

  drawerDragState.value.isDragging = false
}

// 设置弹窗
const showSettingsPopup = ref(false)
const settingsPopupX = ref(0)
const settingsPopupY = ref(0)

const openSettingsPopup = () => {
  settingsPopupX.value = window.innerWidth / 2 - 140
  settingsPopupY.value = window.innerHeight / 2 - 150
  showSettingsPopup.value = true
}

const closeSettingsPopup = () => {
  showSettingsPopup.value = false
}

// 设置浮动按钮位置 - 默认在右下角20%处
const settingsBallPosition = ref({ x: 20, y: 0 })
const settingsBallPositionInitialized = ref(false)
const settingsBallDrag = ref({
  isDragging: false,
  startX: 0,
  startY: 0,
  offsetX: 0,
  offsetY: 0,
  hasMoved: false,
})

const settingsBallStyle = computed(() => ({
  right: `${settingsBallPosition.value.x}px`,
  bottom: `${settingsBallPosition.value.y}px`,
}))

function clearTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function startHideTimer() {
  clearTimer()
  hideTimer = setTimeout(() => {
    if (!dragState.value.isDragging) showCloseButton.value = false
  }, 3000)
}

function showButton() {
  showCloseButton.value = true
  startHideTimer()
}

function hideButton() {
  showCloseButton.value = false
  clearTimer()
}

const handleDragStart = (event: MouseEvent | TouchEvent) => {
  event.preventDefault()
  event.stopPropagation()

  const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0]?.clientX || 0
  const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0]?.clientY || 0

  dragState.value = {
    isDragging: true,
    startX: clientX,
    startY: clientY,
    offsetX: menuPosition.value.x,
    offsetY: menuPosition.value.y,
  }

  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('touchmove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)
  document.addEventListener('touchend', handleDragEnd)
  document.body.style.userSelect = 'none'

  hideButton()
}

const handleDragMove = (event: MouseEvent | TouchEvent) => {
  if (!dragState.value.isDragging) return
  event.preventDefault()

  const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0]?.clientX || 0
  const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0]?.clientY || 0

  const deltaX = clientX - dragState.value.startX
  const deltaY = clientY - dragState.value.startY

  dragState.value.offsetX += deltaX
  dragState.value.offsetY += deltaY

  dragState.value.startX = clientX
  dragState.value.startY = clientY

  menuPosition.value.x = dragState.value.offsetX
  menuPosition.value.y = dragState.value.offsetY
}

const handleDragEnd = () => {
  if (!dragState.value.isDragging) return

  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('touchmove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
  document.removeEventListener('touchend', handleDragEnd)
  document.body.style.userSelect = ''

  dragState.value.isDragging = false
  showButton()
}

const resetMenuPosition = () => {
  if (typeof window !== 'undefined') {
    menuPosition.value = {
      x: window.innerWidth / 2 - 160,
      y: window.innerHeight / 100,
    }
  }
  hideButton()
}

const handleMenuClick = () => showButton()

// 设置浮动按钮拖拽
const handleSettingsBallDragStart = (event: MouseEvent | TouchEvent) => {
  event.preventDefault()

  const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0]?.clientX || 0
  const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0]?.clientY || 0

  settingsBallDrag.value = {
    isDragging: true,
    startX: clientX,
    startY: clientY,
    offsetX: settingsBallPosition.value.x,
    offsetY: settingsBallPosition.value.y,
    hasMoved: false,
  }

  document.addEventListener('mousemove', handleSettingsBallDragMove)
  document.addEventListener('touchmove', handleSettingsBallDragMove)
  document.addEventListener('mouseup', handleSettingsBallDragEnd)
  document.addEventListener('touchend', handleSettingsBallDragEnd)
  document.body.style.userSelect = 'none'
}

const handleSettingsBallDragMove = (event: MouseEvent | TouchEvent) => {
  if (!settingsBallDrag.value.isDragging) return
  event.preventDefault()

  const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0]?.clientX || 0
  const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0]?.clientY || 0

  // 计算移动增量
  const deltaX = settingsBallDrag.value.startX - clientX
  const deltaY = settingsBallDrag.value.startY - clientY

  if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
    settingsBallDrag.value.hasMoved = true
  }

  // 使用 right 定位：向左拖动 clientX 减小，deltaX 为正，right 应该增加（正确）
  // 使用 bottom 定位：向上拖动 clientY 减小，deltaY 为正，bottom 应该增加（正确）
  const minBottom = isMobile.value ? drawerHeight.value + 20 : 20
  const newX = Math.max(10, Math.min(window.innerWidth - 60, settingsBallDrag.value.offsetX + deltaX))
  const newY = Math.max(minBottom, Math.min(window.innerHeight - 70, settingsBallDrag.value.offsetY + deltaY))

  settingsBallDrag.value.offsetX = newX
  settingsBallDrag.value.offsetY = newY

  settingsBallDrag.value.startX = clientX
  settingsBallDrag.value.startY = clientY

  settingsBallPosition.value.x = newX
  settingsBallPosition.value.y = newY
}

const handleSettingsBallDragEnd = () => {
  if (!settingsBallDrag.value.isDragging) return

  document.removeEventListener('mousemove', handleSettingsBallDragMove)
  document.removeEventListener('touchmove', handleSettingsBallDragMove)
  document.removeEventListener('mouseup', handleSettingsBallDragEnd)
  document.removeEventListener('touchend', handleSettingsBallDragEnd)
  document.body.style.userSelect = ''

  settingsBallDrag.value.isDragging = false
}

const handleSettingsBallClick = () => {
  if (!settingsBallDrag.value.hasMoved) {
    openSettingsPopup()
  }
}

onMounted(() => {
  checkMobile()

  // 计算抽屉最大高度
  if (isMobile.value) {
    drawerMaxHeight.value = 130
  }

  // 初始化设置按钮位置 - 右下角20%处
  if (!settingsBallPositionInitialized.value) {
    settingsBallPosition.value.y = Math.floor(window.innerHeight * 0.2)
    settingsBallPositionInitialized.value = true
  }

  window.addEventListener('resize', () => {
    checkMobile()
    resetMenuPosition()
    // 窗口大小变化时重新计算位置
    if (settingsBallPosition.value.y > window.innerHeight - 70) {
      settingsBallPosition.value.y = Math.floor(window.innerHeight * 0.2)
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('touchmove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
  document.removeEventListener('touchend', handleDragEnd)
  document.removeEventListener('mousemove', handleSettingsBallDragMove)
  document.removeEventListener('touchmove', handleSettingsBallDragMove)
  document.removeEventListener('mouseup', handleSettingsBallDragEnd)
  document.removeEventListener('touchend', handleSettingsBallDragEnd)
  document.removeEventListener('mousemove', handleDrawerDragMove)
  document.removeEventListener('touchmove', handleDrawerDragMove)
  document.removeEventListener('mouseup', handleDrawerDragEnd)
  document.removeEventListener('touchend', handleDrawerDragEnd)
  document.body.style.userSelect = ''
  clearTimer()
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <!-- 桌面端：浮动菜单 - 液态玻璃效果 -->
  <div
    v-if="!isMobile"
    ref="popupMenuRef"
    :style="menuStyle"
    class="floating-menu ui-nav-surface select-none flex fixed z-9999"
    @mouseenter="showButton"
    @mouseleave="startHideTimer"
    @click.stop="handleMenuClick"
  >
    <span
      class="p-3 ml-2 cursor-move flex items-center"
      @mousedown="handleDragStart"
      @touchstart="handleDragStart"
    >
      <span class="logo font-bold boder-none">{{ siteConfig.name }}</span>
    </span>

    <button
      v-show="showCloseButton"
      aria-label="Reset position"
      class="reset-btn absolute -top-2 -left-2 p-1.5 hover:scale-105 transition-opacity duration-200"
      title="Reset to center"
      @click.stop="resetMenuPosition"
    >
      <svg class="w-4 h-4 reset-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
      </svg>
    </button>

    <Menubar :model="desktopItems" style="background: transparent; border: none !important; --p-menubar-submenu-border-color: rgb(245 245 245 / 0.5);" />
  </div>

  <!-- 移动端/平板：底部抽屉导航栏 (可上下拖动) -->
  <nav v-else ref="drawerRef" class="drawer-nav fixed bottom-0 left-0 right-0 z-9999" :style="drawerStyle">
    <div class="drawer-blur ui-nav-surface ui-nav-surface--top" />
    <div class="drawer-content">
      <!-- 拖拽手柄 -->
      <div
        class="drawer-handle-wrapper"
        @mousedown="handleDrawerDragStart"
        @touchstart="handleDrawerDragStart"
      >
        <div class="drawer-handle" />
      </div>

      <!-- 导航项 (只在展开时显示) -->
      <div v-show="drawerExpanded || drawerDragState.isDragging" class="nav-items">
        <router-link
          v-for="item in drawerNavItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: currentPath === item.path }"
        >
          <div class="nav-icon-wrapper">
            <!-- 首页图标 -->
            <svg v-if="item.path === '/'" class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <!-- 关于图标 -->
            <svg v-else-if="item.path === '/about'" class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </div>
    </div>
  </nav>

  <!-- 设置浮动按钮 (所有设备) - 液态玻璃效果 -->
  <button
    class="settings-fab ui-nav-surface"
    :style="settingsBallStyle"
    @mousedown="handleSettingsBallDragStart"
    @touchstart.passive="handleSettingsBallDragStart"
    @click="handleSettingsBallClick"
  >
    <div class="fab-inner">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </div>
  </button>

  <!-- 设置弹窗 -->
  <DraggablePopup
    :visible="showSettingsPopup"
    :init-x="settingsPopupX"
    :init-y="settingsPopupY"
    :width="280"
    :max-height="240"
    :z-index="10001"
    @close="closeSettingsPopup"
  >
    <template #content="{ closePopup, handleDragStart }">
      <div class="settings-popup">
        <div class="popup-header" @mousedown="handleDragStart" @touchstart="handleDragStart">
          <div class="popup-drag-handle" />
        </div>

        <div class="popup-title">
          <span>{{ translate('app', 'nav.settings') }}</span>
        </div>

        <!-- 语言设置 -->
        <div class="settings-section">
          <div class="section-label">{{ translate('app', 'settings.language') }}</div>
          <div class="options-grid">
            <button class="option-btn" :class="{ active: getLocale() === 'zh' }" @click="toggleLanguage('zh')">
              <span class="option-flag">🇨🇳</span>
              <span class="option-text">中文</span>
              <i v-if="getLocale() === 'zh'" class="pi pi-check check-icon" />
            </button>
            <button class="option-btn" :class="{ active: getLocale() === 'en' }" @click="toggleLanguage('en')">
              <span class="option-flag">🇺🇸</span>
              <span class="option-text">EN</span>
              <i v-if="getLocale() === 'en'" class="pi pi-check check-icon" />
            </button>
          </div>
        </div>

        <!-- 主题设置 -->
        <div class="settings-section">
          <div class="section-label">{{ translate('app', 'settings.theme') }}</div>
          <div class="theme-options">
            <button
              class="theme-btn"
              :class="{ active: currentTheme === 'light' }"
              @click="toggleThemeMode('light')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
              <span>{{ translate('app', 'settings.themeLight') }}</span>
            </button>
            <button
              class="theme-btn"
              :class="{ active: currentTheme === 'dark' }"
              @click="toggleThemeMode('dark')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
              <span>{{ translate('app', 'settings.themeDark') }}</span>
            </button>
            <button
              class="theme-btn"
              :class="{ active: currentTheme === 'system' }"
              @click="toggleThemeMode('system')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
              <span>{{ translate('app', 'settings.themeSystem') }}</span>
            </button>
          </div>
        </div>

        <button class="close-btn" @click="closePopup">
          {{ translate('app', 'common.close') }}
        </button>
      </div>
    </template>
  </DraggablePopup>
</template>

<style scoped>
/* ===== 桌面端浮动菜单 ===== */
/* 表面（背景/描边/阴影/毛玻璃）由 .ui-nav-surface 提供，主题可换 */
.floating-menu {
  border-radius: 1rem;
}

.reset-btn {
  border-radius: 0.75rem;
  background: var(--ui-surface-glass);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--ui-border);
  box-shadow: var(--ui-shadow-md);
}

.reset-icon {
  color: var(--ui-text-muted);
}

.cursor-move { cursor: move; }
.cursor-move:active { cursor: grabbing; }

/* Logo 样式 */
.logo {
  background: var(--ui-accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ===== 移动端抽屉导航栏 - 液态玻璃效果 ===== */
.drawer-nav {
  padding-bottom: env(safe-area-inset-bottom, 0);
  overflow: visible;
}

.drawer-blur {
  position: absolute;
  inset: 0;
  border-radius: 24px 24px 0 0;
  /* 裁剪圆角，防止四角阴影 */
  clip-path: inset(0 0 0 0 round 24px 24px 0 0);
}

.drawer-content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.drawer-handle-wrapper {
  padding: 10px 0 8px;
  cursor: grab;
  display: flex;
  justify-content: center;
}

.drawer-handle-wrapper:active {
  cursor: grabbing;
}

.drawer-handle {
  width: 36px;
  height: 5px;
  background: var(--ui-text-faint);
  border-radius: 2.5px;
}

.nav-items {
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex: 1;
  padding: 0 8px 8px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 16px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--ui-text-secondary);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.nav-item.active {
  color: var(--ui-accent);
  background: var(--ui-accent-gradient-subtle);
}

.nav-item:active {
  transform: scale(0.92);
}

.nav-icon-wrapper {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  width: 24px;
  height: 24px;
}

.nav-label {
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin-top: 4px;
  color: var(--ui-text-secondary);
}

.nav-item.active .nav-label {
  color: var(--ui-accent);
}

/* ===== 设置浮动按钮 - 液态玻璃效果 ===== */
.settings-fab {
  position: fixed;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  touch-action: none;

  -webkit-appearance: none;
}

.settings-fab:hover {
  transform: scale(1.08);
  box-shadow: var(--ui-nav-shadow);
}

.settings-fab:active {
  transform: scale(0.95);
}

.fab-inner {
  width: 24px;
  height: 24px;
  color: var(--ui-text);
  transition: color 0.2s ease;
}

.fab-inner svg {
  width: 100%;
  height: 100%;
}

/* ===== 设置弹窗 ===== */
.settings-popup {
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif;
}

.popup-header {
  display: flex;
  justify-content: center;
  padding: 10px 0 6px;
  cursor: grab;
}

.popup-header:active {
  cursor: grabbing;
}

.popup-drag-handle {
  width: 36px;
  height: 5px;
  background: var(--ui-text-faint);
  border-radius: 2.5px;
}

.popup-title {
  text-align: center;
  padding: 0 16px 12px;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ui-text);
  border-bottom: 0.5px solid var(--ui-border);
  margin: 0 16px;
}

.settings-section {
  padding: 12px 16px;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ui-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 8px;
  padding-left: 4px;
}

.options-grid {
  display: flex;
  gap: 8px;
}

.option-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: var(--ui-surface-active);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  position: relative;
}

.option-btn:active {
  transform: scale(0.96);
}

.option-btn.active {
  background: var(--ui-accent-gradient-subtle);
  border: 1px solid var(--ui-border-accent);
}

.option-flag {
  font-size: 1.5rem;
  margin-bottom: 4px;
}

.option-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ui-text);
}

.check-icon {
  position: absolute;
  top: 6px;
  right: 6px;
  color: var(--ui-accent);
  font-size: 0.75rem;
  font-weight: 600;
}

/* 主题选择按钮 */
.theme-options {
  display: flex;
  gap: 8px;
}

.theme-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 6px;
  background: var(--ui-surface-active);
  border: 1px solid transparent;
  border-radius: var(--ui-radius-md);
  cursor: pointer;
  /* 状态切换用跳切：干脆落到完成态，不拖泥带水 */
  transition:
    background var(--ui-transition-step),
    border-color var(--ui-transition-step),
    transform var(--ui-transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.theme-btn:active {
  transform: scale(0.96);
}

.theme-btn.active {
  background: var(--ui-accent-gradient-subtle);
  border: 1px solid var(--ui-border-accent);
}

.theme-btn svg {
  width: 20px;
  height: 20px;
  margin-bottom: 4px;
  color: var(--ui-text-muted);
}

.theme-btn.active svg {
  color: var(--ui-accent);
}

.theme-btn span {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--ui-text-secondary);
}

.theme-btn.active span {
  color: var(--ui-accent);
}

.close-btn {
  width: calc(100% - 32px);
  margin: 8px 16px 16px;
  padding: 14px;
  background: var(--ui-accent-gradient-subtle);
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  color: var(--ui-accent);
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.close-btn:active {
  transform: scale(0.98);
}

/* ===== 桌面端子菜单 ===== */
/* Menubar 组件透明化 */
:deep(.p-menubar) {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
}

:deep(.p-menubar-root-list) {
  background: transparent !important;
  gap: 2px !important;
  padding-right: 8px !important;
}

:deep(.p-menubar-item) {
  background: transparent !important;
  margin: 0 !important;
}

:deep(.p-menubar-item-link) {
  background: transparent !important;
  transition: background 0.2s ease !important;
  border-radius: 10px !important;
  padding: 0.5rem 0.875rem !important;
  margin: 3px !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

:deep(.p-menubar-item-link:hover) {
  background: var(--ui-surface-hover) !important;
}

:deep(.p-menubar-item-content) {
  background: transparent !important;
}

:deep(.p-menubar-item-label) {
  background: transparent !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  color: var(--ui-text) !important;
  transition: transform 0.15s ease !important;
  transform-origin: center center !important;
}

:deep(.p-menubar-item-link:hover .p-menubar-item-label) {
  transform: scale(1.08) !important;
  color: var(--ui-accent) !important;
}

:deep(.p-menubar-item-icon) {
  background: transparent !important;
  color: var(--ui-text-secondary) !important;
  transition: transform 0.15s ease !important;
  transform-origin: center center !important;
}

:deep(.p-menubar-item-link:hover .p-menubar-item-icon) {
  transform: scale(1.15) !important;
  color: var(--ui-accent) !important;
}

:deep(.p-menubar-submenu) { margin: 0 4px !important; }
:deep(.p-menubar-root-list) { min-width: 100px !important; }

:deep(.p-menubar-root-list > .p-menubar-item > .p-submenu-list) {
  background: var(--ui-nav-bg) !important;
  backdrop-filter: var(--ui-nav-blur) !important;
  -webkit-backdrop-filter: var(--ui-nav-blur) !important;
  border: 1px solid var(--ui-nav-border) !important;
  border-radius: 12px !important;
  padding: 8px !important;
  box-shadow: var(--ui-nav-shadow) !important;
  margin-top: 8px !important;
}

:deep(.p-submenu-list .p-menubar-item) { background: transparent !important; margin: 0 !important; }
:deep(.p-submenu-list .p-menubar-item-link) {
  background: transparent !important;
  margin: 2px 0 !important;
  border-radius: 8px !important;
  border: none !important;
}
:deep(.p-submenu-list .p-menubar-item-link:hover) {
  background: var(--ui-surface-hover) !important;
}

:deep(.p-menubar-submenu-icon) { color: var(--ui-text-muted) !important; font-size: 12px !important; }

:deep(.p-menubar-root-list > .p-menubar-item > .p-submenu-list) {
  animation: menuSlide 0.25s cubic-bezier(0.2, 0, 0, 1) !important;
  transform-origin: top center !important;
}

@keyframes menuSlide {
  from { opacity: 0 !important; transform: translateY(-10px) scale(0.95) !important; }
  to { opacity: 1 !important; transform: translateY(0) scale(1) !important; }
}
</style>

<!-- 全局样式覆盖 PrimeVue 默认样式 -->
<style>
/* 导航栏使用全局变量（明暗通用，主题也跟着换） */
.p-menubar .p-menubar-item-label {
  color: var(--ui-text) !important;
}

.p-menubar .p-menubar-item-icon {
  color: var(--ui-text-secondary) !important;
}

.p-menubar .p-menubar-item-content {
  color: var(--ui-text) !important;
}

.p-menubar-item-link:hover .p-menubar-item-label {
  color: var(--ui-accent) !important;
}

.p-menubar-item-link:hover .p-menubar-item-icon {
  color: var(--ui-accent) !important;
}
</style>

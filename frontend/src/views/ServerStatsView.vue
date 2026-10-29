<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLocale } from '@S/services/i18n/useLocale.ts'
import YesterdayOnlineList from '@M/players/components/yesterdayOnlineList/YesterdayOnlineList.vue'
import PlayerSearch from '@M/players/components/playerSearch/PlayerSearch.vue'
import { playerService } from '@M/players'
import type { ServerStatus } from '@M/players/dtos/ServerStatus.ts'

const { translate } = useLocale()

// 服务器状态
const serverStatus = ref<ServerStatus | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let refreshInterval: number | null = null

// 动画控制
const isVisible = ref(false)
const textVisible = ref(false)

// 计算属性
const isOnline = computed(() => serverStatus.value?.heartbeatStatus ?? false)
const statusClass = computed(() => isOnline.value ? 'status-online' : 'status-offline')
const statusText = computed(() => isOnline.value ? translate('app', 'status.online') : translate('app', 'status.offline'))

const tpsColor = computed(() => {
  if (!serverStatus.value) return 'text-tertiary'
  const tps = parseFloat(serverStatus.value.tps)
  if (tps >= 18) return 'text-emerald'
  if (tps >= 15) return 'text-amber'
  return 'text-rose'
})

// 获取服务器状态
const fetchServerStatus = async () => {
  if (loading.value) return
  
  loading.value = true
  error.value = null
  
  try {
    const result = await playerService.getServerStatus()
    
    if (result.isSuccess) {
      serverStatus.value = result.getValue()
    } else {
      error.value = typeof result.error === 'string' ? result.error : '获取服务器状态失败'
      console.error('获取服务器状态失败:', result.error)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '获取服务器状态失败'
    console.error('获取服务器状态异常:', e)
  } finally {
    loading.value = false
  }
}

// 格式化时间
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  setTimeout(() => {
    isVisible.value = true
  }, 100)
  
  setTimeout(() => {
    textVisible.value = true
  }, 300)
  
  fetchServerStatus()
  refreshInterval = window.setInterval(fetchServerStatus, 300000)  // 5 分钟，与后端 Cron 对齐
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<template>
  <div class="page-container">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-gradient"></div>
      
      <div class="hero-content" :class="{ visible: textVisible }">
        <!-- 状态徽章 -->
        <div class="status-badge liquid-glass">
          <div class="badge-icon global-icon global-icon-sm">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/>
            </svg>
          </div>
          <span>{{ statusText }}</span>
        </div>

        <!-- 主标题 -->
        <h1 class="hero-title">
          <span class="title-line">{{ translate('app', 'status.hero.title1') }}</span>
          <span class="title-line italic">{{ translate('app', 'status.hero.title2') }}</span>
        </h1>

        <!-- 副标题 -->
        <p class="hero-subtitle">
          {{ translate('app', 'status.hero.subtitle') }}
        </p>
      </div>

      <div class="hero-fade"></div>
    </section>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 玩家搜索 -->
      <section class="section" :class="{ visible: isVisible }">
        <div class="section-header">
          <div class="badge liquid-glass">
            <div class="badge-icon global-icon global-icon-sm">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <span>{{ translate('app', 'status.section.search') }}</span>
          </div>
          <h2 class="section-title">{{ translate('app', 'status.section.playerSearch') }}</h2>
        </div>
        <div class="glass-card">
          <PlayerSearch />
        </div>
      </section>

      <!-- 昨日在线玩家 -->
      <section class="section" :class="{ visible: isVisible }">
        <div class="section-header">
          <div class="badge liquid-glass">
            <div class="badge-icon global-icon global-icon-sm">
              <svg viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <span>{{ translate('app', 'status.section.stats') }}</span>
          </div>
          <h2 class="section-title">{{ translate('app', 'status.section.yesterdayOnline') }}</h2>
        </div>
        <div class="glass-card">
          <YesterdayOnlineList />
        </div>
      </section>

      <!-- 服务器状态 -->
      <section class="section server-status-section" :class="{ visible: isVisible }">
        <div class="section-header">
          <div class="badge liquid-glass">
            <div class="badge-icon global-icon global-icon-sm">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <span>{{ translate('app', 'status.section.realtime') }}</span>
          </div>
          <h2 class="section-title">{{ translate('app', 'status.section.serverStatus') }}</h2>
        </div>
        
        <!-- 加载状态 -->
        <div v-if="loading && !serverStatus" class="loading-container">
          <div class="liquid-glass loading-card">
            <div class="loading-spinner"></div>
            <p class="loading-text">{{ translate('app', 'status.loading') }}</p>
          </div>
        </div>
        
        <!-- 错误提示 -->
        <div v-else-if="error" class="error-container">
          <div class="liquid-glass error-card">
            <div class="error-icon global-icon global-icon-xl">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p class="error-text">{{ error }}</p>
            <button @click="fetchServerStatus" class="retry-button liquid-glass-strong">
              <div class="button-icon global-icon global-icon-sm">
                <svg viewBox="0 0 24 24">
                  <path d="M23 4v6h-6"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </div>
              <span>{{ translate('app', 'status.retry') }}</span>
            </button>
          </div>
        </div>
        
        <!-- 服务器状态信息 -->
        <div v-else-if="serverStatus" class="server-stats-grid">
          <!-- 在线人数 -->
          <div class="stat-card liquid-glass">
            <div class="stat-icon-wrapper liquid-glass-strong">
              <div class="stat-icon global-icon global-icon-xl">
                <svg viewBox="0 0 24 24">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
            </div>
            <div class="stat-content">
              <div class="stat-label">{{ translate('app', 'status.onlinePlayers') }}</div>
              <div class="stat-value">
                <span class="online-count">{{ serverStatus.onlinePlayers }}</span>
                <span class="separator">/</span>
                <span class="max-count">{{ serverStatus.maxPlayers }}</span>
              </div>
              <div class="stat-bar">
                <div 
                  class="stat-bar-fill" 
                  :style="{ width: `${(serverStatus.onlinePlayers / serverStatus.maxPlayers) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- TPS -->
          <div class="stat-card liquid-glass">
            <div class="stat-icon-wrapper liquid-glass-strong">
              <div class="stat-icon global-icon global-icon-xl">
                <svg viewBox="0 0 24 24">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
            </div>
            <div class="stat-content">
              <div class="stat-label">{{ translate('app', 'status.tps') }}</div>
              <div class="stat-value" :class="tpsColor">
                {{ serverStatus.tps }}
              </div>
              <div class="tps-indicator">
                <div class="tps-bar" :class="tpsColor"></div>
              </div>
            </div>
          </div>

          <!-- 心跳状态 -->
          <div class="stat-card liquid-glass">
            <div class="stat-icon-wrapper liquid-glass-strong">
              <div class="stat-icon global-icon global-icon-xl">
                <svg viewBox="0 0 24 24">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
            </div>
            <div class="stat-content">
              <div class="stat-label">{{ translate('app', 'status.heartbeat') }}</div>
              <div class="stat-value">
                <span :class="serverStatus.heartbeatStatus ? 'status-online-text' : 'status-offline-text'">
                  {{ serverStatus.heartbeatStatus ? translate('app', 'status.online') : translate('app', 'status.offline') }}
                </span>
              </div>
              <div class="heartbeat-animation" :class="{ active: serverStatus.heartbeatStatus }">
                <div class="heartbeat-pulse"></div>
              </div>
            </div>
          </div>

          <!-- 更新时间 -->
          <div class="stat-card liquid-glass">
            <div class="stat-icon-wrapper liquid-glass-strong">
              <div class="stat-icon global-icon global-icon-xl">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
            </div>
            <div class="stat-content">
              <div class="stat-label">{{ translate('app', 'status.lastUpdate') }}</div>
              <div class="stat-value time-value">
                {{ formatTime(serverStatus.updateTime) }}
              </div>
              <div class="auto-refresh">
                <div class="refresh-icon global-icon global-icon-sm">
                  <svg viewBox="0 0 24 24">
                    <path d="M23 4v6h-6"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </div>
                <span class="refresh-text">{{ translate('app', 'status.autoRefresh') }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
@import '@S/styles/global.css';

/* 页面容器 */
.page-container {
  min-height: 100vh;
  background: hsl(var(--background));
  color: var(--text-primary);
  font-family: var(--font-body);
  overflow-x: hidden;
  padding-top: 5rem;
}

/* Hero Section */
.hero-section {
  position: relative;
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6rem 2rem 4rem;
  overflow: hidden;
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 50% 30%,
    rgba(99, 102, 241, 0.12) 0%,
    transparent 50%
  );
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 10;
  text-align: center;
  max-width: 900px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.hero-content.visible {
  opacity: 1;
  transform: translateY(0);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 1.375rem;
  border-radius: var(--radius-full);
  font-size: 0.9375rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.badge-icon {
  opacity: 0.9;
}

.status-online .badge-icon {
  color: #10b981;
}

.status-offline .badge-icon {
  color: #f43f5e;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.hero-title {
  font-family: var(--font-heading);
  font-size: 4rem;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  font-weight: 400;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

@media (min-width: 768px) {
  .hero-title {
    font-size: 5.5rem;
  }
}

.title-line {
  display: block;
  letter-spacing: -0.02em;
}

.title-line.italic {
  font-style: italic;
}

.hero-subtitle {
  font-size: 1.25rem;
  font-weight: 400;
  color: var(--text-secondary);
  line-height: 1.7;
}

.hero-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: linear-gradient(to top, hsl(var(--background)), transparent);
  pointer-events: none;
}

/* 主内容区域 */
.main-content {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem 4rem;
}

/* Section */
.section {
  margin-bottom: 4rem;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.section.visible {
  opacity: 1;
  transform: translateY(0);
}

.section:nth-child(2) { transition-delay: 0.1s; }
.section:nth-child(3) { transition-delay: 0.2s; }

.section-header {
  margin-bottom: 1.5rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.875rem;
  color: var(--text-primary);
}

.badge-icon {
  opacity: 0.9;
  color: var(--primary-color);
}

.section-title {
  font-family: var(--font-heading);
  font-size: 2.25rem;
  font-weight: 400;
  font-style: italic;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

@media (min-width: 768px) {
  .section-title {
    font-size: 2.75rem;
  }
}

/* 玻璃卡片 */
.glass-card {
  padding: 2rem;
  border-radius: var(--radius-2xl);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.08), 0 8px 32px rgba(0, 0, 0, 0.2);
}

@media (min-width: 768px) {
  .glass-card {
    padding: 2.5rem;
  }
}

/* 加载和错误状态 */
.loading-container,
.error-container {
  padding: 3rem 1rem;
}

.loading-card,
.error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 3rem 2rem;
  border-radius: var(--radius-2xl);
  text-align: center;
}

.loading-spinner {
  width: 52px;
  height: 52px;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 400;
}

.error-icon {
  color: #f43f5e;
  opacity: 0.8;
}

.error-text {
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 400;
  max-width: 400px;
}

.retry-button {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 2.25rem;
  font-size: 0.9375rem;
  font-weight: 600;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-base) ease;
  color: var(--text-primary);
  border: none;
  outline: none;
}

.retry-button:hover {
  transform: translateY(-2px);
}

.button-icon {
  opacity: 0.9;
}

/* 服务器状态网格 */
.server-stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .server-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .server-stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  padding: 2rem;
  border-radius: var(--radius-2xl);
  transition: all var(--transition-base) ease;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  margin-bottom: 1.5rem;
}

.stat-icon {
  color: var(--primary-color);
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.stat-label {
  font-size: 0.9375rem;
  color: var(--text-tertiary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  color: var(--text-primary);
}

@media (min-width: 768px) {
  .stat-value {
    font-size: 2.25rem;
  }
}

.online-count {
  color: #10b981;
  font-size: 2.5rem;
  font-weight: 700;
}

.separator {
  color: var(--text-tertiary);
  font-weight: 400;
}

.max-count {
  color: var(--text-tertiary);
  font-size: 1.375rem;
  font-weight: 600;
}

/* 进度条 */
.stat-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.stat-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #6366f1);
  border-radius: 3px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

/* TPS 指示器 */
.tps-indicator {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.tps-bar {
  height: 100%;
  border-radius: 3px;
  transition: all var(--transition-base) ease;
}

.tps-bar.text-emerald {
  background: #10b981;
  box-shadow: 0 0 16px rgba(16, 185, 129, 0.5);
}

.tps-bar.text-amber {
  background: #f59e0b;
  box-shadow: 0 0 16px rgba(245, 158, 11, 0.5);
}

.tps-bar.text-rose {
  background: #f43f5e;
  box-shadow: 0 0 16px rgba(244, 63, 94, 0.5);
}

/* 心跳动画 */
.heartbeat-animation {
  position: relative;
  height: 24px;
  margin-top: 0.5rem;
}

.heartbeat-pulse {
  position: absolute;
  width: 16px;
  height: 16px;
  background: #ef4444;
  border-radius: 50%;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  opacity: 0;
}

.heartbeat-animation.active .heartbeat-pulse {
  background: #10b981;
  animation: heartbeat 1.5s ease-in-out infinite;
}

@keyframes heartbeat {
  0%, 100% {
    opacity: 1;
    transform: translateY(-50%) scale(1);
  }
  50% {
    opacity: 0.5;
    transform: translateY(-50%) scale(1.2);
  }
}

/* 状态文字 */
.status-online-text {
  color: #10b981;
  font-weight: 700;
}

.status-offline-text {
  color: #f43f5e;
  font-weight: 700;
}

/* 时间值 */
.time-value {
  font-size: 1.125rem;
  font-weight: 600;
}

/* 自动刷新提示 */
.auto-refresh {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.375rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.refresh-icon {
  opacity: 0.6;
}

.refresh-text {
  font-weight: 400;
}

/* 颜色类 */
.text-tertiary { color: var(--text-tertiary); }
.text-emerald { color: #10b981; }
.text-amber { color: #f59e0b; }
.text-rose { color: #f43f5e; }
</style>

<script lang="ts" setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PlayerService } from '@M/players/services/PlayerService.ts'
import type { PlayerSearchResult } from '@M/players/dtos/PlayerSearch.ts'
import { renderAvatar } from '@SU/renderUTil.ts'
import { addImagePrefixToBase64 } from '@SU/Base64Util.ts'
import { translate } from '@S/services/i18n'

const router = useRouter()
const playerService = new PlayerService()

// 搜索状态
const searchQuery = ref('')
const searchResults = ref<PlayerSearchResult[]>([])
const isSearching = ref(false)
const hasSearched = ref(false)
const errorMsg = ref('')

// 头像相关
const avatarMap = reactive<Record<string, string>>({})
const loadingAvatars = ref<Set<string>>(new Set())

// 占位图
const placeholderImage =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNlNWU1ZTUiLz48Y2lyY2xlIGN4PSIzMiIgY3k9IjIzIiByPSI4IiBmaWxsPSIjOTk5Ii8+PGNpcmNsZSBjeD0iMzIiIGN5PSI0NSIgcj0iMTIiIGZpbGw9IiM5OTkiLz48L3N2Zz4='

// 防抖定时器
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// 是否显示结果
const showResults = computed(() => searchQuery.value.trim().length > 0 && searchResults.value.length > 0)
const showEmpty = computed(() => hasSearched.value && searchResults.value.length === 0 && searchQuery.value.trim().length > 0 && !isSearching.value)

// 转义正则特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 高亮匹配文本
function highlightMatch(text: string, query: string): string {
  if (!query) return text
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi')
  return text.replace(regex, '<mark class="bf-highlight">$1</mark>')
}

// 格式化 UUID 显示（完整 UUID）
function formatUuid(uuid: string): string {
  if (!uuid) return ''
  return uuid.toLowerCase()
}

// 加载头像
async function loadAvatar(player: PlayerSearchResult): Promise<void> {
  const playerId = player.id

  if (loadingAvatars.value.has(playerId) || avatarMap[playerId]) {
    return
  }

  loadingAvatars.value.add(playerId)

  try {
    avatarMap[playerId] = placeholderImage
    const skinResult = await playerService.getPlayerSkin(playerId)
    if (skinResult.isSuccess) {
      avatarMap[playerId] = await renderAvatar(
        addImagePrefixToBase64(skinResult.getValue().skin),
        64,
      )
    }
  } catch (error) {
    console.error(`Failed to load avatar for ${player.name}:`, error)
    avatarMap[playerId] = placeholderImage
  } finally {
    loadingAvatars.value.delete(playerId)
  }
}

// 获取头像URL
function getAvatarUrl(player: PlayerSearchResult): string {
  return avatarMap[player.id] || placeholderImage
}

// 检查头像是否正在加载
function isAvatarLoading(playerId: string): boolean {
  return loadingAvatars.value.has(playerId)
}

// 执行搜索
async function performSearch() {
  const query = searchQuery.value.trim()
  if (!query) {
    searchResults.value = []
    hasSearched.value = false
    return
  }

  isSearching.value = true
  errorMsg.value = ''

  try {
    const result = await playerService.searchPlayers(query, 10)
    if (result.isSuccess) {
      searchResults.value = result.getValue().players
      searchResults.value.forEach(player => loadAvatar(player))
    } else {
      searchResults.value = []
      errorMsg.value = result.error as string || '搜索失败'
    }
  } catch (e) {
    searchResults.value = []
    errorMsg.value = e instanceof Error ? e.message : '搜索失败'
  } finally {
    isSearching.value = false
    hasSearched.value = true
  }
}

// 监听输入变化，防抖搜索
watch(searchQuery, (newValue) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  if (!newValue.trim()) {
    searchResults.value = []
    hasSearched.value = false
    return
  }

  debounceTimer = setTimeout(() => {
    performSearch()
  }, 300)
})

// 跳转到玩家详情
function goToPlayer(player: PlayerSearchResult) {
  router.push(`/players/${player.name}`)
}

// 格式化最后登录时间
function formatLastLogin(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 清除搜索
function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  hasSearched.value = false
  errorMsg.value = ''
}
</script>

<template>
  <div class="bf-player-search">
    <!-- 搜索框 -->
    <div class="bf-search-box">
      <div class="bf-search-input-wrapper">
        <svg class="bf-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          class="bf-search-input"
          placeholder="搜索玩家名称或 UUID..."
        />
        <button
          v-if="searchQuery"
          class="bf-clear-btn"
          @click="clearSearch"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <div v-if="isSearching" class="bf-search-loading">
          <div class="bf-spinner"></div>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="showResults" class="bf-search-results">
      <div class="bf-results-header">
        <span class="bf-results-count">找到 {{ searchResults.length }} 位玩家</span>
      </div>
      <div class="bf-results-list">
        <div
          v-for="player in searchResults"
          :key="player.id"
          class="bf-result-item"
          @click="goToPlayer(player)"
        >
          <div class="bf-avatar-wrapper">
            <img
              :src="getAvatarUrl(player)"
              :alt="`${player.name}'s avatar`"
              class="bf-player-avatar"
              :class="{ 'bf-avatar--loading': isAvatarLoading(player.id) }"
              decoding="async"
              loading="lazy"
            />
            <div v-if="isAvatarLoading(player.id)" class="bf-loading-indicator">
              <div class="bf-mini-spinner"></div>
            </div>
          </div>
          <div class="bf-player-info">
            <div class="bf-player-name-row">
              <span class="bf-player-name" v-html="highlightMatch(player.name, searchQuery.trim())"></span>
            </div>
            <span class="bf-player-meta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {{ formatLastLogin(player.lastLogin) }}
            </span>
          </div>
          <div class="bf-player-right">
            <span class="bf-player-uuid" v-html="highlightMatch(formatUuid(player.id), searchQuery.trim().toLowerCase())"></span>
          </div>
          <svg class="bf-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="showEmpty" class="bf-search-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
        <path d="M8 8l6 6M14 8l-6 6"/>
      </svg>
      <p>未找到匹配 "{{ searchQuery }}" 的玩家</p>
    </div>

    <!-- 错误状态 -->
    <div v-if="errorMsg" class="bf-search-error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ errorMsg }}</p>
    </div>
  </div>
</template>

<style scoped>
.bf-player-search {
  width: 100%;
}

/* 搜索框 */
.bf-search-box {
  margin-bottom: var(--bf-space-md, 16px);
}

.bf-search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.bf-search-icon {
  position: absolute;
  left: var(--bf-space-md, 16px);
  width: 20px;
  height: 20px;
  color: var(--bf-text-muted, #666666);
  pointer-events: none;
}

.bf-search-input {
  width: 100%;
  padding: var(--bf-space-md, 16px) var(--bf-space-xl, 48px);
  padding-left: calc(var(--bf-space-md, 16px) + 28px);
  background: var(--bf-input-bg, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--bf-border-default, rgba(255, 255, 255, 0.1));
  border-radius: var(--bf-input-radius, 12px);
  color: var(--bf-text-primary, #ffffff);
  font-size: 1rem;
  transition: all var(--bf-transition-fast, 0.15s ease);
}

.bf-search-input::placeholder {
  color: var(--bf-text-muted, #666666);
}

.bf-search-input:focus {
  outline: none;
  border-color: var(--bf-primary, #ff6b35);
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.15);
}

.bf-clear-btn {
  position: absolute;
  right: var(--bf-space-md, 16px);
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--bf-text-muted, #666666);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--bf-transition-fast);
}

.bf-clear-btn:hover {
  color: var(--bf-text-primary, #ffffff);
}

.bf-clear-btn svg {
  width: 16px;
  height: 16px;
}

.bf-search-loading {
  position: absolute;
  right: var(--bf-space-md, 16px);
}

.bf-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--bf-border-default, rgba(255, 255, 255, 0.1));
  border-top-color: var(--bf-primary, #ff6b35);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 搜索结果 */
.bf-search-results {
  background: var(--bf-surface, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--bf-border-default, rgba(255, 255, 255, 0.06));
  border-radius: var(--bf-radius-md, 12px);
  overflow: hidden;
}

.bf-results-header {
  padding: var(--bf-space-sm, 12px) var(--bf-space-md, 16px);
  background: var(--bf-surface-hover, rgba(255, 255, 255, 0.02));
  border-bottom: 1px solid var(--bf-border-default, rgba(255, 255, 255, 0.06));
}

.bf-results-count {
  font-size: 0.8125rem;
  color: var(--bf-text-muted, #666666);
}

.bf-results-list {
  max-height: 320px;
  overflow-y: auto;
}

.bf-result-item {
  display: flex;
  align-items: center;
  gap: var(--bf-space-md, 16px);
  padding: var(--bf-space-md, 16px);
  cursor: pointer;
  transition: background var(--bf-transition-fast);
}

.bf-result-item:hover {
  background: var(--bf-surface-hover, rgba(255, 255, 255, 0.04));
}

.bf-result-item:not(:last-child) {
  border-bottom: 1px solid var(--bf-border-subtle, rgba(255, 255, 255, 0.04));
}

/* 头像 */
.bf-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.bf-player-avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  background-color: var(--bf-bg-tertiary, rgba(255, 255, 255, 0.1));
  transition: opacity 0.3s ease;
}

.bf-avatar--loading {
  opacity: 0.5;
}

.bf-loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.bf-mini-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--bf-border-default, rgba(255, 255, 255, 0.1));
  border-top-color: var(--bf-primary, #ff6b35);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 玩家信息 */
.bf-player-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bf-player-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bf-player-name {
  font-weight: 600;
  color: var(--bf-text-primary, #ffffff);
  font-size: 0.9375rem;
}

/* 高亮匹配文本 */
:deep(.bf-highlight) {
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.3) 0%, rgba(255, 159, 28, 0.3) 100%);
  color: var(--bf-primary, #ff6b35);
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 700;
}

.bf-player-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--bf-text-muted, #666666);
}

/* 右侧信息 */
.bf-player-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.bf-player-uuid {
  font-size: 0.6875rem;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  color: var(--bf-text-muted, #666666);
  background: var(--bf-surface, rgba(255, 255, 255, 0.03));
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.bf-arrow-icon {
  width: 16px;
  height: 16px;
  color: var(--bf-text-muted, #666666);
  flex-shrink: 0;
  opacity: 0;
  transform: translateX(-4px);
  transition: all var(--bf-transition-fast);
}

.bf-result-item:hover .bf-arrow-icon {
  opacity: 1;
  transform: translateX(0);
  color: var(--bf-primary, #ff6b35);
}

/* 空状态 */
.bf-search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--bf-space-sm, 8px);
  padding: var(--bf-space-xl, 32px);
  color: var(--bf-text-muted, #666666);
}

.bf-search-empty svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.bf-search-empty p {
  margin: 0;
  font-size: 0.875rem;
}

/* 错误状态 */
.bf-search-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--bf-space-sm, 8px);
  padding: var(--bf-space-xl, 32px);
  color: #ef4444;
}

.bf-search-error svg {
  width: 32px;
  height: 32px;
}

.bf-search-error p {
  margin: 0;
  font-size: 0.875rem;
}

/* 响应式 */
@media (max-width: 640px) {
  .bf-search-input {
    padding: var(--bf-space-sm, 12px) var(--bf-space-md, 16px);
    padding-left: calc(var(--bf-space-sm, 12px) + 28px);
    font-size: 0.9375rem;
  }

  .bf-result-item {
    padding: var(--bf-space-sm, 12px) var(--bf-space-md, 16px);
  }

  .bf-player-avatar {
    width: 36px;
    height: 36px;
  }

  .bf-player-right {
    display: none;
  }
}
</style>

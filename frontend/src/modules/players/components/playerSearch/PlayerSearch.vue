<script lang="ts" setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PlayerService } from '@M/players/services/PlayerService.ts'
import type { PlayerSearchResult } from '@M/players/dtos/PlayerSearch.ts'
import { renderAvatar } from '@SU/renderUTil.ts'
import { addImagePrefixToBase64 } from '@SU/Base64Util.ts'
import { translate } from '@S/services/i18n'
import AppCard from '@S/components/ui/AppCard.vue'

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
  return text.replace(regex, '<mark class="ui-highlight">$1</mark>')
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
  <div class="ui-player-search">
    <!-- 搜索框 -->
    <div class="ui-search-box">
      <div class="ui-search-input-wrapper">
        <svg class="ui-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          class="ui-search-input"
          placeholder="搜索玩家名称或 UUID..."
        />
        <button
          v-if="searchQuery"
          class="ui-clear-btn"
          @click="clearSearch"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <div v-if="isSearching" class="ui-search-loading">
          <div class="ui-spinner"></div>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <AppCard v-if="showResults" class="ui-search-results" variant="quiet" size="sm">
      <div class="ui-results-header">
        <span class="ui-results-count">找到 {{ searchResults.length }} 位玩家</span>
      </div>
      <div class="ui-results-list">
        <div
          v-for="player in searchResults"
          :key="player.id"
          class="ui-result-item"
          @click="goToPlayer(player)"
        >
          <div class="ui-avatar-wrapper">
            <img
              :src="getAvatarUrl(player)"
              :alt="`${player.name}'s avatar`"
              class="ui-player-avatar"
              :class="{ 'ui-avatar--loading': isAvatarLoading(player.id) }"
              decoding="async"
              loading="lazy"
            />
            <div v-if="isAvatarLoading(player.id)" class="ui-loading-indicator">
              <div class="ui-mini-spinner"></div>
            </div>
          </div>
          <div class="ui-player-info">
            <div class="ui-player-name-row">
              <span class="ui-player-name" v-html="highlightMatch(player.name, searchQuery.trim())"></span>
            </div>
            <span class="ui-player-meta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {{ formatLastLogin(player.lastLogin) }}
            </span>
          </div>
          <div class="ui-player-right">
            <span class="ui-player-uuid" v-html="highlightMatch(formatUuid(player.id), searchQuery.trim().toLowerCase())"></span>
          </div>
          <svg class="ui-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>
    </AppCard>

    <!-- 空状态 -->
    <div v-if="showEmpty" class="ui-search-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
        <path d="M8 8l6 6M14 8l-6 6"/>
      </svg>
      <p>未找到匹配 "{{ searchQuery }}" 的玩家</p>
    </div>

    <!-- 错误状态 -->
    <div v-if="errorMsg" class="ui-search-error">
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
.ui-player-search {
  width: 100%;
}

/* 搜索框 */
.ui-search-box {
  margin-bottom: var(--ui-space-md);
}

.ui-search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.ui-search-icon {
  position: absolute;
  left: var(--ui-space-md);
  width: 20px;
  height: 20px;
  color: var(--ui-text-muted);
  pointer-events: none;
}

.ui-search-input {
  width: 100%;
  padding: var(--ui-space-md) var(--ui-space-xl);
  padding-left: calc(var(--ui-space-md) + 28px);
  background: var(--ui-input-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-input-radius);
  color: var(--ui-text);
  font-size: 1rem;
  transition: var(--ui-transition-fast);
}

.ui-search-input::placeholder {
  color: var(--ui-text-muted);
}

.ui-search-input:focus {
  outline: none;
  border-color: var(--ui-accent);
  box-shadow: 0 0 0 3px var(--ui-accent-glow);
}

.ui-clear-btn {
  position: absolute;
  right: var(--ui-space-md);
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--ui-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--ui-transition-fast);
}

.ui-clear-btn:hover {
  color: var(--ui-text);
}

.ui-clear-btn svg {
  width: 16px;
  height: 16px;
}

.ui-search-loading {
  position: absolute;
  right: var(--ui-space-md);
}

.ui-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--ui-border);
  border-top-color: var(--ui-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 搜索结果（表面交给 AppCard 的 quiet 变体） */
.ui-search-results {
  overflow: hidden;
}

.ui-results-header {
  padding: var(--ui-space-sm) var(--ui-space-md);
  background: var(--ui-surface-hover);
  border-bottom: 1px solid var(--ui-border);
}

.ui-results-count {
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}

.ui-results-list {
  max-height: 320px;
  overflow-y: auto;
}

.ui-result-item {
  display: flex;
  align-items: center;
  gap: var(--ui-space-md);
  padding: var(--ui-space-md);
  cursor: pointer;
  transition: background var(--ui-transition-fast);
}

.ui-result-item:hover {
  background: var(--ui-surface-hover);
}

.ui-result-item:not(:last-child) {
  border-bottom: 1px solid var(--ui-border-subtle);
}

/* 头像 */
.ui-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.ui-player-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--ui-radius-sm);
  object-fit: cover;
  background-color: var(--ui-surface-sunken);
  transition: opacity var(--ui-transition-normal);
}

.ui-avatar--loading {
  opacity: 0.5;
}

.ui-loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.ui-mini-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--ui-border);
  border-top-color: var(--ui-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 玩家信息 */
.ui-player-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-1);
}

.ui-player-name-row {
  display: flex;
  align-items: center;
  gap: var(--ui-space-2);
}

.ui-player-name {
  font-weight: 600;
  color: var(--ui-text);
  font-size: 0.9375rem;
}

/* 高亮匹配文本 */
:deep(.ui-highlight) {
  background: var(--ui-accent-glow);
  color: var(--ui-text-accent);
  padding: 1px 4px;
  border-radius: var(--ui-radius-sm);
  font-weight: 700;
}

.ui-player-meta {
  display: flex;
  align-items: center;
  gap: var(--ui-space-1);
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

/* 右侧信息 */
.ui-player-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--ui-space-1);
  flex-shrink: 0;
}

.ui-player-uuid {
  font-size: 0.6875rem;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  color: var(--ui-text-muted);
  background: var(--ui-surface-glass);
  padding: 2px 6px;
  border-radius: var(--ui-radius-sm);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.ui-arrow-icon {
  width: 16px;
  height: 16px;
  color: var(--ui-text-muted);
  flex-shrink: 0;
  opacity: 0;
  transform: translateX(-4px);
  transition: all var(--ui-transition-fast);
}

.ui-result-item:hover .ui-arrow-icon {
  opacity: 1;
  transform: translateX(0);
  color: var(--ui-text-accent);
}

/* 空状态 */
.ui-search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ui-space-sm);
  padding: var(--ui-space-xl);
  color: var(--ui-text-muted);
}

.ui-search-empty svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.ui-search-empty p {
  margin: 0;
  font-size: 0.875rem;
}

/* 错误状态 */
.ui-search-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ui-space-sm);
  padding: var(--ui-space-xl);
  color: var(--ui-danger);
}

.ui-search-error svg {
  width: 32px;
  height: 32px;
}

.ui-search-error p {
  margin: 0;
  font-size: 0.875rem;
}

/* 响应式 */
@media (max-width: 640px) {
  .ui-search-input {
    padding: var(--ui-space-sm) var(--ui-space-md);
    padding-left: calc(var(--ui-space-sm) + 28px);
    font-size: 0.9375rem;
  }

  .ui-result-item {
    padding: var(--ui-space-sm) var(--ui-space-md);
  }

  .ui-player-avatar {
    width: 36px;
    height: 36px;
  }

  .ui-player-right {
    display: none;
  }
}
</style>

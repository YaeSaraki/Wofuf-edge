<script lang="ts" setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { PlayerService } from '@M/players/services/PlayerService.ts'
import { useAsyncLoader } from '@SU/async/useAsyncLoader.ts'
import type { PlayerName, PlayerNameList } from '@M/players/dtos/PlayerName.ts'
import { translate } from '@S/services/i18n'
import router from '@S/infra/router'
import { renderAvatar } from '@SU/renderUTil.ts'
import { addImagePrefixToBase64 } from '@SU/Base64Util.ts'

/* ---------------- 复用通用加载逻辑 ---------------- */
const { isLoading, errorMsg, executeAsync } = useAsyncLoader()

/* ---------------- 业务状态 ---------------- */
const playerService = new PlayerService()
const playerNameList = ref<PlayerNameList | null>(null)
const avatarMap = reactive<Record<string, string>>({})
const loadingAvatars = ref<Set<string>>(new Set())

// 占位图
const placeholderImage =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNlNWU1ZTUiLz48Y2lyY2xlIGN4PSIzMiIgY3k9IjIzIiByPSI4IiBmaWxsPSIjOTk5Ii8+PGNpcmNsZSBjeD0iMzIiIGN5PSI0NSIgcj0iMTIiIGZpbGw9IiM5OTkiLz48L3N2Zz4='

/**
 * 获取头像
 */
const loadAvatar = async (playerName: string): Promise<void> => {
  // 如果已经在加载或已加载完成，跳过
  if (playerName == null || playerName === '') {
    return
  }

  if (loadingAvatars.value.has(playerName) || avatarMap[playerName]) {
    return
  }

  // 标记为正在加载
  loadingAvatars.value.add(playerName)

  try {
    // 先设置占位图，避免空白
    avatarMap[playerName] = placeholderImage

    const player = await playerService.getPlayerProfile(playerName)
    if (player) {
      const skin = await playerService.getPlayerSkin(player.getValue().id)
      if (skin) {
        avatarMap[playerName] = await renderAvatar(
          addImagePrefixToBase64(skin.getValue().skin),
          128,
        )
      }
    }
  } catch (error) {
    console.error(`Failed to load avatar for ${playerName}:`, error)
    // 保持占位图
    avatarMap[playerName] = placeholderImage
  } finally {
    // 移除加载标记
    loadingAvatars.value.delete(playerName)
  }
}

// 批量加载所有玩家头像
const loadAllAvatars = async (): Promise<void> => {
  if (!playerNameList.value?.playerNames) return

  // 使用 Promise.allSettled 并行加载，避免阻塞
  const promises = playerNameList.value.playerNames.map((playerName) => loadAvatar(playerName))

  await Promise.allSettled(promises)
}

// 当玩家列表更新时加载头像
watch(
  playerNameList,
  () => {
    if (playerNameList.value) {
      loadAllAvatars()
    }
  },
  { immediate: true },
)

/* ---------------- 业务行为 ---------------- */
async function loadYesterdayOnlinePlayers() {
  // 清空之前的头像
  Object.keys(avatarMap).forEach((key) => {
    delete avatarMap[key]
  })

  const result = await executeAsync(
    async (signal) => {
      const result = await playerService.getPlayerYesterdayOnline({ signal })
      if (result.isSuccess) {
        return result.getValue()
      }
      return null
    },
    translate('players', 'error.loading-yesterday-online'),
  )

  if (result) {
    playerNameList.value = result
  }
}

function goToPlayerProfile(playerName: PlayerName): void {
  router.push(`/players/${encodeURIComponent(playerName)}`)
}

// 获取头像URL（同步函数供模板使用）
const getAvatarUrl = (playerName: string): string => {
  return avatarMap[playerName] || placeholderImage
}

// 检查是否正在加载
const isAvatarLoading = (playerName: string): boolean => {
  return loadingAvatars.value.has(playerName)
}

// 组件生命周期
onMounted(() => {
  loadYesterdayOnlinePlayers()
})
</script>

<template>
  <section class="bf-yesterday-online">
    <h2 class="bf-title">{{ translate('players', 'yesterday_online_players') }}</h2>

    <div v-if="isLoading" class="bf-hint">
      {{ translate('players', 'loading-yesterday-online') }}
    </div>

    <div v-else-if="errorMsg" class="bf-hint bf-hint--error">
      <p>{{ errorMsg }}</p>
      <button class="bf-btn bf-btn--primary" @click="loadYesterdayOnlinePlayers">
        {{ translate('app', 'actions.retry') }}
      </button>
    </div>
    <div v-else-if="playerNameList?.playerNames.length === 1"></div>
    <div v-else class="bf-card-list">
      <div
        v-for="item in playerNameList?.playerNames"
        :key="item"
        class="bf-player-card"
        @click="goToPlayerProfile(item)"
      >
        <div class="bf-avatar-wrapper">
          <img
            :alt="`${item}'s avatar`"
            :class="{ 'bf-avatar--loading': isAvatarLoading(item) }"
            :src="getAvatarUrl(item)"
            class="bf-avatar"
            decoding="async"
            loading="lazy"
          />
          <div v-if="isAvatarLoading(item)" class="bf-loading-indicator">
            <div class="bf-loading-spinner"></div>
          </div>
        </div>
        <div class="bf-name">{{ item }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.bf-yesterday-online {
  padding: var(--bf-space-lg, 24px);
}

.bf-title {
  font-size: 18px;
  margin-bottom: var(--bf-space-md, 16px);
  font-weight: 600;
  color: var(--bf-text-primary);
  text-align: center;
}

.bf-hint {
  color: var(--bf-text-muted);
  font-size: 14px;
  padding: 20px;
  text-align: center;
}

.bf-hint--error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--bf-space-md, 16px);
}

.bf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--bf-space-sm, 8px) var(--bf-space-md, 16px);
  border-radius: var(--bf-btn-radius, 12px);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all var(--bf-transition-fast, 0.15s ease);
}

.bf-btn--primary {
  background: var(--bf-btn-primary-bg);
  color: white;
}

.bf-btn--primary:hover {
  background: var(--bf-btn-primary-hover);
  box-shadow: 0 4px 16px var(--bf-primary-glow);
}

.bf-card-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin: 0 var(--bf-space-md, 16px);
}

.bf-player-card {
  background: var(--bf-card-bg);
  border: 1px solid var(--bf-card-border);
  border-radius: var(--bf-card-radius-sm, 12px);
  padding: var(--bf-space-md, 16px) 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all var(--bf-transition-fast, 0.15s ease);
  position: relative;
  width: 100px;
  cursor: pointer;
  box-shadow: var(--bf-card-shadow);
}

.bf-player-card:hover {
  transform: translateY(-2px);
  border-color: var(--bf-border-accent);
  box-shadow: var(--bf-card-shadow-hover);
}

.bf-avatar-wrapper {
  position: relative;
  margin-bottom: var(--bf-space-sm, 8px);
}

.bf-avatar {
  border-radius: 10px;
  width: 64px;
  height: 64px;
  object-fit: cover;
  background-color: var(--bf-bg-tertiary);
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

.bf-loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--bf-border-default);
  border-top-color: var(--bf-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.bf-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--bf-text-primary);
  text-align: center;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .bf-card-list {
    gap: 12px;
  }

  .bf-player-card {
    width: 88px;
    padding: 12px 8px;
  }

  .bf-avatar {
    width: 56px;
    height: 56px;
  }
}
</style>

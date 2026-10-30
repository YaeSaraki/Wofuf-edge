<script lang="ts" setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { PlayerService } from '@M/players/services/PlayerService.ts'
import { useAsyncLoader } from '@SU/async/useAsyncLoader.ts'
import type { PlayerName, PlayerNameList } from '@M/players/dtos/PlayerName.ts'
import { translate } from '@S/services/i18n'
import router from '@S/infra/router'
import { renderAvatar } from '@SU/renderUTil.ts'
import { addImagePrefixToBase64 } from '@SU/Base64Util.ts'
import AppCard from '@S/components/ui/AppCard.vue'

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
  <section class="ui-yesterday-online">
    <!-- 标题由外层 section 提供（status.section.yesterdayOnline），
         这里再写一遍就会和主页那个标题重复，所以不再重复输出。 -->

    <div v-if="isLoading" class="ui-hint">
      {{ translate('players', 'loading-yesterday-online') }}
    </div>

    <div v-else-if="errorMsg" class="ui-hint ui-hint--error">
      <p>{{ errorMsg }}</p>
      <button class="ui-btn ui-btn--primary" @click="loadYesterdayOnlinePlayers">
        {{ translate('app', 'actions.retry') }}
      </button>
    </div>
    <!-- 只有一个人时也要显示：之前这里写的是 `length === 1` 渲染空 div，
         结果「昨日在线恰好只有一个人」时整张列表被吞掉。 -->
    <div v-else-if="!playerNameList?.playerNames?.length" class="ui-hint">
      {{ translate('players', 'yesterday-online-empty') }}
    </div>
    <div v-else class="ui-card-list">
      <AppCard
        v-for="item in playerNameList?.playerNames"
        :key="item"
        class="ui-player-card"
        variant="default"
        size="sm"
        interactive
        @click="goToPlayerProfile(item)"
      >
        <div class="ui-avatar-wrapper">
          <img
            :alt="`${item}'s avatar`"
            :class="{ 'ui-avatar--loading': isAvatarLoading(item) }"
            :src="getAvatarUrl(item)"
            class="ui-avatar"
            decoding="async"
            loading="lazy"
          />
          <div v-if="isAvatarLoading(item)" class="ui-loading-indicator">
            <div class="ui-loading-spinner"></div>
          </div>
        </div>
        <div class="ui-name">{{ item }}</div>
      </AppCard>
    </div>
  </section>
</template>

<style scoped>
.ui-yesterday-online {
  padding: var(--ui-space-lg, 24px);
}

.ui-hint {
  color: var(--ui-text-muted);
  font-size: 14px;
  padding: 20px;
  text-align: center;
}

.ui-hint--error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ui-space-md, 16px);
}

.ui-card-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin: 0 var(--ui-space-md, 16px);
}

/* 玩家小卡（表面交给 AppCard，这里只管排版） */
.ui-player-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100px;
}

.ui-avatar-wrapper {
  position: relative;
  margin-bottom: var(--ui-space-sm, 8px);
}

.ui-avatar {
  border-radius: var(--ui-radius-md);
  width: 64px;
  height: 64px;
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

.ui-loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--ui-border);
  border-top-color: var(--ui-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.ui-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--ui-text);
  text-align: center;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .ui-card-list {
    gap: 12px;
  }

  .ui-player-card {
    width: 88px;
  }

  .ui-avatar {
    width: 56px;
    height: 56px;
  }
}
</style>
